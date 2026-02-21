import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class QuizScreen extends StatefulWidget {
  const QuizScreen({super.key});

  @override
  State<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen> {
  int _currentQuestionIndex = 0;
  int? _selectedOptionIndex;
  bool _isFinished = false;

  final List<Map<String, dynamic>> _dummyQuestions = [
    {
      'question': 'How do you prefer to learn new concepts?',
      'options': [
        'By reading textbook explanations',
        'By watching video demonstrations',
        'By solving practical problems',
        'By listening to voice explanations',
      ],
    },
    {
      'question': 'What subject do you find the most challenging?',
      'options': [
        'Mathematics',
        'Science (Physics/Chemistry)',
        'Languages (English/Malayalam)',
        'History/Social Studies',
      ],
    },
    {
      'question': 'How much time can you spend studying every day?',
      'options': [
        'Less than 1 hour',
        '1 to 2 hours',
        '2 to 4 hours',
        'More than 4 hours',
      ],
    },
  ];

  void _nextQuestion() {
    if (_selectedOptionIndex == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Please select an option')));
      return;
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
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isFinished) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.check_circle_outline,
                  size: 100,
                  color: AppColors.success,
                ),
                const SizedBox(height: 24),
                Text(
                  'Analysis Complete!',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppColors.primaryDark,
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Your AI Tutor has analyzed your learning style and will customize your syllabus accordingly.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 16, color: Colors.black54),
                ),
                const SizedBox(height: 48),
                ElevatedButton.icon(
                  onPressed: _retakeQuiz,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Update Preferences'),
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
        automaticallyImplyLeading: false,
        title: const Text(
          'Student Profile Analysis',
          style: TextStyle(
            fontWeight: FontWeight.w800,
            fontSize: 22,
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
                    ? 'Finish'
                    : 'Next Question',
              ),
            ),
          ],
        ),
      ),
    );
  }
}
