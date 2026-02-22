import 'dart:convert';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';

/// Records microphone audio to a temp AAC file and returns it as a Base64
/// string ready to send to the backend `ask_doubt` Socket.io event.
class AudioRecorderService {
  final AudioRecorder _recorder = AudioRecorder();
  String? _currentPath;
  bool _isRecording = false;

  bool get isRecording => _isRecording;

  /// Request microphone permission. Returns true if granted.
  Future<bool> requestPermission() async {
    final status = await Permission.microphone.request();
    return status.isGranted;
  }

  Future<bool> hasPermission() async {
    return (await Permission.microphone.status).isGranted;
  }

  /// Starts recording to a temp file.
  Future<void> startRecording() async {
    if (_isRecording) return;

    if (!await _recorder.hasPermission()) {
      throw Exception('Microphone permission not granted');
    }

    final dir = await getTemporaryDirectory();
    _currentPath =
        '${dir.path}/doubt_audio_${DateTime.now().millisecondsSinceEpoch}.m4a';

    await _recorder.start(
      const RecordConfig(
        encoder: AudioEncoder.aacLc,
        sampleRate: 16000,
        numChannels: 1,
        bitRate: 64000,
      ),
      path: _currentPath!,
    );

    _isRecording = true;
  }

  /// Stops recording and returns the raw audio as a Base64 string (no data URI).
  /// Returns null if recording was never started.
  Future<String?> stopAndGetBase64() async {
    if (!_isRecording) return null;
    _isRecording = false;

    final path = await _recorder.stop();
    if (path == null) return null;

    final bytes = await File(path).readAsBytes();
    final base64String = base64Encode(bytes);
    return base64String;
  }

  Future<void> dispose() async {
    if (_isRecording) {
      await _recorder.stop();
      _isRecording = false;
    }
    await _recorder.dispose();
  }
}
