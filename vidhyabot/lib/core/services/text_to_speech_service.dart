import 'package:flutter/services.dart';
import 'package:flutter_tts/flutter_tts.dart';

class TextToSpeechService {
  TextToSpeechService() : _tts = FlutterTts();

  final FlutterTts _tts;
  bool _isAvailable = true;
  bool _isSpeaking = false;

  bool get isAvailable => _isAvailable;
  bool get isSpeaking => _isSpeaking;

  /// Called whenever speaking starts or stops.
  void Function(bool speaking)? onSpeakingChanged;

  Future<bool> initialize() async {
    try {
      await _tts.awaitSpeakCompletion(true);
    } on MissingPluginException {
      // Some platforms/plugin versions don't expose this channel method.
    }

    try {
      await _tts.setVolume(1.0);
      _isAvailable = true;

      // Track speaking state via completion callbacks
      _tts.setStartHandler(() {
        _isSpeaking = true;
        onSpeakingChanged?.call(true);
      });
      _tts.setCompletionHandler(() {
        _isSpeaking = false;
        onSpeakingChanged?.call(false);
      });
      _tts.setCancelHandler(() {
        _isSpeaking = false;
        onSpeakingChanged?.call(false);
      });
      _tts.setErrorHandler((_) {
        _isSpeaking = false;
        onSpeakingChanged?.call(false);
      });

      return true;
    } on MissingPluginException {
      _isAvailable = false;
      return false;
    }
  }

  Future<List<Map<String, dynamic>>> getAvailableVoices() async {
    if (!_isAvailable) {
      return [];
    }

    final dynamic voices = await _tts.getVoices;
    if (voices is! List) {
      return [];
    }

    return voices
        .whereType<Map>()
        .map((voice) => voice.map((k, v) => MapEntry('$k', v)))
        .toList();
  }

  Future<void> setLanguage(String languageCode) async {
    if (!_isAvailable) {
      throw Exception(
        'Text-to-Speech is unavailable on this platform/runtime.',
      );
    }

    final result = await _tts.setLanguage(languageCode);
    if (result == 0) {
      throw Exception('Language not supported on this device: $languageCode');
    }
  }

  Future<void> setPitch(double pitch) {
    if (!_isAvailable) {
      throw Exception(
        'Text-to-Speech is unavailable on this platform/runtime.',
      );
    }
    return _tts.setPitch(pitch.clamp(0.5, 2.0));
  }

  Future<void> setSpeechRate(double speechRate) {
    if (!_isAvailable) {
      throw Exception(
        'Text-to-Speech is unavailable on this platform/runtime.',
      );
    }
    return _tts.setSpeechRate(speechRate.clamp(0.1, 1.0));
  }

  Future<void> speak(String text) async {
    if (!_isAvailable) {
      throw Exception(
        'Text-to-Speech is unavailable on this platform/runtime.',
      );
    }
    if (text.trim().isEmpty) throw Exception('Nothing to speak');
    await _tts.speak(text);
  }

  /// Speak [text] with automatic language detection.
  /// Detects Malayalam Unicode (U+0D00–U+0D7F) and sets
  /// lang to 'ml-IN', otherwise 'en-IN'.
  Future<void> speakAuto(String text) async {
    if (!_isAvailable || text.trim().isEmpty) return;

    final cleanText = _cleanTextForSpeech(text);
    if (cleanText.isEmpty) return;

    final isMalayalam = RegExp(r'[\u0D00-\u0D7F]').hasMatch(cleanText);
    try {
      await _tts.setLanguage(isMalayalam ? 'ml-IN' : 'en-IN');
    } catch (_) {}
    await _tts.speak(cleanText);
  }

  /// Removes emojis and markdown-like special characters
  /// that don't sound good when read by a screen reader.
  String _cleanTextForSpeech(String text) {
    // 1. Remove emojis (covers most common emoji blocks)
    var cleaned = text.replaceAll(
      RegExp(
        r'[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]',
        unicode: true,
      ),
      '',
    );
    // 2. Remove markdown asterisks, hashes, backticks, dashes at start of lines, etc.
    cleaned = cleaned.replaceAll(RegExp(r'[*#`~_]'), '');
    return cleaned.trim();
  }

  Future<void> stop() {
    if (!_isAvailable) {
      return Future.value();
    }
    return _tts.stop();
  }

  Future<void> dispose() async {
    await stop();
  }
}
