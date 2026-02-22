import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/services/app_session.dart';
import '../widgets/bouncy_button.dart';

class ChapterQuizScreen extends StatefulWidget {
  final String chapterTitle;

  const ChapterQuizScreen({super.key, required this.chapterTitle});

  @override
  State<ChapterQuizScreen> createState() => _ChapterQuizScreenState();
}

class _ChapterQuizScreenState extends State<ChapterQuizScreen> {
  int _currentQuestionIndex = 0;
  int? _selectedOptionIndex;
  bool _isAnswerRevealed = false;
  int _score = 0;
  bool _quizCompleted = false;
  bool _pointsAwarded = false;

  late final List<Map<String, dynamic>> _dummyQuestions;

  @override
  void initState() {
    super.initState();
    _dummyQuestions = [
      {
        'question':
            'What is the primary purpose of learning ${widget.chapterTitle}?',
        'options': [
          'To understand the core concepts',
          'To memorize dates',
          'To write essays',
          'To skip to the next chapter',
        ],
        'answerIndex': 0,
      },
      {
        'question':
            'Which of the following is a key topic in ${widget.chapterTitle}?',
        'options': [
          'Subject matter A',
          'Topic B as introduced in the text',
          'Irrelevant concept C',
          'None of the above',
        ],
        'answerIndex': 1,
      },
      {
        'question': 'How does ${widget.chapterTitle} apply to real life?',
        'options': [
          'It doesn\'t',
          'Practical problem solving',
          'Only useful for exams',
          'Just theoretical knowledge',
        ],
        'answerIndex': 1,
      },
    ];
  }

  void _onOptionSelected(int index) {
    if (_isAnswerRevealed || _quizCompleted) return;

    setState(() {
      _selectedOptionIndex = index;
      _isAnswerRevealed = true;
      if (index == _dummyQuestions[_currentQuestionIndex]['answerIndex']) {
        _score++;
      }
    });

    // Auto-advance after showing the colors
    Future.delayed(const Duration(milliseconds: 1200), () {
      if (!mounted) return;
      if (_currentQuestionIndex < _dummyQuestions.length - 1) {
        setState(() {
          _currentQuestionIndex++;
          _selectedOptionIndex = null;
          _isAnswerRevealed = false;
        });
      } else {
        setState(() {
          _quizCompleted = true;
          _awardPointsIfPassed();
        });
      }
    });
  }

  void _awardPointsIfPassed() {
    final passed = _score >= (_dummyQuestions.length / 2);
    if (passed && !_pointsAwarded) {
      _pointsAwarded = true;
      AppSession.instance.addPoints(50);
    }
  }

  void _retakeQuiz() {
    setState(() {
      _currentQuestionIndex = 0;
      _selectedOptionIndex = null;
      _isAnswerRevealed = false;
      _score = 0;
      _quizCompleted = false;
      _pointsAwarded = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_quizCompleted) {
      final passed = _score >= (_dummyQuestions.length / 2);

      return Scaffold(
        backgroundColor: passed
            ? const Color(0xFFF0FDF4)
            : const Color(0xFFFEF2F2),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  passed
                      ? Icons.emoji_events_rounded
                      : Icons.sentiment_dissatisfied_rounded,
                  size: 100,
                  color: passed ? Colors.amber : Colors.grey,
                ),
                const SizedBox(height: 24),
                Text(
                  passed ? 'Awesome Job!' : 'Keep Trying!',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w900,
                    color: passed ? Colors.green.shade800 : Colors.red.shade800,
                    letterSpacing: -1,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Score: $_score / ${_dummyQuestions.length}',
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 24),

                if (passed)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 24,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade50,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: Colors.amber, width: 2),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.star_rounded, color: Colors.amber, size: 28),
                        SizedBox(width: 8),
                        Text(
                          '+50 Points!',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w900,
                            color: Colors.orange,
                          ),
                        ),
                      ],
                    ),
                  ),

                const SizedBox(height: 48),
                BouncyButton(
                  label: passed ? 'Back to Journey' : 'Try Again',
                  onTap: () {
                    if (passed) {
                      Navigator.pop(context);
                    } else {
                      _retakeQuiz();
                    }
                  },
                ),
                if (passed) ...[
                  const SizedBox(height: 16),
                  BouncyButton(
                    label: 'Retake Quiz',
                    isSecondary: true,
                    onTap: _retakeQuiz,
                  ),
                ],
              ],
            ),
          ),
        ),
      );
    }

    final questionData = _dummyQuestions[_currentQuestionIndex];
    final correctIndex = questionData['answerIndex'] as int;

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.close_rounded, size: 28),
          onPressed: () => Navigator.pop(context),
        ),
        title: LinearProgressIndicator(
          value: (_currentQuestionIndex + 1) / _dummyQuestions.length,
          backgroundColor: Colors.grey.shade300,
          color: AppColors.primary,
          minHeight: 12,
          borderRadius: BorderRadius.circular(6),
        ),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        toolbarHeight: 70, // Slightly taller for breathing room
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Question ${_currentQuestionIndex + 1} of ${_dummyQuestions.length}',
                style: const TextStyle(
                  color: AppColors.primary,
                  fontWeight: FontWeight.w900,
                  fontSize: 14,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 12),
              Expanded(
                flex: 2,
                child: SingleChildScrollView(
                  child: Text(
                    questionData['question'],
                    style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                      color: AppColors.primaryDark,
                      height: 1.3,
                      letterSpacing: -0.5,
                    ),
                  ),
                ),
              ),

              // Options
              Expanded(
                flex: 5,
                child: SingleChildScrollView(
                  child: Column(
                    children: (questionData['options'] as List<String>)
                        .asMap()
                        .entries
                        .map((entry) {
                          final index = entry.key;
                          final txt = entry.value;

                          final isSelected = _selectedOptionIndex == index;
                          final isCorrect = index == correctIndex;

                          bool isSecondary = true;
                          Color baseColor = AppColors.primary;
                          Color? outlineColor;

                          if (_isAnswerRevealed) {
                            if (isCorrect) {
                              isSecondary = false;
                              baseColor = const Color(0xFF43E97B); // Green
                            } else if (isSelected && !isCorrect) {
                              isSecondary = false;
                              baseColor = const Color(0xFFFF6B6B); // Red
                            }
                          } else if (isSelected) {
                            outlineColor = AppColors.primary;
                          }

                          return Padding(
                            padding: const EdgeInsets.only(bottom: 20.0),
                            child: BouncyButton(
                              label: txt,
                              isSecondary: isSecondary,
                              baseColor: baseColor,
                              outlineColor: outlineColor,
                              onTap: () => _onOptionSelected(index),
                            ),
                          );
                        })
                        .toList(),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
