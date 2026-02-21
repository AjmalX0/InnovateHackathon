import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';

class WhisperSttService {
  final AudioRecorder _audioRecorder = AudioRecorder();
  String? _recordingPath;
  bool _isRecordingSync = false;

  // IMPORTANT: For production, do NOT hardcode API keys.
  // We use the free Hugging Face Inference API for Whisper.
  // You should replace this with a valid Hugging Face API Token (e.g. hf_xxxxx)
  // or a Bhashini API key for production use.
  static const String _hfApiToken = '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';

  // Using whisper-large-v3 for the highest accuracy on Indian languages like Malayalam
  static const String _apiUrl =
      'https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3';

  void _log(String message) {
    if (kDebugMode) {
      debugPrint('[WhisperSttService] $message');
    }
  }

  Future<bool> initialize() async {
    final status = await Permission.microphone.request();
    return status.isGranted;
  }

  Future<void> startListening() async {
    final hasPermission = await _audioRecorder.hasPermission();
    if (!hasPermission) {
      throw Exception('Microphone permission not granted.');
    }

    final dir = await getTemporaryDirectory();
    _recordingPath = '${dir.path}/speech_audio.m4a';

    // Record in AAC format (.m4a) which is universally supported on Android/iOS
    // API accepts FLAC, MP3, MP4, MPEG, MPGA, M4A, OGG, WAV, or WEBM.
    await _audioRecorder.start(
      const RecordConfig(
        encoder: AudioEncoder.aacLc,
        bitRate: 128000,
        sampleRate: 44100,
        numChannels: 1,
      ),
      path: _recordingPath!,
    );
    _isRecordingSync = true;
    _log('Started recording to $_recordingPath');
  }

  Future<String> stopListeningAndTranscribe({String? localeId}) async {
    final path = await _audioRecorder.stop();
    _isRecordingSync = false;
    _log('Stopped recording. File saved at: $path');

    if (path == null) {
      throw Exception('No audio recorded.');
    }

    return await _transcribeAudio(File(path), localeId);
  }

  Future<String> _transcribeAudio(File audioFile, String? localeId) async {
    _log('Sending audio to Whisper API...');

    // In a real app, if _hfApiToken is empty/placeholder, you might want to prompt the user
    // For hackathons, hardcoding a free HF token might be acceptable.

    final bytes = await audioFile.readAsBytes();

    try {
      final request = http.Request('POST', Uri.parse(_apiUrl));
      request.headers.addAll({
        'Authorization': 'Bearer $_hfApiToken',
        'Content-Type': 'audio/m4a',
        // HF inference APIs don't easily accept multipart form combinations dynamically
        // but we can pass routing instructions or model parameters in headers occasionally.
        // Whisper accepts a specific language or translation task usually via the wrapper,
        // to guarantee Malayalam, we inject the X-Amzn or specific generation parameters if supported,
        // although standard HF inference might require a different approach. Let's send the bytes.
      });
      request.bodyBytes = bytes;

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      _log('API Response status: ${response.statusCode}');
      _log('API Response body: ${response.body}');

      if (response.statusCode == 200) {
        try {
          final data = jsonDecode(response.body);
          final text = data['text'] as String?;
          return text?.trim() ?? '';
        } catch (_) {
          throw Exception(
            'Invalid JSON response. API may be offline or URL has changed.',
          );
        }
      } else {
        try {
          final error = jsonDecode(response.body);
          // Specifically handle HF model loading status
          if (error['error'] != null &&
              error['error'].toString().contains('loading')) {
            // Model is waking up, usually takes 10-20 seconds.
            return "Model is initializing. Please try speaking again in 20 seconds.";
          }
        } catch (_) {
          // If body is HTML or not JSON, just throw the status
        }

        if (response.statusCode == 401) {
          throw Exception('Invalid or missing Hugging Face API Token.');
        }
        throw Exception(
          'API Error (${response.statusCode}): Received unexpected response format.',
        );
      }
    } catch (e) {
      _log('Transcription failed: $e');
      throw Exception(
        'Translation failed. Check internet connection or API token.',
      );
    }
  }

  bool get isListening => _isRecordingSync;

  Future<bool> get isRecording async => await _audioRecorder.isRecording();

  Future<void> stopListening() async {
    await _audioRecorder.stop();
    _isRecordingSync = false;
  }

  Future<bool> hasPermission() async {
    return await Permission.microphone.status.isGranted;
  }

  Future<void> dispose() async {
    await _audioRecorder.dispose();
  }
}
