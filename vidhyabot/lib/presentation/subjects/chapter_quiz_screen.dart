import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../data/models/subject_model.dart';

class ChapterQuizScreen extends StatefulWidget {
  final ChapterModel chapter;

  const ChapterQuizScreen({super.key, required this.chapter});

  @override
  State<ChapterQuizScreen> createState() => _ChapterQuizScreenState();
}

class _ChapterQuizScreenState extends State<ChapterQuizScreen> {
  int _currentQuestionIndex = 0;
  int? _selectedOptionIndex;
  bool _isFinished = false;
  int _score = 0;

  // Generic dummy questions that apply to the given chapter
  late final List<Map<String, dynamic>> _dummyQuestions;

  @override
  void initState() {
    super.initState();
    // In a real app, these questions would come from the ChapterModel or an API
    _dummyQuestions = [
      {
        'question': 'What is the main objective of ${widget.chapter.title}?',
        'options': [
          'To understand the core concepts',
          'To memorize dates',
          'To write essays',
          'To skip to the next chapter',
        ],
        'answerIndex': 0, // 'To understand the core concepts'
      },
      {
        'question':
            'Which of the following is a key topic in ${widget.chapter.title}?',
        'options': [
          'Subject matter A',
          'Topic B as introduced in the text',
          'Irrelevant concept C',
          'None of the above',
        ],
        'answerIndex': 1,
      },
      {
        'question': 'How does ${widget.chapter.title} apply to real life?',
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

  void _nextQuestion() {
    if (_selectedOptionIndex == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Please select an option')));
      return;
    }

    if (_selectedOptionIndex ==
        _dummyQuestions[_currentQuestionIndex]['answerIndex']) {
      _score++;
    }

    if (_currentQuestionIndex < _dummyQuestions.length - 1) {
      setState(() {
        _currentQuestionIndex++;
        _selectedOptionIndex = null;
      });
    } else {
      setState(() {
        _isFinished = true;
      });
    }
  }

  void _retakeQuiz() {
    setState(() {
      _currentQuestionIndex = 0;
      _selectedOptionIndex = null;
      _isFinished = false;
      _score = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isFinished) {
      final double percentage = _score / _dummyQuestions.length;
      final bool passed = percentage >= 0.5;

      return Scaffold(
        appBar: AppBar(
          automaticallyImplyLeading:
              false, // Clean UI without back arrow as requested
          title: const Text(
            'Quiz Results',
            style: TextStyle(fontWeight: FontWeight.w800),
          ),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  passed ? Icons.emoji_events : Icons.sentiment_dissatisfied,
                  size: 100,
                  color: passed ? AppColors.success : AppColors.error,
                ),
                const SizedBox(height: 24),
                Text(
                  'Score: $_score / ${_dummyQuestions.length}',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppColors.primaryDark,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  passed
                      ? 'Great job! You have a good understanding of ${widget.chapter.title}.'
                      : 'You might want to review ${widget.chapter.title} again.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 16, color: Colors.black54),
                ),
                const SizedBox(height: 48),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    ElevatedButton.icon(
                      onPressed: _retakeQuiz,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Retake Quiz'),
                    ),
                    const SizedBox(width: 16),
                    OutlinedButton(
                      // We must use pop since we removed automaticallyImplyLeading
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Back to Chapter'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      );
    }

    final questionData = _dummyQuestions[_currentQuestionIndex];

    return Scaffold(
      appBar: AppBar(
        // Retain standard style, but we need a back button if they want to exit mid-quiz
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Quiz: ${widget.chapter.title}',
          style: const TextStyle(
            fontWeight: FontWeight.w800,
            fontSize: 20,
            letterSpacing: -0.5,
          ),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Progress Bar
            LinearProgressIndicator(
              value: (_currentQuestionIndex + 1) / _dummyQuestions.length,
              backgroundColor: AppColors.primaryLight.withOpacity(0.2),
              color: AppColors.primary,
              minHeight: 8,
              borderRadius: BorderRadius.circular(4),
            ),
            const SizedBox(height: 32),

            // Question Box
            Text(
              'Question ${_currentQuestionIndex + 1} of ${_dummyQuestions.length}',
              style: TextStyle(
                color: Colors.grey.shade600,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              questionData['question'],
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
                color: AppColors.onSurface,
              ),
            ),
            const SizedBox(height: 32),

            // Options
            Expanded(
              child: ListView.separated(
                itemCount: (questionData['options'] as List<String>).length,
                separatorBuilder: (context, index) =>
                    const SizedBox(height: 16),
                itemBuilder: (context, index) {
                  final option = questionData['options'][index];
                  final isSelected = _selectedOptionIndex == index;

                  return InkWell(
                    onTap: () {
                      setState(() {
                        _selectedOptionIndex = index;
                      });
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      decoration: BoxDecoration(
                        color: isSelected
                            ? AppColors.primaryLight.withOpacity(0.1)
                            : AppColors.surface,
                        border: Border.all(
                          color: isSelected
                              ? AppColors.primary
                              : Colors.grey.shade300,
                          width: isSelected ? 2 : 1,
                        ),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      padding: const EdgeInsets.all(20),
                      child: Row(
                        children: [
                          Icon(
                            isSelected
                                ? Icons.radio_button_checked
                                : Icons.radio_button_unchecked,
                            color: isSelected ? AppColors.primary : Colors.grey,
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Text(
                              option,
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: isSelected
                                    ? FontWeight.bold
                                    : FontWeight.normal,
                                color: isSelected
                                    ? AppColors.primaryDark
                                    : AppColors.onSurface,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),

            // Next Button
            ElevatedButton(
              onPressed: _nextQuestion,
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: Text(
                _currentQuestionIndex == _dummyQuestions.length - 1
                    ? 'Finish Quiz'
                    : 'Next Question',
              ),
            ),
          ],
        ),
      ),
    );
  }
}
