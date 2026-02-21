import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/model/student_create_request.dart';
import '../../core/services/student_service.dart';
import '../main/main_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _studentService = StudentService();

  String? _selectedClass;
  String? _selectedLanguage;
  bool _isSubmitting = false;

  final List<String> _classes = [
    'Class 8',
    'Class 9',
    'Class 10',
    'Class 11',
    'Class 12',
  ];
  final List<String> _languages = ['English', 'Malayalam', 'Manglish'];

  StudentGrade? _extractGrade(String classText) {
    final match = RegExp(r'\d+').firstMatch(classText);
    if (match == null) {
      return null;
    }

    final gradeValue = int.tryParse(match.group(0)!);
    if (gradeValue == null) {
      return null;
    }

    switch (gradeValue) {
      case 3:
        return StudentGrade.grade3;
      case 4:
        return StudentGrade.grade4;
      case 5:
        return StudentGrade.grade5;
      case 6:
        return StudentGrade.grade6;
      case 7:
        return StudentGrade.grade7;
      case 8:
        return StudentGrade.grade8;
      case 9:
        return StudentGrade.grade9;
      case 10:
        return StudentGrade.grade10;
      case 11:
        return StudentGrade.grade11;
      case 12:
        return StudentGrade.grade12;
      default:
        return null;
    }
  }

  StudentLanguage? _mapLanguageCode(String languageLabel) {
    switch (languageLabel) {
      case 'English':
        return StudentLanguage.english;
      case 'Malayalam':
        return StudentLanguage.malayalam;
      case 'Manglish':
        return StudentLanguage.manglish;
      default:
        return null;
    }
  }

  Future<void> _onLogin() async {
    if (_formKey.currentState!.validate()) {
      if (_selectedClass == null || _selectedLanguage == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Please select your class and preferred language'),
          ),
        );
        return;
      }

      final grade = _extractGrade(_selectedClass!);
      final languageCode = _mapLanguageCode(_selectedLanguage!);

      if (grade == null || languageCode == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Invalid class or language selection')),
        );
        return;
      }

      setState(() {
        _isSubmitting = true;
      });

      try {
        final request = StudentCreateRequest(
          name: _nameController.text.trim(),
          grade: grade,
          language: languageCode,
        );

        await _studentService.createStudent(request);

        if (!mounted) {
          return;
        }

        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const MainScreen()),
        );
      } catch (error) {
        if (!mounted) {
          return;
        }

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create student: $error')),
        );
      } finally {
        if (mounted) {
          setState(() {
            _isSubmitting = false;
          });
        }
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _studentService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Icon(
                    Icons.auto_stories_rounded,
                    size: 80,
                    color: AppColors.primary,
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Welcome to Vidhyabot',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: AppColors.primaryDark,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Your Personal AI Tutor',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: Colors.grey.shade600,
                    ),
                  ),
                  const SizedBox(height: 48),

                  // Name Field
                  TextFormField(
                    controller: _nameController,
                    decoration: const InputDecoration(
                      labelText: 'Your Name',
                      prefixIcon: Icon(Icons.person_outline),
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Please enter your name';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 20),

                  // Class Dropdown
                  DropdownButtonFormField<String>(
                    decoration: const InputDecoration(
                      labelText: 'Select Class',
                      prefixIcon: Icon(Icons.school_outlined),
                    ),
                    initialValue: _selectedClass,
                    items: _classes.map((String value) {
                      return DropdownMenuItem<String>(
                        value: value,
                        child: Text(value),
                      );
                    }).toList(),
                    onChanged: (newValue) {
                      setState(() {
                        _selectedClass = newValue;
                      });
                    },
                  ),
                  const SizedBox(height: 20),

                  // Language Dropdown
                  DropdownButtonFormField<String>(
                    decoration: const InputDecoration(
                      labelText: 'Preferred Language',
                      prefixIcon: Icon(Icons.language_outlined),
                    ),
                    initialValue: _selectedLanguage,
                    items: _languages.map((String value) {
                      return DropdownMenuItem<String>(
                        value: value,
                        child: Text(value),
                      );
                    }).toList(),
                    onChanged: (newValue) {
                      setState(() {
                        _selectedLanguage = newValue;
                      });
                    },
                  ),
                  const SizedBox(height: 48),

                  ElevatedButton(
                    onPressed: _isSubmitting ? null : _onLogin,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      textStyle: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    child: _isSubmitting
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Start Learning'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
