import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/services/app_session.dart';
import '../../core/services/socket_service.dart';
import '../../data/models/subject_model.dart';
import 'ask_doubt_screen.dart';
import 'chapter_quiz_screen.dart';

class ChapterDetailsScreen extends StatelessWidget {
  final ChapterModel chapter;
  final String subjectName;

  const ChapterDetailsScreen({
    super.key,
    required this.chapter,
    required this.subjectName,
  });

  /// Opens the real-time AI learning bottom sheet.
  void _startLearning(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) =>
          _LearningSheet(chapter: chapter, subjectName: subjectName),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: Text(
          chapter.title,
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
                      chapter.title,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      chapter.description,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.white),
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
                            chapterTitle: chapter.title,
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
                    builder: (_) => ChapterQuizScreen(chapter: chapter),
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
  final ChapterModel chapter;
  final String subjectName;

  const _LearningSheet({required this.chapter, required this.subjectName});

  @override
  State<_LearningSheet> createState() => _LearningSheetState();
}

class _LearningSheetState extends State<_LearningSheet> {
  final ScrollController _scroll = ScrollController();
  final StringBuffer _content = StringBuffer();
  StreamSubscription<String>? _sub;
  bool _isStreaming = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _startStream();
  }

  void _startStream() {
    final studentId = AppSession.instance.studentId ?? 'guest';
    final stream = SocketService.instance.startLearning(
      studentId: studentId,
      subject: widget.subjectName.toLowerCase(),
      chapter: widget.chapter.title.toLowerCase().replaceAll(' ', '-'),
    );

    _sub = stream.listen(
      (token) {
        if (!mounted) return;
        setState(() => _content.write(token));
        _scrollToBottom();
      },
      onError: (e) {
        if (!mounted) return;
        setState(() {
          _isStreaming = false;
          _error = e.toString();
        });
      },
      onDone: () {
        if (mounted) setState(() => _isStreaming = false);
      },
    );
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
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
          Text(
            'Learning: ${widget.chapter.title}',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
              color: AppColors.primaryDark,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            widget.subjectName,
            style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
          ),
          const Divider(height: 24),
          // content area
          Expanded(
            child: _error != null
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.error_outline,
                          color: AppColors.error,
                          size: 40,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: AppColors.error),
                        ),
                      ],
                    ),
                  )
                : ListView(
                    controller: _scroll,
                    children: [
                      Text(
                        _content.toString(),
                        style: const TextStyle(fontSize: 15, height: 1.6),
                      ),
                      if (_isStreaming) ...[
                        const SizedBox(height: 12),
                        const LinearProgressIndicator(),
                        const SizedBox(height: 4),
                        Text(
                          '✦ AI Tutor is explaining...',
                          style: TextStyle(
                            color: Colors.grey.shade500,
                            fontSize: 12,
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      ],
                    ],
                  ),
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
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
