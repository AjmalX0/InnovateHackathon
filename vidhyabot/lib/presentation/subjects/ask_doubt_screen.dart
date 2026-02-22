import 'dart:async';
import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

import '../../core/constants/app_colors.dart';
import '../../core/services/app_session.dart';
import '../../core/services/audio_recorder_service.dart';
import '../../core/services/chat_service.dart';
import '../../core/services/socket_service.dart';
import '../../core/services/text_to_speech_service.dart';
import '../../core/services/syllabus_service.dart';
import '../../core/utils/error_handler.dart';

// ─── Data model ─────────────────────────────────────────────────────────────

class ChatMessage {
  final String text;
  final bool isUser;
  final bool isRagRaw;
  final List<SyllabusChunk>? chunks;

  ChatMessage({
    required this.text,
    required this.isUser,
    this.isRagRaw = false,
    this.chunks,
  });
}

// ─── Screen ──────────────────────────────────────────────────────────────────

class AskDoubtScreen extends StatefulWidget {
  const AskDoubtScreen({
    super.key,
    required this.chapterTitle,
    this.subjectName = '',
  });

  final String chapterTitle;
  final String subjectName;

  @override
  State<AskDoubtScreen> createState() => _AskDoubtScreenState();
}

class _AskDoubtScreenState extends State<AskDoubtScreen>
    with TickerProviderStateMixin {
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final TextToSpeechService _ttsService = TextToSpeechService();
  final AudioRecorderService _recorder = AudioRecorderService();
  late final ChatService _gemini;

  final List<ChatMessage> _messages = [];

  String? _errorMessage;
  bool _isTtsReady = false;
  bool _isOffline = false;
  bool _isAiTyping = false;
  bool _isRecording = false;
  bool _isSendingVoice = false; // recording stopped, waiting for server

  /// Index of the AI message currently being spoken (-1 = none).
  int _speakingIndex = -1;

  StreamSubscription<String>? _aiSub;
  late StreamSubscription<List<ConnectivityResult>> _connectivitySub;

  // ─── init / dispose ────────────────────────────────────────────────────────

  @override
  void initState() {
    super.initState();

    // Gemini fallback (offline)
    _gemini = ChatService(contextHint: 'Chapter: ${widget.chapterTitle}');
    _gemini.onProgressChanged = () {
      if (mounted) setState(() {});
    };
    _gemini.init();

    _textController.addListener(() => setState(() {}));

    _messages.add(
      ChatMessage(
        text:
            'Hello! Ask me anything about the "${widget.chapterTitle}" chapter. '
            'You can type or tap the mic 🎤 to speak!',
        isUser: false,
      ),
    );

    _initServices();
    _checkConnectivity();
    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) {
      if (mounted) {
        setState(() => _isOffline = results.contains(ConnectivityResult.none));
      }
    });
  }

  Future<void> _initServices() async {
    _isTtsReady = await _ttsService.initialize();
    _ttsService.onSpeakingChanged = (speaking) {
      if (mounted) {
        setState(() {
          if (!speaking) _speakingIndex = -1;
        });
      }
    };
    if (mounted) setState(() {});
  }

  Future<void> _checkConnectivity() async {
    final results = await Connectivity().checkConnectivity();
    if (mounted) {
      setState(() => _isOffline = results.contains(ConnectivityResult.none));
    }
  }

  @override
  void dispose() {
    _connectivitySub.cancel();
    _aiSub?.cancel();
    _textController.dispose();
    _scrollController.dispose();
    _ttsService.dispose();
    _recorder.dispose();
    _gemini.dispose();
    super.dispose();
  }

  // ─── Scroll ───────────────────────────────────────────────────────────────

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  // ─── Text send ────────────────────────────────────────────────────────────

  Future<void> _sendTextMessage() async {
    final text = _textController.text.trim();
    if (text.isEmpty || _isAiTyping || _isRecording) return;

    _textController.clear();
    _addUserMessage(text);

    // 1. If offline, fallback to Gemini
    if (_isOffline) {
      await _streamGemini(text);
      return;
    }

    // 2. Fetch raw chunks from Syllabus Semantic Search
    final aiIndex = _addThinkingBubble();
    try {
      final grade = AppSession.instance.studentGrade ?? 10;
      final subject = widget.subjectName.isNotEmpty
          ? widget.subjectName.toLowerCase()
          : 'science';

      final chunks = await SyllabusService.instance.searchSyllabus(
        query: text,
        grade: grade,
        subject: subject,
      );

      if (chunks.isEmpty) {
        _setAiMessage(
          aiIndex,
          "I couldn't find any relevant study material for that question in the syllabus.",
        );
        return;
      }

      // Display the chunks directly inside the chat message
      if (mounted) {
        setState(() {
          _messages[aiIndex] = ChatMessage(
            text: 'Here is what the syllabus says. Want me to simplify it?',
            isUser: false,
            isRagRaw: true,
            chunks: chunks,
          );
          _isAiTyping = false;
        });
        _scrollToBottom();
      }
    } catch (e) {
      _setAiMessage(aiIndex, ErrorHandler.getUserMessage(e));
    }
  }

  Future<void> _simplifyChunks(ChatMessage message) async {
    if (message.chunks == null || message.chunks!.isEmpty) return;

    // Convert chunk list to single context string
    final contextChunks = message.chunks!
        .map((c) => 'Chapter: ${c.chapter}\n${c.content}')
        .join('\n\n--- ');

    _addUserMessage('🪄 Please simplify that for me!');
    final prompt =
        "Context from textbook:\n$contextChunks\n\nPlease explain the above context in very simple terms for a student, using analogies if helpful.";

    if (_isOffline) {
      await _streamGemini(prompt, isRawPrompt: true);
    } else {
      await _streamGemini(prompt, isRawPrompt: true);
    }
  }

  // ─── Voice button ─────────────────────────────────────────────────────────

  Future<void> _onMicTapped() async {
    if (_isAiTyping || _isSendingVoice) return;

    if (_isOffline) {
      _showSnack('Voice input requires an internet connection.');
      return;
    }

    if (_isRecording) {
      // Allow fallback if user taps mic instead of the banner stop
      _stopAndSendRecording();
    } else {
      // ── Start recording ──────────────────────────────────────────
      final hasPerm =
          await _recorder.hasPermission() ||
          await _recorder.requestPermission();
      if (!hasPerm) {
        _showSnack('Microphone permission is required.');
        return;
      }
      try {
        await _recorder.startRecording();
        setState(() => _isRecording = true);
        if (_speakingIndex != -1) {
          _ttsService.stop();
          setState(() => _speakingIndex = -1);
        }
        _stopGenerating();
      } catch (e) {
        _showSnack(ErrorHandler.getUserMessage(e));
      }
    }
  }

  void _stopAndSendRecording() async {
    if (!_isRecording) return;
    setState(() {
      _isRecording = false;
      _isSendingVoice = true;
    });

    try {
      final base64 = await _recorder.stopAndGetBase64();
      if (base64 == null || base64.isEmpty) {
        setState(() => _isSendingVoice = false);
        _showSnack('Recording was empty. Please try again.');
        return;
      }

      // Show placeholder user bubble for voice
      _addUserMessage('🎤 Voice question');
      await _sendToSocket(inputType: 'voice', audioBase64: base64);
    } catch (e) {
      setState(() => _isSendingVoice = false);
      _showSnack(ErrorHandler.getUserMessage(e));
    }
  }

  void _cancelRecording() async {
    await _recorder.stopAndGetBase64(); // stop but don't send
    if (mounted) {
      setState(() {
        _isRecording = false;
      });
      _showSnack('Recording cancelled');
    }
  }

  void _stopGenerating() {
    _aiSub?.cancel();
    if (mounted) {
      setState(() {
        _isAiTyping = false;
      });
    }
  }

  // ─── Socket send ──────────────────────────────────────────────────────────

  Future<void> _sendToSocket({
    required String inputType,
    String? text,
    String? audioBase64,
  }) async {
    final aiIndex = _addThinkingBubble();

    final studentId = AppSession.instance.studentId ?? 'guest';
    final subject = widget.subjectName.toLowerCase();
    final chapter = widget.chapterTitle.toLowerCase().replaceAll(' ', '-');

    try {
      final result = await SocketService.instance.askDoubt(
        studentId: studentId,
        subject: subject,
        chapter: chapter,
        inputType: inputType,
        text: text,
        audioBase64: audioBase64,
      );

      final answer = (result['answer'] as String? ?? '').trim();
      final analogy = (result['simple_analogy'] as String? ?? '').trim();
      final encourage = (result['encouragement'] as String? ?? '').trim();

      // Build formatted message
      final buffer = StringBuffer(answer);
      if (analogy.isNotEmpty) {
        buffer.write('\n\n📌 Think of it like: $analogy');
      }
      if (encourage.isNotEmpty) {
        buffer.write('\n\n💪 $encourage');
      }
      final fullText = buffer.toString();

      if (answer.isNotEmpty) {
        final grade = AppSession.instance.studentGrade ?? 10;
        final prompt =
            "Please simplify the following explanation so that a Grade $grade student can easily understand it. Do not lose the analogy or encouragement if present:\n\n$fullText";
        await _streamGemini(
          prompt,
          replaceIndex: aiIndex,
          isRawPrompt: true,
          autoPlayTts: true,
        );
      } else {
        _setAiMessage(aiIndex, fullText);
      }
    } catch (e) {
      debugPrint('🔴 SocketService.askDoubt ERROR: $e');
      // Backend failed → fall back to Gemini for text doubts
      if (inputType == 'text' && text != null) {
        await _streamGemini(text, replaceIndex: aiIndex);
      } else {
        _setAiMessage(
          aiIndex,
          'Sorry, I couldn\'t process your voice question. '
          'Please try typing your doubt.',
        );
      }
    } finally {
      if (mounted) setState(() => _isSendingVoice = false);
    }
  }

  // ─── Gemini streaming fallback ────────────────────────────────────────────

  Future<void> _streamGemini(
    String input, {
    int? replaceIndex,
    bool isRawPrompt = false,
    bool autoPlayTts = false,
  }) async {
    final aiIndex = replaceIndex ?? _addThinkingBubble();

    final grade = AppSession.instance.studentGrade ?? 10;
    final prompt = isRawPrompt
        ? input
        : "Please answer the user's doubt. VERY IMPORTANT: Explain it so that a Grade $grade student can easily understand.\n\nDoubt:\n$input";

    _aiSub?.cancel();
    _aiSub = _gemini
        .sendMessage(prompt, isOnline: !_isOffline)
        .listen(
          (token) {
            if (!mounted) return;
            setState(() {
              final prev = _messages[aiIndex].text;
              _messages[aiIndex] = ChatMessage(
                text: prev.isEmpty ? token : prev + token,
                isUser: false,
              );
            });
            _scrollToBottom();
          },
          onError: (e) {
            if (mounted) {
              _setAiMessage(aiIndex, 'Error: $e');
            }
          },
          onDone: () async {
            if (mounted) setState(() => _isAiTyping = false);

            if (autoPlayTts && _isTtsReady) {
              final finalText = _messages[aiIndex].text;
              if (finalText.isNotEmpty) {
                setState(() => _speakingIndex = aiIndex);
                try {
                  await _ttsService.speakAuto(finalText);
                } catch (_) {}
                if (mounted) setState(() => _speakingIndex = -1);
              }
            }
          },
        );
  }

  Future<void> _simplifyExistingMessage(ChatMessage message) async {
    if (message.text.isEmpty || _isAiTyping || _isSendingVoice) return;
    _addUserMessage('🪄 Please make that even simpler!');

    final prompt =
        "Please simplify the following explanation even further, using extremely simple words, short sentences, and a very relatable analogy if possible:\n\n${message.text}";
    await _streamGemini(prompt, isRawPrompt: true);
  }

  // ─── Message helpers ──────────────────────────────────────────────────────

  void _addUserMessage(String text) {
    setState(() => _messages.add(ChatMessage(text: text, isUser: true)));
    _scrollToBottom();
  }

  /// Adds an empty thinking-dots AI bubble and returns its index.
  int _addThinkingBubble() {
    setState(() {
      _messages.add(ChatMessage(text: '', isUser: false));
      _isAiTyping = true;
    });
    _scrollToBottom();
    return _messages.length - 1;
  }

  void _setAiMessage(int index, String text) {
    if (mounted) {
      setState(() {
        _messages[index] = ChatMessage(text: text, isUser: false);
        _isAiTyping = false;
      });
      _scrollToBottom();
    }
  }

  void _showSnack(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  // ─── Build ────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text('Ask a Doubt • ${widget.chapterTitle}'),
        elevation: 1,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12.0),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  _isOffline ? Icons.cloud_off : Icons.cloud_done,
                  size: 14,
                  color: _isOffline
                      ? Colors.orange.shade700
                      : Colors.green.shade700,
                ),
                const SizedBox(width: 4),
                Text(
                  _isOffline ? 'Offline' : 'Online',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: _isOffline
                        ? Colors.orange.shade700
                        : Colors.green.shade700,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Error banner
          if (_errorMessage != null)
            Container(
              width: double.infinity,
              color: AppColors.error.withValues(alpha: 0.1),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Text(
                _errorMessage!,
                style: const TextStyle(color: AppColors.error),
              ),
            ),

          // Recording banner
          if (_isRecording)
            _RecordingBanner(
              onStop: _stopAndSendRecording,
              onCancel: _cancelRecording,
            ),

          // Chat list
          Expanded(
            child: GestureDetector(
              onTap: () => FocusScope.of(context).unfocus(),
              child: ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.only(top: 16, bottom: 20),
                itemCount: _messages.length,
                itemBuilder: (context, index) =>
                    _buildChatBubble(_messages[index], index),
              ),
            ),
          ),

          // Stop Generating floating icon button
          if (_isAiTyping)
            Padding(
              padding: const EdgeInsets.only(bottom: 8.0),
              child: Center(
                child: IconButton(
                  onPressed: _stopGenerating,
                  icon: const Icon(Icons.stop_circle_rounded),
                  color: AppColors.error,
                  iconSize: 32,
                  tooltip: 'Stop Generating',
                ),
              ),
            ),

          // Thinking indicator (below list, above input)
          if (_isAiTyping)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.auto_awesome,
                        color: AppColors.primary,
                        size: 14,
                      ),
                    ),
                    const SizedBox(width: 8),
                    const _DotsIndicator(),
                  ],
                ),
              ),
            ),

          _buildInputBar(),
        ],
      ),
    );
  }

  // ─── Input bar ────────────────────────────────────────────────────────────

  Widget _buildInputBar() {
    final busy = _isAiTyping || _isSendingVoice;
    final hasText = _textController.text.trim().isNotEmpty;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 24),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // Text field
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(24),
              ),
              child: TextField(
                controller: _textController,
                minLines: 1,
                maxLines: 4,
                enabled: !busy && !_isRecording,
                onSubmitted: (_) => _sendTextMessage(),
                decoration: InputDecoration(
                  hintText: _isRecording
                      ? 'Recording… tap ■ to stop'
                      : busy
                      ? 'Thinking...'
                      : 'Ask a question...',
                  hintStyle: TextStyle(color: Colors.grey.shade500),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 14,
                  ),
                ),
              ),
            ),
          ),

          const SizedBox(width: 8),

          // Send button (only when text typed)
          if (hasText && !_isRecording)
            _CircleBtn(
              icon: Icons.send_rounded,
              color: AppColors.primary,
              iconColor: Colors.white,
              onTap: busy ? null : _sendTextMessage,
            )
          else
            // Mic / Stop-recording button
            _MicButton(
              isRecording: _isRecording,
              isSending: _isSendingVoice,
              disabled: busy && !_isRecording,
              onTap: _onMicTapped,
            ),
        ],
      ),
    );
  }

  // ─── Chat bubble ─────────────────────────────────────────────────────────

  Widget _buildChatBubble(ChatMessage message, int index) {
    final showDots = !message.isUser && message.text.isEmpty && _isAiTyping;
    final bool isThisSpeaking = _speakingIndex == index;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
      child: Row(
        mainAxisAlignment: message.isUser
            ? MainAxisAlignment.end
            : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!message.isUser) ...[
            Container(
              margin: const EdgeInsets.only(right: 8, top: 4),
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.auto_awesome,
                color: AppColors.primary,
                size: 16,
              ),
            ),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment: message.isUser
                  ? CrossAxisAlignment.end
                  : CrossAxisAlignment.start,
              children: [
                // Bubble
                showDots
                    ? Container(
                        padding: const EdgeInsets.symmetric(
                          vertical: 14,
                          horizontal: 20,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          border: Border.all(
                            color: Colors.grey.shade200,
                            width: 2,
                          ),
                          borderRadius: BorderRadius.circular(
                            24,
                          ).copyWith(bottomLeft: const Radius.circular(8)),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.grey.shade200,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: const SizedBox(
                          width: 40,
                          height: 18,
                          child: _DotsIndicator(),
                        ),
                      )
                    : Container(
                        padding: const EdgeInsets.symmetric(
                          vertical: 14,
                          horizontal: 18,
                        ),
                        decoration: BoxDecoration(
                          color: message.isUser
                              ? AppColors.primary
                              : Colors.white,
                          border: Border.all(
                            color: message.isUser
                                ? AppColors.primaryDark.withValues(alpha: 0.5)
                                : Colors.grey.shade200,
                            width: 2,
                          ),
                          borderRadius: BorderRadius.circular(24).copyWith(
                            bottomLeft: message.isUser
                                ? const Radius.circular(24)
                                : const Radius.circular(8),
                            bottomRight: message.isUser
                                ? const Radius.circular(8)
                                : const Radius.circular(24),
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: message.isUser
                                  ? AppColors.primaryDark.withValues(alpha: 0.5)
                                  : Colors.grey.shade200,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: message.isRagRaw && message.chunks != null
                            ? Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Text(
                                    message.text,
                                    style: TextStyle(
                                      color: message.isUser
                                          ? Colors.white
                                          : Colors.black87,
                                      fontSize: 15,
                                      fontWeight: FontWeight.bold,
                                      height: 1.5,
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  ...message.chunks!.map(
                                    (chunk) => Container(
                                      margin: const EdgeInsets.only(bottom: 8),
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(
                                          color: Colors.grey.shade300,
                                        ),
                                      ),
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            SyllabusService.slugToTitle(
                                              chunk.chapter,
                                            ),
                                            style: TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.bold,
                                              color: AppColors.primary,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            chunk.content,
                                            style: const TextStyle(
                                              fontSize: 13,
                                              color: Colors.black87,
                                            ),
                                            maxLines: 4,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  ElevatedButton.icon(
                                    onPressed: () => _simplifyChunks(message),
                                    icon: const Icon(Icons.auto_awesome),
                                    label: const Text('Simplify'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.primary,
                                      foregroundColor: Colors.white,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                    ),
                                  ),
                                ],
                              )
                            : Text(
                                message.text,
                                style: TextStyle(
                                  color: message.isUser
                                      ? Colors.white
                                      : Colors.black87,
                                  fontSize: 15,
                                  height: 1.5,
                                ),
                              ),
                      ),

                // Listen and Simplify pills (AI messages only)
                if (!message.isUser &&
                    message.text.isNotEmpty &&
                    !message.isRagRaw)
                  Padding(
                    padding: const EdgeInsets.only(top: 5, left: 2),
                    child: Wrap(
                      spacing: 8,
                      children: [
                        if (_isTtsReady)
                          GestureDetector(
                            onTap: () async {
                              if (isThisSpeaking) {
                                await _ttsService.stop();
                                if (mounted)
                                  setState(() => _speakingIndex = -1);
                              } else {
                                if (_speakingIndex != -1)
                                  await _ttsService.stop();
                                if (mounted)
                                  setState(() => _speakingIndex = index);
                                try {
                                  await _ttsService.speakAuto(message.text);
                                } catch (_) {
                                  if (mounted)
                                    setState(() => _speakingIndex = -1);
                                }
                              }
                            },
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 5,
                              ),
                              decoration: BoxDecoration(
                                color: isThisSpeaking
                                    ? AppColors.primary.withValues(alpha: 0.12)
                                    : Colors.grey.shade200,
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: isThisSpeaking
                                      ? AppColors.primary.withValues(alpha: 0.4)
                                      : Colors.transparent,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    isThisSpeaking
                                        ? Icons.stop_rounded
                                        : Icons.volume_up_rounded,
                                    size: 14,
                                    color: isThisSpeaking
                                        ? AppColors.primary
                                        : Colors.grey.shade600,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    isThisSpeaking ? 'Stop' : 'Listen',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                      color: isThisSpeaking
                                          ? AppColors.primary
                                          : Colors.grey.shade600,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),

                        // Simplify More button
                        GestureDetector(
                          onTap: () => _simplifyExistingMessage(message),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 5,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.grey.shade200,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: Colors.transparent),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.auto_awesome,
                                  size: 14,
                                  color: Colors.grey.shade600,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  'Simplify',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.grey.shade600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          if (message.isUser) ...[
            Container(
              margin: const EdgeInsets.only(left: 8, top: 4),
              child: CircleAvatar(
                radius: 14,
                backgroundColor: AppColors.primary.withValues(alpha: 0.2),
                child: const Icon(
                  Icons.person,
                  color: AppColors.primary,
                  size: 16,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

// ─── Helper widgets ──────────────────────────────────────────────────────────

class _RecordingBanner extends StatelessWidget {
  final VoidCallback onStop;
  final VoidCallback onCancel;

  const _RecordingBanner({required this.onStop, required this.onCancel});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: AppColors.error.withValues(alpha: 0.08),
      child: Row(
        children: [
          const Icon(
            Icons.fiber_manual_record,
            color: AppColors.error,
            size: 14,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Recording audio...',
              style: TextStyle(
                color: AppColors.error.withValues(alpha: 0.85),
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          // Cancel icon
          IconButton(
            onPressed: onCancel,
            icon: const Icon(Icons.close_rounded),
            color: Colors.grey.shade600,
            iconSize: 22,
            padding: const EdgeInsets.all(4),
            constraints: const BoxConstraints(),
            tooltip: 'Cancel',
          ),
          const SizedBox(width: 8),
          // Stop/Send icon
          IconButton(
            onPressed: onStop,
            icon: const Icon(Icons.send_rounded),
            color: AppColors.primary,
            iconSize: 22,
            padding: const EdgeInsets.all(4),
            constraints: const BoxConstraints(),
            tooltip: 'Send',
          ),
        ],
      ),
    );
  }
}

class _CircleBtn extends StatelessWidget {
  final IconData icon;
  final Color color;
  final Color iconColor;
  final VoidCallback? onTap;

  const _CircleBtn({
    required this.icon,
    required this.color,
    required this.iconColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: onTap != null ? color : color.withValues(alpha: 0.3),
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Icon(icon, color: iconColor, size: 22),
        ),
      ),
    );
  }
}

class _MicButton extends StatelessWidget {
  final bool isRecording;
  final bool isSending;
  final bool disabled;
  final VoidCallback onTap;

  const _MicButton({
    required this.isRecording,
    required this.isSending,
    required this.disabled,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    if (isSending) {
      return Container(
        width: 46,
        height: 46,
        decoration: BoxDecoration(
          color: AppColors.primary.withValues(alpha: 0.12),
          shape: BoxShape.circle,
        ),
        child: const Padding(
          padding: EdgeInsets.all(12),
          child: CircularProgressIndicator(
            strokeWidth: 2,
            color: AppColors.primary,
          ),
        ),
      );
    }

    return _CircleBtn(
      icon: isRecording ? Icons.stop_rounded : Icons.mic_rounded,
      color: isRecording ? AppColors.error : AppColors.primary,
      iconColor: Colors.white,
      onTap: disabled ? null : onTap,
    );
  }
}

// ─── Dots indicator ──────────────────────────────────────────────────────────

class _DotsIndicator extends StatefulWidget {
  const _DotsIndicator();

  @override
  State<_DotsIndicator> createState() => _DotsIndicatorState();
}

class _DotsIndicatorState extends State<_DotsIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _ac;

  @override
  void initState() {
    super.initState();
    _ac = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat();
  }

  @override
  void dispose() {
    _ac.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ac,
      builder: (_, __) {
        final phase = (_ac.value * 3).floor();
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (i) {
            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 2),
              width: 7,
              height: 7,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(
                  alpha: phase == i ? 0.9 : 0.25,
                ),
                shape: BoxShape.circle,
              ),
            );
          }),
        );
      },
    );
  }
}
