import 'package:flutter/services.dart';
import 'package:flutter_tts/flutter_tts.dart';

class TextToSpeechService {
  TextToSpeechService() : _tts = FlutterTts();

  final FlutterTts _tts;
  bool _isAvailable = true;

  bool get isAvailable => _isAvailable;

  Future<bool> initialize() async {
    try {
      await _tts.awaitSpeakCompletion(true);
    } on MissingPluginException {
      // Some platforms/plugin versions don't expose this channel method.
    }

    try {
      await _tts.setVolume(1.0);
      _isAvailable = true;
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
      throw Exception('Text-to-Speech is unavailable on this platform/runtime.');
    }

    final result = await _tts.setLanguage(languageCode);
    if (result == 0) {
      throw Exception('Language not supported on this device: $languageCode');
    }
  }

  Future<void> setPitch(double pitch) {
    if (!_isAvailable) {
      throw Exception('Text-to-Speech is unavailable on this platform/runtime.');
    }
    return _tts.setPitch(pitch.clamp(0.5, 2.0));
  }

  Future<void> setSpeechRate(double speechRate) {
    if (!_isAvailable) {
      throw Exception('Text-to-Speech is unavailable on this platform/runtime.');
    }
    return _tts.setSpeechRate(speechRate.clamp(0.1, 1.0));
  }

  Future<void> speak(String text) async {
    if (!_isAvailable) {
      throw Exception('Text-to-Speech is unavailable on this platform/runtime.');
    }

    if (text.trim().isEmpty) {
      throw Exception('Nothing to speak');
    }
    await _tts.speak(text);
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
