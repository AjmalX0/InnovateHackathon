import 'dart:async';
import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../../core/constants/app_colors.dart';
import '../../core/services/app_session.dart';
import '../../core/services/chat_service.dart';
import '../../core/services/teaching_service.dart';
import '../../core/services/text_to_speech_service.dart';
import '../../core/utils/error_handler.dart';
import 'ask_doubt_screen.dart';
import 'chapter_quiz_screen.dart';

class ChapterDetailsScreen extends StatelessWidget {
  final String chapterSlug;
  final String chapterTitle;
  final String subjectName;
  final int grade;

  const ChapterDetailsScreen({
    super.key,
    required this.chapterSlug,
    required this.chapterTitle,
    required this.subjectName,
    required this.grade,
  });

  /// Opens the real-time AI learning bottom sheet.
  void _startLearning(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => _LearningSheet(
        chapterSlug: chapterSlug,
        chapterTitle: chapterTitle,
        subjectName: subjectName,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: Text(
          chapterTitle,
          style: const TextStyle(
            fontWeight: FontWeight.w800,
            fontSize: 22,
            letterSpacing: -0.5,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header Card
            Card(
              elevation: 4,
              shadowColor: AppColors.primary.withOpacity(0.2),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  gradient: const LinearGradient(
                    colors: [AppColors.primary, AppColors.primaryLight],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    Text(
                      subjectName,
                      style: const TextStyle(
                        color: Colors.white70,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1.2,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      chapterTitle,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 48),

            Text(
              'How would you like to proceed?',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: AppColors.onSurface,
              ),
            ),
            const SizedBox(height: 24),

            Row(
              children: [
                Expanded(
                  child: _ActionCard(
                    icon: Icons.menu_book_rounded,
                    title: 'Learn',
                    subtitle: 'Full chapter',
                    color: AppColors.primary,
                    onTap: () => _startLearning(context),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _ActionCard(
                    icon: Icons.help_outline_rounded,
                    title: 'Doubt',
                    subtitle: 'Ask AI tutor',
                    color: AppColors.secondaryDark,
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => AskDoubtScreen(
                            chapterTitle: chapterTitle,
                            subjectName: subjectName,
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            _ActionCard(
              icon: Icons.quiz_outlined,
              title: 'Take Chapter Quiz',
              subtitle: 'Test your understanding',
              color: Colors.purple.shade700,
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) =>
                        ChapterQuizScreen(chapterTitle: chapterTitle),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Real-time Learning Sheet ──────────────────────────────────────────────

class _LearningSheet extends StatefulWidget {
  final String chapterSlug;
  final String chapterTitle;
  final String subjectName;

  const _LearningSheet({
    required this.chapterSlug,
    required this.chapterTitle,
    required this.subjectName,
  });

  @override
  State<_LearningSheet> createState() => _LearningSheetState();
}

class _LearningSheetState extends State<_LearningSheet> {
  final ScrollController _scroll = ScrollController();
  final TextToSpeechService _ttsService = TextToSpeechService();
  final ChatService _chatService = ChatService();

  TeachingSessionResponse? _response;
  bool _isLoading = true;
  bool _isSpeaking = false;
  bool _isTtsReady = false;
  String? _error;

  String _selectedLanguage = 'en';
  String _simplifiedText = '';
  StreamSubscription<String>? _simplifySub;
  bool _isSimplifying = false;

  @override
  void initState() {
    super.initState();
    _chatService.init();
    _initTts();
    _startSession();
  }

  void _initTts() async {
    _isTtsReady = await _ttsService.initialize();
    _ttsService.onSpeakingChanged = (speaking) {
      if (mounted) {
        setState(() {
          _isSpeaking = speaking;
        });
      }
    };
    if (mounted) setState(() {});
  }

  Future<void> _startSession() async {
    setState(() {
      _isLoading = true;
      _error = null;
      _response = null;
      _simplifiedText = '';
      _isSimplifying = false;
    });

    try {
      final studentId = AppSession.instance.studentId ?? 'guest';
      final res = await TeachingService.instance.startSession(
        studentId: studentId,
        subject: widget.subjectName.toLowerCase(),
        chapter: widget.chapterSlug,
      );

      if (mounted) {
        setState(() {
          _response = res;
          _isLoading = false;
        });
        _runSimplification();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = ErrorHandler.getUserMessage(e);
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _runSimplification({String? explicitPrompt}) async {
    if (_response == null) return;

    await _ttsService.stop();
    setState(() => _isSpeaking = false);

    _simplifySub?.cancel();
    setState(() {
      _simplifiedText = '';
      _isSimplifying = true;
    });

    final rawLesson =
        explicitPrompt ??
        '''
      Introduction: ${_response!.introduction}
      Explanation: ${_response!.mainExplanation}
      Summary: ${_response!.summary}
      Follow-up: ${_response!.followUpQuestion}
    ''';

    final grade = AppSession.instance.studentGrade ?? 10;
    final connectivityResult = await Connectivity().checkConnectivity();
    final isOnline = !connectivityResult.contains(ConnectivityResult.none);

    _simplifySub = _chatService
        .simplifyLesson(
          rawLesson,
          targetLanguage: _selectedLanguage,
          grade: grade,
          isOnline: isOnline,
        )
        .listen(
          (chunk) {
            if (mounted) setState(() => _simplifiedText += chunk);
          },
          onDone: () {
            if (mounted) setState(() => _isSimplifying = false);
          },
          onError: (e) {
            if (mounted) {
              setState(() {
                _simplifiedText += '\n\nError: $e';
                _isSimplifying = false;
              });
            }
          },
        );
  }

  void _runDeeperSimplification() {
    if (_isSimplifying || _simplifiedText.isEmpty) return;
    final currentText = _simplifiedText;
    final prompt =
        "Please simplify the following explanation even further. Use extremely simple words, short sentences, and a very relatable analogy if possible:\n\n$currentText";
    _runSimplification(explicitPrompt: prompt);
  }

  @override
  void dispose() {
    _simplifySub?.cancel();
    _chatService.dispose();
    _ttsService.stop();
    _ttsService.dispose();
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final double sh = MediaQuery.of(context).size.height;
    return Container(
      height: sh * 0.75,
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // drag handle
          Center(
            child: Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight.withValues(alpha: 0.2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.school_rounded,
                  color: AppColors.primaryDark,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Learning: ${widget.chapterTitle}',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: AppColors.primaryDark,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      widget.subjectName,
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              // Language Toggle
              Container(
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.grey.shade300),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _buildLangBtn('EN', 'en'),
                    _buildLangBtn('മല', 'ml'),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(height: 1),
          const SizedBox(height: 16),

          // Content Area
          Expanded(child: _buildContentArea()),

          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            child: const Text('Close Session', style: TextStyle(fontSize: 16)),
          ),
        ],
      ),
    );
  }

  Widget _buildContentArea() {
    if (_isLoading) {
      return Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(),
          const SizedBox(height: 24),
          Text(
            'AI Tutor is preparing your lesson...',
            style: TextStyle(
              color: Colors.grey.shade600,
              fontSize: 15,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      );
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, color: AppColors.error, size: 48),
            const SizedBox(height: 16),
            Text(
              'Failed to load session',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.error),
            ),
            const SizedBox(height: 24),
            OutlinedButton.icon(
              onPressed: () {
                _startSession();
              },
              icon: const Icon(Icons.refresh),
              label: const Text('Try Again'),
            ),
          ],
        ),
      );
    }

    if (_response == null) {
      return const Center(child: Text('No content available.'));
    }

    final res = _response!;

    return ListView(
      controller: _scroll,
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 24, top: 4),
      children: [
        if (res.fromCache && !_isSimplifying)
          Align(
            alignment: Alignment.centerRight,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.green.shade200),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.bolt, size: 14, color: Colors.green),
                  SizedBox(width: 4),
                  Text(
                    'Loaded instantly',
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.green,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
        if (_isTtsReady)
          Padding(
            padding: const EdgeInsets.only(bottom: 16.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                if (_isSimplifying) ...[
                  Row(
                    children: [
                      const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Simplifying for Grade ${AppSession.instance.studentGrade ?? 10}...',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ],
                  ),
                ] else
                  const SizedBox(),
                GestureDetector(
                  onTap: _isSimplifying
                      ? null
                      : () async {
                          if (_isSpeaking) {
                            await _ttsService.stop();
                          } else {
                            await _ttsService.speakAuto(_simplifiedText);
                          }
                        },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: _isSimplifying
                          ? Colors.grey.shade100
                          : _isSpeaking
                          ? AppColors.primary.withValues(alpha: 0.12)
                          : Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: _isSimplifying
                            ? Colors.transparent
                            : _isSpeaking
                            ? AppColors.primary.withValues(alpha: 0.4)
                            : Colors.transparent,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          _isSpeaking
                              ? Icons.stop_rounded
                              : Icons.volume_up_rounded,
                          size: 18,
                          color: _isSimplifying
                              ? Colors.grey.shade400
                              : _isSpeaking
                              ? AppColors.primary
                              : Colors.grey.shade700,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          _isSpeaking ? 'Stop' : 'Listen',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: _isSimplifying
                                ? Colors.grey.shade400
                                : _isSpeaking
                                ? AppColors.primary
                                : Colors.grey.shade700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                // Simplify Button
                if (!_isSimplifying && _simplifiedText.isNotEmpty) ...[
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: _runDeeperSimplification,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.grey.shade300),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.auto_awesome,
                            size: 18,
                            color: Colors.grey.shade700,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            'Simplify',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: Colors.grey.shade700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Text(
            _simplifiedText.isEmpty ? 'Generating...' : _simplifiedText,
            style: const TextStyle(
              fontSize: 16,
              height: 1.6,
              color: Colors.black87,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildLangBtn(String label, String code) {
    final isSelected = _selectedLanguage == code;
    return GestureDetector(
      onTap: () {
        if (!isSelected && !_isSimplifying) {
          setState(() => _selectedLanguage = code);
          _runSimplification();
        }
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: isSelected ? Colors.white : Colors.grey.shade600,
          ),
        ),
      ),
    );
  }
}

// ─── Action Card ──────────────────────────────────────────────────────────

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _ActionCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            color: color.withOpacity(0.05),
            border: Border.all(color: color.withOpacity(0.2), width: 2),
          ),
          padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
          child: Column(
            children: [
              Icon(icon, size: 48, color: color),
              const SizedBox(height: 16),
              Text(
                title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                subtitle,
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey.shade700, fontSize: 12),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
