import 'package:flutter/foundation.dart';
import 'package:google_generative_ai/google_generative_ai.dart';
import 'package:flutter_gemma/flutter_gemma.dart';

// ---------------------------------------------------------------------------
// IMPORTANT: Replace this with your own Gemini API key or move it to a
// secure location (e.g., --dart-define, environment variable, etc.).
// ---------------------------------------------------------------------------
const _geminiApiKey = 'AIzaSyD1052iYbf48BIpOI7oRpqLQhx1bPKaKKY';

const _qwenModelUrl =
    'https://huggingface.co/litert-community/Qwen2.5-0.5B-Instruct/resolve/main/'
    'Qwen2.5-0.5B-Instruct_multi-prefill-seq_q8_ekv1280.task';

/// Wraps both the online Gemini API and the on-device Qwen2.5 model.
///
/// Usage:
/// ```dart
/// final svc = ChatService(contextHint: 'Chapter: Photosynthesis');
/// svc.init();                       // starts local-model download in bg
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
  /// [isOnline] – true  → Gemini cloud
  ///              false → local model (if loaded)
  Stream<String> sendMessage(String text, {required bool isOnline}) async* {
    if (isOnline) {
      // --- Online: Gemini streaming ---
      try {
        final stream = _geminiChat.sendMessageStream(Content.text(text));
        await for (final chunk in stream) {
          if (chunk.text != null) yield chunk.text!;
        }
      } catch (e) {
        yield 'Gemini error: $e';
      }
    } else {
      // --- Offline: local Gemma streaming ---
      if (!_isLocalModelLoaded || _gemmaChat == null) {
        yield _isDownloading
            ? "I'm offline and the local AI model is still downloading ($_downloadStatus). Please wait or reconnect."
            : "I'm offline and the local AI model isn't ready. Please reconnect to use AI.";
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
