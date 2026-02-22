import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../constants/api_constants.dart';

/// Socket.io client singleton for real-time AI teaching and doubt sessions.
///
/// Usage:
/// ```dart
/// SocketService.instance.connect();
/// final stream = SocketService.instance.startLearning(
///   studentId: '123', subject: 'science', chapter: 'chapter-1');
/// await for (final token in stream) { /* update UI */ }
/// ```
class SocketService {
  SocketService._();
  static final SocketService instance = SocketService._();

  io.Socket? _socket;

  // ─── Connection ────────────────────────────────────────────────────────────

  void connect() {
    if (_socket != null && _socket!.connected) return;
    _socket = io.io(
      ApiConstants.socketUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .build(),
    );
    _socket!.connect();
  }

  void disconnect() {
    _socket?.disconnect();
    _socket = null;
  }

  bool get isConnected => _socket?.connected ?? false;

  // ─── start_learning ────────────────────────────────────────────────────────

  /// Emits `start_learning` and returns a stream of response tokens/chunks.
  /// The stream closes on `learning_response` completion or on error.
  Stream<String> startLearning({
    required String studentId,
    required String subject,
    required String chapter,
  }) {
    final controller = StreamController<String>();

    connect();

    // Remove any previous listeners for this event to avoid duplicates
    _socket!.off(ApiConstants.evtLearningResponse);
    _socket!.off(ApiConstants.evtError);

    _socket!.on(ApiConstants.evtLearningResponse, (data) {
      if (controller.isClosed) return;
      final text = _extractText(data);
      if (text != null) controller.add(text);
      // If the server signals completion (done flag or null token)
      if (_isDone(data)) {
        controller.close();
        _socket!.off(ApiConstants.evtLearningResponse);
      }
    });

    _socket!.on(ApiConstants.evtError, (data) {
      if (!controller.isClosed) {
        controller.addError(Exception(_extractText(data) ?? 'Socket error'));
        controller.close();
      }
    });

    _socket!.emit(ApiConstants.evtStartLearning, {
      'studentId': studentId,
      'subject': subject,
      'chapter': chapter,
    });

    return controller.stream;
  }

  // ─── ask_doubt ─────────────────────────────────────────────────────────────

  /// Emits `ask_doubt` and resolves when the server fires `doubt_answered`.
  ///
  /// For text doubts  → set [inputType] = `'text'` and [text].
  /// For voice doubts → set [inputType] = `'voice'` and [audioBase64].
  ///
  /// Returns a `Map` with keys:
  ///   `answer`, `simple_analogy`, `encouragement`, `messageId`, `fromCache`
  Future<Map<String, dynamic>> askDoubt({
    required String studentId,
    required String subject,
    required String chapter,
    required String inputType, // 'text' | 'voice'
    String? text,
    String? audioBase64,
  }) async {
    assert(
      (inputType == 'text' && text != null) ||
          (inputType == 'voice' && audioBase64 != null),
      'Provide text for inputType=text or audioBase64 for inputType=voice',
    );

    connect();

    final completer = Completer<Map<String, dynamic>>();

    // Remove stale listeners
    _socket!.off(ApiConstants.evtDoubtAnswered);
    _socket!.off(ApiConstants.evtError);

    // Listen for the single response event
    _socket!.once(ApiConstants.evtDoubtAnswered, (data) {
      if (completer.isCompleted) return;
      _socket!.off(ApiConstants.evtError);

      if (data is Map) {
        final response = data['response'];
        if (response is Map) {
          completer.complete({
            'messageId': data['messageId'],
            'fromCache': data['fromCache'] ?? false,
            'answer': response['answer'] ?? '',
            'simple_analogy': response['simple_analogy'] ?? '',
            'encouragement': response['encouragement'] ?? '',
          });
          return;
        }
      }
      // Fallback: treat entire data as answer string
      completer.complete({
        'answer': _extractText(data) ?? 'No response received.',
        'simple_analogy': '',
        'encouragement': '',
        'fromCache': false,
      });
    });

    _socket!.once(ApiConstants.evtError, (data) {
      debugPrint('🔴 SocketService.askDoubt evtError received: $data');
      if (!completer.isCompleted) {
        completer.completeError(
          Exception(_extractText(data) ?? 'Socket error: $data'),
        );
      }
    });

    _socket!.once('connect_error', (data) {
      debugPrint('🔴 SocketService.askDoubt connect_error: $data');
    });
    _socket!.once('disconnect', (data) {
      debugPrint('🔴 SocketService.askDoubt disconnect: $data');
    });

    // Build and emit payload
    final payload = <String, dynamic>{
      'studentId': studentId,
      'subject': subject,
      'chapter': chapter,
      'inputType': inputType,
    };
    if (inputType == 'text') payload['text'] = text;
    if (inputType == 'voice') payload['audioBase64'] = audioBase64;

    _socket!.emit(ApiConstants.evtAskDoubt, payload);

    // 30-second timeout guard
    return completer.future.timeout(
      const Duration(seconds: 30),
      onTimeout: () => throw Exception('No response from server (timeout).'),
    );
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /// Extracts a text string from various server response shapes:
  /// String, { text/message/token/response/content: ... }, or { data: ... }
  static String? _extractText(dynamic data) {
    if (data == null) return null;
    if (data is String) return data.isNotEmpty ? data : null;
    if (data is Map) {
      for (final key in [
        'text',
        'message',
        'token',
        'response',
        'content',
        'data',
        'explanation',
        'answer',
      ]) {
        final val = data[key];
        if (val is String && val.isNotEmpty) return val;
      }
    }
    return data.toString();
  }

  /// Returns true when the server signals the end of a streaming response.
  static bool _isDone(dynamic data) {
    if (data is Map) {
      return data['done'] == true ||
          data['finished'] == true ||
          data['end'] == true;
    }
    return false;
  }
}
