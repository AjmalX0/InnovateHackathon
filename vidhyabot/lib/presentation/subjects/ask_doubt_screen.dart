import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';

import '../../core/services/chat_service.dart';
import '../../core/services/udp_stt_service.dart';
import '../../core/services/text_to_speech_service.dart';

enum DoubtLanguageOption { english, malayalam, autoDetect }

class AskDoubtScreen extends StatefulWidget {
  const AskDoubtScreen({super.key, required this.chapterTitle});

  final String chapterTitle;

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
  late final ChatService _chatService;

  final List<ChatMessage> _messages = [];

  String? _errorMessage;
  bool _isTtsReady = false;
  bool _isSpeechReady = false;
  bool _isTranscribing = false;
  bool _isInitializing = true;
  bool _isOffline = false;
  bool _isAiTyping = false;

  late StreamSubscription<List<ConnectivityResult>> _connectivitySubscription;

  String _hintText = 'Type a message...';

  void _log(String message) {
    debugPrint('[AskDoubtScreen] $message');
  }

  @override
  void initState() {
    super.initState();

    _chatService = ChatService(contextHint: 'Chapter: ${widget.chapterTitle}');
    _chatService.onProgressChanged = () {
      if (mounted) setState(() {});
    };
    _chatService.init();

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
            _toggleRecording(); // auto-stop mic if offline
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

  void _onTextChanged() {
    setState(() {});
  }

  Future<void> _initializeEngines() async {
    _log('Initializing speech and TTS engines');
    _isTtsReady = await _ttsService.initialize();

    try {
      _isSpeechReady = await _sttService.initialize();
      _log('Engine init result -> TTS: $_isTtsReady, STT: $_isSpeechReady');

      if (mounted) {
        setState(() {
          _isInitializing = false;
        });
      }
    } catch (error) {
      _log('Initialization exception: $error');
      if (!mounted) return;
      setState(() {
        _isInitializing = false;
      });
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
      // Placeholder AI message that we'll fill token by token
      _messages.add(ChatMessage(text: '', isUser: false));
      _isAiTyping = true;
    });

    _scrollToBottom();

    final aiIndex = _messages.length - 1;

    try {
      await for (final token in _chatService.sendMessage(
        text.trim(),
        isOnline: !_isOffline,
      )) {
        if (!mounted) break;
        setState(() {
          _messages[aiIndex] = ChatMessage(
            text: _messages[aiIndex].text + token,
            isUser: false,
          );
        });
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _messages[aiIndex] = ChatMessage(text: 'Error: $e', isUser: false);
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isAiTyping = false;
        });
      }
    }
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
          setState(() {
            _errorMessage = 'Microphone permission denied.';
          });
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
        _log('Listening started successfully');
      } catch (error) {
        _log('Start listening failed: $error');
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
    _textController.removeListener(_onTextChanged);
    _textController.dispose();
    _scrollController.dispose();
    _ttsService.dispose();
    _sttService.dispose();
    _chatService.dispose();
    super.dispose();
  }

  Widget _buildChatBubble(ChatMessage message) {
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
            child: message.text.isEmpty && _isAiTyping
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
                      height: 20,
                      child: _TypingIndicator(),
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
                        color: message.isUser ? Colors.white : Colors.black87,
                        fontSize: 15,
                        height: 1.5,
                      ),
                    ),
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
                // Download progress banner
                if (_chatService.isDownloading)
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
                          _chatService.downloadStatus,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.primaryDark,
                          ),
                        ),
                        const SizedBox(height: 4),
                        LinearProgressIndicator(
                          value: _chatService.downloadProgress > 0
                              ? _chatService.downloadProgress
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
                    itemBuilder: (context, index) {
                      return _buildChatBubble(_messages[index]);
                    },
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
                            ? '⚙ Local AI is thinking...'
                            : '✦ Gemini is writing...',
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

/// Simple three-dot typing animation shown while AI streams its first tokens.
class _TypingIndicator extends StatefulWidget {
  const _TypingIndicator();

  @override
  State<_TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<_TypingIndicator>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (_, __) {
        final phase = (_controller.value * 3).floor();
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (i) {
            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 2),
              width: 7,
              height: 7,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(
                  alpha: phase == i ? 0.9 : 0.3,
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
