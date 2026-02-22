import 'dart:async';
import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

import '../../core/constants/app_colors.dart';
import '../../core/services/chat_service.dart';
import '../../core/services/text_to_speech_service.dart';
import '../../core/services/udp_stt_service.dart';

enum DoubtLanguageOption { english, malayalam, autoDetect }

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

class ChatMessage {
  final String text;
  final bool isUser;

  ChatMessage({required this.text, required this.isUser});
}

class _AskDoubtScreenState extends State<AskDoubtScreen> {
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final TextToSpeechService _ttsService = TextToSpeechService();
  final UdpSttService _sttService = UdpSttService();
  late final ChatService _offlineFallback;

  final List<ChatMessage> _messages = [];

  String? _errorMessage;
  bool _isTtsReady = false;
  bool _isSpeechReady = false;
  bool _isTranscribing = false;
  bool _isInitializing = true;
  bool _isOffline = false;
  bool _isAiTyping = false;

  StreamSubscription<String>? _aiSub;
  late StreamSubscription<List<ConnectivityResult>> _connectivitySubscription;

  /// Index of the AI message currently being spoken (-1 = none).
  int _speakingIndex = -1;

  String _hintText = 'Type a message...';

  void _log(String message) {
    debugPrint('[AskDoubtScreen] $message');
  }

  @override
  void initState() {
    super.initState();

    // Offline Gemini fallback
    _offlineFallback = ChatService(
      contextHint: 'Chapter: ${widget.chapterTitle}',
    );
    _offlineFallback.onProgressChanged = () {
      if (mounted) setState(() {});
    };
    _offlineFallback.init();

    _textController.addListener(_onTextChanged);
    _messages.add(
      ChatMessage(
        text:
            'Hello! How can I help you with the ${widget.chapterTitle} chapter today?',
        isUser: false,
      ),
    );
    _checkInitialConnectivity();
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((
      List<ConnectivityResult> results,
    ) {
      if (mounted) {
        setState(() {
          _isOffline =
              results.contains(ConnectivityResult.none) || results.isEmpty;
          if (_isOffline && _sttService.isListening) {
            _toggleRecording();
          }
        });
      }
    });
    _initializeEngines();
  }

  Future<void> _checkInitialConnectivity() async {
    final results = await Connectivity().checkConnectivity();
    if (mounted) {
      setState(() {
        _isOffline =
            results.contains(ConnectivityResult.none) || results.isEmpty;
      });
    }
  }

  void _onTextChanged() => setState(() {});

  Future<void> _initializeEngines() async {
    _log('Initializing speech and TTS engines');
    _isTtsReady = await _ttsService.initialize();
    // Rebuild when speaking state changes so the button icon updates
    _ttsService.onSpeakingChanged = (speaking) {
      if (mounted)
        setState(() {
          if (!speaking) _speakingIndex = -1;
        });
    };
    try {
      _isSpeechReady = await _sttService.initialize();
      _log('Engine init result -> TTS: $_isTtsReady, STT: $_isSpeechReady');
      if (mounted) setState(() => _isInitializing = false);
    } catch (error) {
      _log('Initialization exception: $error');
      if (mounted) setState(() => _isInitializing = false);
    }
  }

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

  Future<void> _sendMessage(String text) async {
    if (text.trim().isEmpty || _isAiTyping) return;

    setState(() {
      _messages.add(ChatMessage(text: text.trim(), isUser: true));
      _textController.clear();
      _hintText = 'Type a message...';
      _errorMessage = null;
      _messages.add(ChatMessage(text: '', isUser: false));
      _isAiTyping = true;
    });
    _scrollToBottom();

    final aiIndex = _messages.length - 1;
    _aiSub?.cancel();

    // Use ChatService (Gemini online / local model offline) — same engine as
    // AiChatScreen, which is confirmed working. The context hint injects
    // the chapter name so answers stay on-topic.
    final stream = _offlineFallback.sendMessage(
      text.trim(),
      isOnline: !_isOffline,
    );

    _aiSub = stream.listen(
      (token) {
        if (!mounted) return;
        setState(() {
          _messages[aiIndex] = ChatMessage(
            text: _messages[aiIndex].text + token,
            isUser: false,
          );
        });
        _scrollToBottom();
      },
      onError: (e) {
        if (!mounted) return;
        setState(() {
          _messages[aiIndex] = ChatMessage(text: 'Error: $e', isUser: false);
          _isAiTyping = false;
        });
      },
      onDone: () {
        if (mounted) setState(() => _isAiTyping = false);
      },
    );
  }

  Future<void> _toggleRecording() async {
    if (_isTranscribing) return;

    if (_sttService.isListening) {
      try {
        _log('Stop listening tapped; starting transcription');
        setState(() {
          _isTranscribing = true;
          _hintText = 'Thinking...';
        });
        final transcribedText = await _sttService.stopListeningAndTranscribe();
        if (!mounted) return;
        setState(() {
          _isTranscribing = false;
          _hintText = 'Type a message...';
          _errorMessage = null;
          if (transcribedText.trim().isNotEmpty) {
            _sendMessage(transcribedText);
          }
        });
      } catch (error) {
        _log('Stop listening/transcription failed: $error');
        if (!mounted) return;
        setState(() {
          _isTranscribing = false;
          if (error is TimeoutException || error.toString().contains('10s')) {
            _hintText = 'Please try again';
          } else {
            _hintText = 'Error occurred';
            _errorMessage = 'Unable to stop listening: $error';
          }
        });
        Future.delayed(const Duration(seconds: 3), () {
          if (mounted && !_sttService.isListening) {
            setState(() => _hintText = 'Type a message...');
          }
        });
      }
    } else {
      if (!_isSpeechReady) {
        final hasPerm = await _sttService.hasPermission();
        if (!hasPerm) {
          setState(() => _errorMessage = 'Microphone permission denied.');
          return;
        }
        _isSpeechReady = await _sttService.initialize();
      }
      try {
        await _sttService.startListening();
        setState(() {
          _hintText = 'Listening...';
          _errorMessage = null;
        });
      } catch (error) {
        setState(() {
          _errorMessage = 'Unable to start listening: $error';
          _hintText = 'Type a message...';
        });
      }
    }
  }

  @override
  void dispose() {
    _connectivitySubscription.cancel();
    _aiSub?.cancel();
    _textController.removeListener(_onTextChanged);
    _textController.dispose();
    _scrollController.dispose();
    _ttsService.dispose();
    _sttService.dispose();
    _offlineFallback.dispose();
    super.dispose();
  }

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
                // ── Bubble ──────────────────────────────────────────────
                showDots
                    ? Container(
                        padding: const EdgeInsets.symmetric(
                          vertical: 14,
                          horizontal: 18,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade100,
                          borderRadius: const BorderRadius.only(
                            topLeft: Radius.circular(20),
                            topRight: Radius.circular(20),
                            bottomLeft: Radius.circular(4),
                            bottomRight: Radius.circular(20),
                          ),
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
                              : Colors.grey.shade100,
                          borderRadius: BorderRadius.only(
                            topLeft: const Radius.circular(20),
                            topRight: const Radius.circular(20),
                            bottomLeft: message.isUser
                                ? const Radius.circular(20)
                                : const Radius.circular(4),
                            bottomRight: message.isUser
                                ? const Radius.circular(4)
                                : const Radius.circular(20),
                          ),
                          boxShadow: [
                            if (!message.isUser)
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.05),
                                blurRadius: 5,
                                offset: const Offset(0, 2),
                              ),
                          ],
                        ),
                        child: Text(
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

                // ── Listen / Stop button (AI bubbles only) ───────────────
                if (!message.isUser && message.text.isNotEmpty && _isTtsReady)
                  Padding(
                    padding: const EdgeInsets.only(top: 5, left: 2),
                    child: GestureDetector(
                      onTap: () async {
                        if (isThisSpeaking) {
                          await _ttsService.stop();
                          if (mounted) setState(() => _speakingIndex = -1);
                        } else {
                          if (_speakingIndex != -1) {
                            await _ttsService.stop();
                          }
                          if (mounted) setState(() => _speakingIndex = index);
                          try {
                            await _ttsService.speakAuto(message.text);
                          } catch (_) {
                            if (mounted) setState(() => _speakingIndex = -1);
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

  @override
  Widget build(BuildContext context) {
    final bool isMicActive = _sttService.isListening;
    final bool isBusy = _isTranscribing;

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
                  size: 16,
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
      body: _isInitializing
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Offline-model download banner
                if (_offlineFallback.isDownloading)
                  Container(
                    width: double.infinity,
                    color: AppColors.primaryLight.withValues(alpha: 0.15),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _offlineFallback.downloadStatus,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.primaryDark,
                          ),
                        ),
                        const SizedBox(height: 4),
                        LinearProgressIndicator(
                          value: _offlineFallback.downloadProgress > 0
                              ? _offlineFallback.downloadProgress
                              : null,
                          color: AppColors.primary,
                          backgroundColor: AppColors.primaryLight.withValues(
                            alpha: 0.3,
                          ),
                        ),
                      ],
                    ),
                  ),
                if (_errorMessage != null)
                  Container(
                    width: double.infinity,
                    color: Colors.red.shade100,
                    padding: const EdgeInsets.all(8),
                    child: Text(
                      _errorMessage!,
                      style: TextStyle(
                        color: Colors.red.shade900,
                        fontSize: 12,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                Expanded(
                  child: ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.only(top: 16, bottom: 20),
                    itemCount: _messages.length,
                    itemBuilder: (context, index) =>
                        _buildChatBubble(_messages[index], index),
                  ),
                ),
                if (_isAiTyping)
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 2,
                    ),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        _isOffline
                            ? '⚙ Offline AI is thinking...'
                            : '✦ AI Tutor is writing...',
                        style: const TextStyle(
                          fontStyle: FontStyle.italic,
                          color: Colors.grey,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                Container(
                  padding: const EdgeInsets.only(
                    left: 16,
                    right: 16,
                    bottom: 24,
                    top: 12,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 10,
                        offset: const Offset(0, -2),
                      ),
                    ],
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(
                              color: isMicActive
                                  ? AppColors.primary.withValues(alpha: 0.5)
                                  : Colors.transparent,
                              width: 1.5,
                            ),
                          ),
                          child: TextField(
                            controller: _textController,
                            minLines: 1,
                            maxLines: 4,
                            textInputAction: TextInputAction.send,
                            onSubmitted: _sendMessage,
                            enabled: !isMicActive && !isBusy && !_isAiTyping,
                            decoration: InputDecoration(
                              hintText: _isOffline
                                  ? 'Offline mode: text only...'
                                  : _hintText,
                              hintStyle: TextStyle(
                                color:
                                    (isMicActive ||
                                        isBusy ||
                                        _hintText == 'Please try again')
                                    ? AppColors.primary
                                    : Colors.grey.shade500,
                                fontStyle: (isMicActive || isBusy || _isOffline)
                                    ? FontStyle.italic
                                    : FontStyle.normal,
                              ),
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
                      AnimatedSwitcher(
                        duration: const Duration(milliseconds: 200),
                        child: _textController.text.trim().isNotEmpty
                            ? Container(
                                key: const ValueKey('sendBtn'),
                                decoration: const BoxDecoration(
                                  color: AppColors.primary,
                                  shape: BoxShape.circle,
                                ),
                                child: IconButton(
                                  icon: const Icon(
                                    Icons.send_rounded,
                                    color: Colors.white,
                                  ),
                                  onPressed: _isAiTyping
                                      ? null
                                      : () =>
                                            _sendMessage(_textController.text),
                                ),
                              )
                            : (_isOffline
                                  ? const SizedBox.shrink()
                                  : Container(
                                      key: ValueKey(
                                        isMicActive
                                            ? 'stopMicBtn'
                                            : (isBusy
                                                  ? 'busyBtn'
                                                  : 'startMicBtn'),
                                      ),
                                      decoration: BoxDecoration(
                                        color: isBusy
                                            ? Colors.grey.shade300
                                            : (isMicActive
                                                  ? Colors.red.shade50
                                                  : AppColors.primary
                                                        .withValues(
                                                          alpha: 0.1,
                                                        )),
                                        shape: BoxShape.circle,
                                      ),
                                      child: IconButton(
                                        icon: isBusy
                                            ? const SizedBox(
                                                width: 24,
                                                height: 24,
                                                child:
                                                    CircularProgressIndicator(
                                                      strokeWidth: 2,
                                                    ),
                                              )
                                            : Icon(
                                                isMicActive
                                                    ? Icons.stop_rounded
                                                    : Icons.mic_rounded,
                                                color: isMicActive
                                                    ? Colors.red
                                                    : AppColors.primary,
                                              ),
                                        onPressed: isBusy
                                            ? null
                                            : _toggleRecording,
                                      ),
                                    )),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}

// ─── Dots typing indicator ─────────────────────────────────────────────────

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
