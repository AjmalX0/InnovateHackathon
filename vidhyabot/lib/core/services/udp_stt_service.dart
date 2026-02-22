import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';

class UdpSttService {
  final AudioRecorder _audioRecorder = AudioRecorder();
  RawDatagramSocket? _socket;
  bool _isRecordingSync = false;

  // IMPORTANT: Replace with the actual IP address and Port of your UDP server backend
  static const String serverIp = '192.168.1.100'; // Placeholder IP
  static const int serverPort = 5000; // Placeholder Port

  void _log(String message) {
    if (kDebugMode) {
      debugPrint('[UdpSttService] $message');
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

    // Set up UDP socket for transmitting audio
    _socket = await RawDatagramSocket.bind(InternetAddress.anyIPv4, 0);

    // Stream 16kHz PCM audio bytes directly to the backend
    final stream = await _audioRecorder.startStream(
      const RecordConfig(
        encoder: AudioEncoder.pcm16bits,
        sampleRate: 16000,
        numChannels: 1,
      ),
    );

    _isRecordingSync = true;
    _log('Started UDP audio recording stream to $serverIp:$serverPort');

    final serverAddress = InternetAddress(serverIp);

    stream.listen(
      (data) {
        if (_isRecordingSync && _socket != null) {
          _socket!.send(data, serverAddress, serverPort);
        }
      },
      onDone: () {
        _log('Audio stream completed');
      },
      onError: (e) {
        _log('Audio stream error: $e');
      },
    );
  }

  bool get isListening => _isRecordingSync;

  Future<String> stopListeningAndTranscribe({String? localeId}) async {
    await _audioRecorder.stop();
    _isRecordingSync = false;
    _log('Stopped recording, awaiting UDP response...');

    if (_socket == null) {
      throw Exception('Socket is not initialized.');
    }

    final completer = Completer<String>();
    Timer? timeoutTimer;

    // Listen for backend text response on the same UDP socket
    final subscription = _socket!.listen((RawSocketEvent event) {
      if (event == RawSocketEvent.read) {
        Datagram? datagram = _socket!.receive();
        if (datagram != null) {
          final responseString = utf8.decode(datagram.data);
          _log('Received UDP response: $responseString');
          if (!completer.isCompleted) {
            completer.complete(responseString);
          }
        }
      }
    });

    // 10-second timeout constraint
    timeoutTimer = Timer(const Duration(seconds: 10), () {
      if (!completer.isCompleted) {
        completer.completeError(
          TimeoutException('Response did not reach within 10s'),
        );
      }
    });

    try {
      final result = await completer.future;
      return result.trim();
    } finally {
      timeoutTimer.cancel();
      subscription.cancel();
      _socket?.close();
      _socket = null;
    }
  }

  Future<bool> hasPermission() async {
    return await Permission.microphone.status.isGranted;
  }

  Future<void> stopListening() async {
    await _audioRecorder.stop();
    _isRecordingSync = false;
    _socket?.close();
    _socket = null;
  }

  Future<void> dispose() async {
    await stopListening();
    await _audioRecorder.dispose();
  }
}
