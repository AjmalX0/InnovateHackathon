import 'package:flutter/foundation.dart';
import 'package:google_generative_ai/google_generative_ai.dart';
import 'package:flutter_gemma/flutter_gemma.dart';
import 'translation_service.dart';

// ---------------------------------------------------------------------------
// IMPORTANT: Replace this with your own Gemini API key or move it to a
// secure location (e.g., --dart-define, environment variable, etc.).
// ---------------------------------------------------------------------------
const _geminiApiKey = 'AIzaSyC-S5fs7txB5vXzMCOFw_ZGTj2Jc2fuEH4';

const _qwenModelUrl =
    'https://huggingface.co/litert-community/Qwen2.5-0.5B-Instruct/resolve/main/'
    'Qwen2.5-0.5B-Instruct_multi-prefill-seq_q8_ekv1280.task';

/// Wraps both the online Gemini API and the on-device Qwen2.5 model.
///
/// Malayalam input is silently translated to English before being sent to
/// the AI, and the English response is silently translated back to Malayalam.
///
/// Usage:
/// ```dart
/// final svc = ChatService(contextHint: 'Chapter: Photosynthesis');
/// svc.init();
/// await for (final tok in svc.sendMessage('What is ATP?', isOnline: true)) {
///   // accumulate token
/// }
/// svc.dispose();
/// ```
class ChatService {
  /// Optional topic/context injected as the first system turn for Gemini.
  final String? contextHint;

  ChatService({this.contextHint});

  // --- Online (Gemini) ---
  late final GenerativeModel _geminiModel;
  late final ChatSession _geminiChat;

  // --- Offline (local Gemma / Qwen) ---
  dynamic _gemmaModel;
  dynamic _gemmaChat;

  bool _isLocalModelLoaded = false;
  bool _isDownloading = false;
  double _downloadProgress = 0.0;
  String _downloadStatus = '';

  bool get isLocalModelLoaded => _isLocalModelLoaded;
  bool get isDownloading => _isDownloading;
  double get downloadProgress => _downloadProgress;
  String get downloadStatus => _downloadStatus;

  // Callback so the UI can rebuild when download progress changes
  VoidCallback? onProgressChanged;

  /// Initialise both the online and offline AI.
  /// Call this once (e.g. in [State.initState]).
  void init() {
    // Online
    final systemInstruction = contextHint != null
        ? Content.system(
            'You are an expert AI tutor. Context: $contextHint. '
            'Give clear, concise educational answers.',
          )
        : Content.system(
            'You are a helpful AI assistant for students. '
            'Give clear, concise answers.',
          );

    _geminiModel = GenerativeModel(
      model: 'gemini-2.5-flash',
      apiKey: _geminiApiKey,
      systemInstruction: systemInstruction,
      safetySettings: [
        SafetySetting(HarmCategory.harassment, HarmBlockThreshold.low),
        SafetySetting(HarmCategory.hateSpeech, HarmBlockThreshold.low),
        SafetySetting(HarmCategory.sexuallyExplicit, HarmBlockThreshold.low),
        SafetySetting(HarmCategory.dangerousContent, HarmBlockThreshold.low),
      ],
    );
    _geminiChat = _geminiModel.startChat();

    // Offline – download in background
    _initLocalModel();
  }

  Future<void> _initLocalModel() async {
    try {
      _isDownloading = true;
      _downloadStatus = 'Preparing offline AI model…';
      onProgressChanged?.call();

      await FlutterGemma.initialize(maxDownloadRetries: 3);

      await FlutterGemma.installModel(
        modelType: ModelType.general,
      ).fromNetwork(_qwenModelUrl).withProgress((progress) {
        int pct = 0;
        try {
          pct = (progress as dynamic).percentage as int;
        } catch (_) {}
        _downloadProgress = pct / 100.0;
        _downloadStatus = 'Downloading offline model… $pct%';
        onProgressChanged?.call();
      }).install();

      _gemmaModel = await FlutterGemma.getActiveModel(maxTokens: 512);
      _gemmaChat = await _gemmaModel!.createChat();

      _isLocalModelLoaded = true;
      _isDownloading = false;
      _downloadStatus = '';
      onProgressChanged?.call();
    } catch (e) {
      _isDownloading = false;
      _downloadStatus = 'Offline model unavailable: will use online only.';
      onProgressChanged?.call();
    }
  }

  /// Send a message and receive a stream of response tokens.
  ///
  /// **Online**  – Malayalam input is translated to English via MyMemory API,
  ///               the English AI response is translated back to Malayalam,
  ///               then yielded as a single string.
  ///
  /// **Offline** – The 0.5B local model is too small to reliably translate;
  ///               instead we wrap the Malayalam text in an English instruction
  ///               prompt so the model understands the intent and replies in
  ///               English. The response is yielded token-by-token.
  Stream<String> sendMessage(String text, {required bool isOnline}) async* {
    final bool wasMalayalam = TranslationService.isMalayalam(text);

    // ─────────────────────────────────────────────────────────────────────────
    // ONLINE PATH
    // ─────────────────────────────────────────────────────────────────────────
    if (isOnline) {
      // 1. Translate Malayalam → English (no-op for English input)
      final String queryText = wasMalayalam
          ? await TranslationService.mlToEn(text)
          : text;

      // 2. Stream Gemini response
      final StringBuffer fullResponse = StringBuffer();
      try {
        final stream = _geminiChat.sendMessageStream(Content.text(queryText));
        await for (final chunk in stream) {
          if (chunk.text != null) fullResponse.write(chunk.text!);
        }
      } catch (e) {
        fullResponse.write('Gemini error: $e');
      }

      // 3. Translate English response → Malayalam if needed
      final String responseText = fullResponse.toString();
      if (wasMalayalam && responseText.isNotEmpty) {
        yield await TranslationService.enToMl(responseText);
      } else {
        yield responseText;
      }
      return;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // OFFLINE PATH
    // ─────────────────────────────────────────────────────────────────────────
    if (!_isLocalModelLoaded || _gemmaChat == null) {
      yield _isDownloading
          ? 'Offline: local AI is still downloading ($_downloadStatus). Please wait or reconnect.'
          : "Offline: local AI isn't ready. Please reconnect to use AI.";
      return;
    }

    // The local 0.5B model has no Malayalam vocabulary in its tokenizer —
    // sending Malayalam Unicode produces garbage tokens → confused responses.
    // We detect this early and give a clear, honest message instead.
    if (wasMalayalam) {
      yield 'മലയാളം ഓഫ്‌ലൈൻ മോഡിൽ പിന്തുണയ്ക്കുന്നില്ല. '
          'ദയവായി ഇംഗ്ലീഷിൽ ടൈപ്പ് ചെയ്യുക അല്ലെങ്കിൽ ഇൻ്റർനെറ്റ് ബന്ധിപ്പിക്കുക.\n\n'
          '(Offline mode does not support Malayalam. '
          'Please type in English or connect to the internet.)';
      return;
    }

    try {
      await _gemmaChat!.addQueryChunk(Message.text(text: text, isUser: true));
      await for (final response in _gemmaChat!.generateChatResponseAsync()) {
        if (response is TextResponse) yield response.token;
      }
    } catch (e) {
      yield 'Local AI error: $e';
    }
  }

  /// Simplifies a verbose Malayalam lesson into a grade-appropriate explanation.
  /// If [targetLanguage] is 'en', it translates the Malayalam input to English first,
  /// asks the AI to simplify in English, and yields the English response.
  /// If it is 'ml', it prompts the AI to simplify in English, and translates
  /// the English chunks back to Malayalam streamingly (or in bulk).
  Stream<String> simplifyLesson(
    String rawLessonMalayalam, {
    required String targetLanguage,
    required int grade,
    required bool isOnline,
  }) async* {
    if (!isOnline && (!_isLocalModelLoaded || _gemmaChat == null)) {
      yield 'Offline AI is not ready. Please connect to the internet or try again later.';
      return;
    }

    // 1. Convert the raw Malayalam prompt to English so the AI understands
    //    precisely what we want, since LLMs (especially local ones) reason
    //    better in English.
    final rawLessonEnglish = await TranslationService.mlToEn(
      rawLessonMalayalam,
    );

    // 2. Build the exact simplification prompt.
    final prompt =
        '''
      You are an expert tutor. Please simplify and explain the following lesson content 
      so that a Grade $grade student can easily understand it. Use simple, engaging words. 
      Do not output any markdown formatting, just plain text.
      
      Lesson Content:
      $rawLessonEnglish
    ''';

    // 3. Get the simplified English response from the AI.
    final StringBuffer engResponseBuffer = StringBuffer();

    if (isOnline) {
      try {
        final stream = _geminiChat.sendMessageStream(Content.text(prompt));
        await for (final chunk in stream) {
          if (chunk.text != null) engResponseBuffer.write(chunk.text!);
        }
      } catch (e) {
        engResponseBuffer.write('Gemini error while simplifying: $e');
      }
    } else {
      try {
        await _gemmaChat!.addQueryChunk(
          Message.text(text: prompt, isUser: true),
        );
        await for (final response in _gemmaChat!.generateChatResponseAsync()) {
          if (response is TextResponse) engResponseBuffer.write(response.token);
        }
      } catch (e) {
        engResponseBuffer.write('Local AI error while simplifying: $e');
      }
    }

    final String finalEnglish = engResponseBuffer.toString().trim();

    // 4. Translate back to Malayalam if that was the requested language,
    //    otherwise yield the English final result.
    if (targetLanguage == 'ml') {
      try {
        final mlTranslation = await TranslationService.enToMl(finalEnglish);
        // We yield it all at once because the Translation API doesn't stream.
        // For a more advanced architecture we could stream chunk-by-chunk translation.
        yield mlTranslation;
      } catch (e) {
        yield finalEnglish; // fallback to English if translation fails
      }
    } else {
      yield finalEnglish;
    }
  }

  void dispose() {
    try {
      _gemmaChat?.close();
    } catch (_) {}
    try {
      _gemmaModel?.close();
    } catch (_) {}
  }
}
