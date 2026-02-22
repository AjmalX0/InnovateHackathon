import 'dart:async';
import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

import '../../core/constants/app_colors.dart';
import '../../core/services/chat_service.dart';
import '../../core/services/text_to_speech_service.dart';
import '../../core/utils/error_handler.dart';

class _ChatMessage {
  final String text;
  final bool isUser;
  _ChatMessage({required this.text, required this.isUser});
}

/// General-purpose AI Chat screen powered by Gemini (online) and
/// the local Qwen2.5 model (offline) via [ChatService].
class AiChatScreen extends StatefulWidget {
  const AiChatScreen({super.key});

  @override
  State<AiChatScreen> createState() => _AiChatScreenState();
}

class _AiChatScreenState extends State<AiChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<_ChatMessage> _messages = [];
  final ChatService _chatService = ChatService();

  bool _isOnline = true;
  bool _isAiTyping = false;
  bool _ttsReady = false;
  int _speakingIndex = -1;
  final TextToSpeechService _tts = TextToSpeechService();

  late final StreamSubscription<List<ConnectivityResult>> _connectivitySub;

  @override
  void initState() {
    super.initState();

    _chatService.onProgressChanged = () {
      if (mounted) setState(() {});
    };
    _chatService.init();

    // Initialise TTS
    _tts.initialize().then((ok) {
      if (mounted) setState(() => _ttsReady = ok);
    });
    _tts.onSpeakingChanged = (speaking) {
      if (mounted)
        setState(() {
          if (!speaking) _speakingIndex = -1;
        });
    };

    _controller.addListener(() => setState(() {}));

    _messages.add(
      _ChatMessage(
        text:
            "Hello! I'm your AI assistant. Ask me anything — I use Gemini when online and a local model when offline.",
        isUser: false,
      ),
    );

    _checkConnectivity();
    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) {
      if (mounted) {
        setState(() {
          _isOnline = !results.contains(ConnectivityResult.none);
        });
      }
    });
  }

  Future<void> _checkConnectivity() async {
    final results = await Connectivity().checkConnectivity();
    if (mounted) {
      setState(() {
        _isOnline = !results.contains(ConnectivityResult.none);
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

  Future<void> _sendMessage() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _isAiTyping) return;

    setState(() {
      _messages.add(_ChatMessage(text: text, isUser: true));
      _messages.add(_ChatMessage(text: '', isUser: false));
      _isAiTyping = true;
      _controller.clear();
    });
    _scrollToBottom();

    final aiIndex = _messages.length - 1;

    try {
      await for (final token in _chatService.sendMessage(
        text,
        isOnline: _isOnline,
      )) {
        if (!mounted) break;
        setState(() {
          _messages[aiIndex] = _ChatMessage(
            text: _messages[aiIndex].text + token,
            isUser: false,
          );
        });
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _messages[aiIndex] = _ChatMessage(
            text: ErrorHandler.getUserMessage(e),
            isUser: false,
          );
        });
      }
    } finally {
      if (mounted) setState(() => _isAiTyping = false);
    }
  }

  @override
  void dispose() {
    _connectivitySub.cancel();
    _controller.dispose();
    _scrollController.dispose();
    _chatService.dispose();
    _tts.dispose();
    super.dispose();
  }

  Widget _buildBubble(_ChatMessage msg, int index) {
    final isUser = msg.isUser;
    final showTypingDots = !isUser && msg.text.isEmpty && _isAiTyping;
    final bool isThisSpeaking = _speakingIndex == index;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
      child: Row(
        mainAxisAlignment: isUser
            ? MainAxisAlignment.end
            : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isUser) ...[
            Container(
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.auto_awesome,
                size: 15,
                color: AppColors.primary,
              ),
            ),
          ],
          Flexible(
            child: Column(
              crossAxisAlignment: isUser
                  ? CrossAxisAlignment.end
                  : CrossAxisAlignment.start,
              children: [
                // ── Bubble ────────────────────────────────────────────
                Container(
                  constraints: BoxConstraints(
                    maxWidth: MediaQuery.of(context).size.width * 0.75,
                  ),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    color: isUser ? AppColors.primary : Colors.white,
                    border: Border.all(
                      color: isUser
                          ? AppColors.primaryDark.withValues(alpha: 0.5)
                          : Colors.grey.shade200,
                      width: 2,
                    ),
                    borderRadius: BorderRadius.circular(24).copyWith(
                      bottomLeft: isUser
                          ? const Radius.circular(24)
                          : const Radius.circular(8),
                      bottomRight: isUser
                          ? const Radius.circular(8)
                          : const Radius.circular(24),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: isUser
                            ? AppColors.primaryDark.withValues(alpha: 0.5)
                            : Colors.grey.shade200,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: showTypingDots
                      ? const _DotsIndicator()
                      : Text(
                          msg.text,
                          style: TextStyle(
                            color: isUser ? Colors.white : Colors.black87,
                            fontSize: 15,
                            height: 1.5,
                          ),
                        ),
                ),

                // ── Listen / Stop button (AI only) ─────────────────────
                if (!isUser && msg.text.isNotEmpty && _ttsReady)
                  Padding(
                    padding: const EdgeInsets.only(top: 5, left: 2),
                    child: GestureDetector(
                      onTap: () async {
                        if (isThisSpeaking) {
                          await _tts.stop();
                          if (mounted) setState(() => _speakingIndex = -1);
                        } else {
                          if (_speakingIndex != -1) await _tts.stop();
                          if (mounted) setState(() => _speakingIndex = index);
                          try {
                            await _tts.speakAuto(msg.text);
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
          if (isUser) ...[
            Container(
              margin: const EdgeInsets.only(left: 8),
              child: CircleAvatar(
                radius: 14,
                backgroundColor: AppColors.primary.withValues(alpha: 0.15),
                child: const Icon(
                  Icons.person,
                  size: 16,
                  color: AppColors.primary,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildInput() {
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
          Expanded(
            child: Container(
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(24),
              ),
              child: TextField(
                controller: _controller,
                minLines: 1,
                maxLines: 4,
                enabled: !_isAiTyping,
                onSubmitted: (_) => _sendMessage(),
                decoration: InputDecoration(
                  hintText: _isOnline
                      ? 'Message Gemini...'
                      : 'Message local AI...',
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
          AnimatedCrossFade(
            duration: const Duration(milliseconds: 200),
            crossFadeState: (_controller.text.trim().isNotEmpty && !_isAiTyping)
                ? CrossFadeState.showFirst
                : CrossFadeState.showSecond,
            firstChild: Container(
              decoration: const BoxDecoration(
                color: AppColors.primary,
                shape: BoxShape.circle,
              ),
              child: IconButton(
                icon: const Icon(Icons.send_rounded, color: Colors.white),
                onPressed: _sendMessage,
              ),
            ),
            secondChild: Container(
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.08),
                shape: BoxShape.circle,
              ),
              child: IconButton(
                icon: Icon(
                  Icons.send_rounded,
                  color: AppColors.primary.withValues(alpha: 0.4),
                ),
                onPressed: null,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        title: Column(
          mainAxisSize: MainAxisSize.min,
          children: const [
            Text(
              'AI Assistant',
              style: TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 22,
                color: Colors.black87,
                letterSpacing: -0.5,
              ),
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  _isOnline ? Icons.cloud_done : Icons.cloud_off,
                  size: 16,
                  color: _isOnline
                      ? Colors.green.shade700
                      : Colors.orange.shade700,
                ),
                const SizedBox(width: 4),
                Text(
                  _isOnline ? 'Online' : 'Offline',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: _isOnline
                        ? Colors.green.shade700
                        : Colors.orange.shade700,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Offline-model download banner
          if (_chatService.isDownloading)
            Container(
              width: double.infinity,
              color: AppColors.primaryLight.withValues(alpha: 0.15),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
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
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.only(top: 12, bottom: 8),
              itemCount: _messages.length,
              itemBuilder: (_, i) => _buildBubble(_messages[i], i),
            ),
          ),
          if (_isAiTyping)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  _isOnline
                      ? '✦ Gemini is writing...'
                      : '⚙ Local AI is thinking...',
                  style: const TextStyle(
                    fontStyle: FontStyle.italic,
                    color: Colors.grey,
                    fontSize: 12,
                  ),
                ),
              ),
            ),
          _buildInput(),
        ],
      ),
    );
  }
}

/// Animated three-dot indicator shown while AI sends its first token.
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
