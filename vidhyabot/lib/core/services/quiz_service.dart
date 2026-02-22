import 'package:dio/dio.dart';
import '../constants/api_constants.dart';

class QuizQuestion {
  final String id;
  final String questionText;
  final List<String> options;
  final String explanation;

  QuizQuestion({
    required this.id,
    required this.questionText,
    required this.options,
    required this.explanation,
  });

  factory QuizQuestion.fromJson(Map<String, dynamic> json) {
    return QuizQuestion(
      id: json['id'] as String? ?? '',
      questionText: json['question_text'] as String? ?? '',
      options:
          (json['options'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      explanation: json['explanation'] as String? ?? '',
    );
  }
}

class QuizData {
  final String id;
  final String studentId;
  final String topic;
  final DateTime? createdAt;
  final List<QuizQuestion> questions;

  QuizData({
    required this.id,
    required this.studentId,
    required this.topic,
    required this.createdAt,
    required this.questions,
  });

  factory QuizData.fromJson(Map<String, dynamic> json) {
    return QuizData(
      id: json['id'] as String? ?? '',
      studentId: json['student_id'] as String? ?? '',
      topic: json['topic'] as String? ?? '',
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'])
          : null,
      questions:
          (json['questions'] as List<dynamic>?)
              ?.map((q) => QuizQuestion.fromJson(q as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class QuizSubmissionResultItem {
  final String questionId;
  final bool isCorrect;
  final int correctIndex;
  final int studentIndex;
  final String explanation;

  QuizSubmissionResultItem({
    required this.questionId,
    required this.isCorrect,
    required this.correctIndex,
    required this.studentIndex,
    required this.explanation,
  });

  factory QuizSubmissionResultItem.fromJson(Map<String, dynamic> json) {
    return QuizSubmissionResultItem(
      questionId: json['question_id'] as String? ?? '',
      isCorrect: json['is_correct'] as bool? ?? false,
      correctIndex: json['correct_index'] as int? ?? -1,
      studentIndex: json['student_index'] as int? ?? -1,
      explanation: json['explanation'] as String? ?? '',
    );
  }
}

class QuizSubmissionResponse {
  final String attemptId;
  final double score;
  final List<QuizSubmissionResultItem> results;

  QuizSubmissionResponse({
    required this.attemptId,
    required this.score,
    required this.results,
  });

  factory QuizSubmissionResponse.fromJson(Map<String, dynamic> json) {
    return QuizSubmissionResponse(
      attemptId: json['attempt_id'] as String? ?? '',
      score: (json['score'] as num?)?.toDouble() ?? 0.0,
      results:
          (json['results'] as List<dynamic>?)
              ?.map(
                (e) => QuizSubmissionResultItem.fromJson(
                  e as Map<String, dynamic>,
                ),
              )
              .toList() ??
          [],
    );
  }
}

class QuizService {
  QuizService._();
  static final QuizService instance = QuizService._();

  final Dio _dio = Dio(
    BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: const Duration(seconds: 45),
      receiveTimeout: const Duration(seconds: 45),
    ),
  );

  /// Retrieves a previously generated quiz by ID (without correct answers).
  Future<QuizData> getQuiz(String quizId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/quizzes/$quizId');

      if (response.data == null) {
        throw Exception('Received empty response from get quiz.');
      }
      return QuizData.fromJson(response.data!);
    } on DioException catch (e) {
      if (e.response?.data != null && e.response?.data is Map) {
        final errorMsg =
            e.response?.data['error'] ?? e.response?.data['message'];
        if (errorMsg != null) {
          throw Exception('Backend Error: $errorMsg');
        }
      }
      rethrow;
    }
  }

  /// Submits answers to a quiz and returns the graded [QuizSubmissionResponse].
  Future<QuizSubmissionResponse> submitQuiz(
    String quizId,
    String studentId,
    List<Map<String, dynamic>> answers,
  ) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiConstants.quizSubmit(quizId),
        data: {'studentId': studentId, 'answers': answers},
      );

      if (response.data == null) {
        throw Exception('Received empty response from submit quiz.');
      }
      return QuizSubmissionResponse.fromJson(response.data!);
    } on DioException catch (e) {
      if (e.response?.data != null && e.response?.data is Map) {
        final errorMsg =
            e.response?.data['error'] ?? e.response?.data['message'];
        if (errorMsg != null) {
          throw Exception('Backend Error: $errorMsg');
        }
      }
      rethrow;
    }
  }
}
