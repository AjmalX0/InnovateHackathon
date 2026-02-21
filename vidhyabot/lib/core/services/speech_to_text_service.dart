import 'package:flutter/foundation.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:speech_to_text/speech_recognition_error.dart';
import 'package:speech_to_text/speech_recognition_result.dart';
import 'package:speech_to_text/speech_to_text.dart';

class SpeechToTextService {
  SpeechToTextService() : _speechToText = SpeechToText();

  final SpeechToText _speechToText;
  String _lastRecognizedText = '';

  void _log(String message) {
    if (kDebugMode) {
      debugPrint('[SpeechToTextService] $message');
    }
  }

  Future<bool> _ensureMicrophonePermission() async {
    final status = await Permission.microphone.status;
    _log('Microphone status: $status');

    if (status.isGranted) {
      return true;
    }

    final requestedStatus = await Permission.microphone.request();
    _log('Microphone requested status: $requestedStatus');
    return requestedStatus.isGranted;
  }

  String? _normalizeLocaleToAvailable(
    String? localeId,
    List<LocaleName> locales,
  ) {
    if (localeId == null || localeId.trim().isEmpty) {
      return null;
    }

    final requested = localeId.toLowerCase().replaceAll('-', '_');

    for (final locale in locales) {
      final candidate = locale.localeId.toLowerCase().replaceAll('-', '_');
      if (candidate == requested) {
        return locale.localeId;
      }
    }

    final language = requested.split('_').first;
    for (final locale in locales) {
      final candidate = locale.localeId.toLowerCase().replaceAll('-', '_');
      if (candidate.startsWith('${language}_') || candidate == language) {
        return locale.localeId;
      }
    }

    return null;
  }

  Future<bool> initialize({
    required void Function(String status) onStatus,
    required void Function(String errorMessage) onError,
  }) async {
    final hasPermission = await _ensureMicrophonePermission();
    if (!hasPermission) {
      onError('Microphone permission denied. Please allow microphone access.');
      return false;
    }

    try {
      final initialized = await _speechToText.initialize(
        onStatus: onStatus,
        onError: (SpeechRecognitionError error) {
          onError(error.errorMsg);
        },
        finalTimeout: const Duration(seconds: 2),
      );

      _log('SpeechToText initialized: $initialized');
      if (!initialized) {
        onError('Speech engine unavailable on this device.');
        return false;
      }

      onStatus('ready');
      return true;
    } catch (error) {
      _log('Initialization error: $error');
      onError('Speech initialization failed: $error');
      return false;
    }
  }

  Future<void> startListening({
    String? localeId,
    required void Function(String result) onResult,
    void Function(double level)? onSoundLevelChange,
  }) async {
    if (_speechToText.isListening) {
      throw Exception('Recording already in progress.');
    }

    if (!_speechToText.isAvailable) {
      throw Exception('Speech engine is unavailable on this device.');
    }

    final hasPermission = await _ensureMicrophonePermission();
    if (!hasPermission) {
      throw Exception('Microphone permission is not granted.');
    }
    final locales = await _speechToText.locales();
    final resolvedLocaleId = _normalizeLocaleToAvailable(localeId, locales);

    if (localeId != null && localeId.trim().isNotEmpty && resolvedLocaleId == null) {
      final available = locales.map((locale) => locale.localeId).join(', ');
      _log('Locale not installed. Requested: $localeId. Available locales: $available');
      throw Exception('Requested speech locale is not installed on this device: $localeId');
    }

    _log('Requested locale: $localeId, resolved locale: $resolvedLocaleId');

    _lastRecognizedText = '';
    await _speechToText.listen(
      onResult: (SpeechRecognitionResult result) {
        _lastRecognizedText = result.recognizedWords;
        onResult(_lastRecognizedText);
      },
      localeId: resolvedLocaleId,
      listenFor: const Duration(seconds: 60),
      pauseFor: const Duration(seconds: 8),
      onSoundLevelChange: onSoundLevelChange,
      listenOptions: SpeechListenOptions(
        partialResults: true,
        cancelOnError: true,
        listenMode: ListenMode.dictation,
      ),
    );
  }

  Future<String> stopListeningAndTranscribe({String? localeId}) async {
    await _speechToText.stop();
    _log('Stopped listening, final text: $_lastRecognizedText');
    return _lastRecognizedText.trim();
  }

  Future<void> stopListening() async {
    await _speechToText.stop();
  }

  bool get isListening => _speechToText.isListening;
  bool get isAvailable => _speechToText.isAvailable;

  Future<bool> hasPermission() {
    return _ensureMicrophonePermission();
  }

  Future<void> dispose() async {
    _log('Disposing speech service');
    await stopListening();
  }
}
