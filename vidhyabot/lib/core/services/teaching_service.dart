import 'package:dio/dio.dart';
import '../constants/api_constants.dart';

class TeachingSessionResponse {
  final String blockId;
  final String subject;
  final String chapter;
  final int grade;
  final bool fromCache;
  final String introduction;
  final String mainExplanation;
  final String summary;
  final String followUpQuestion;

  TeachingSessionResponse({
    required this.blockId,
    required this.subject,
    required this.chapter,
    required this.grade,
    required this.fromCache,
    required this.introduction,
    required this.mainExplanation,
    required this.summary,
    required this.followUpQuestion,
  });

  factory TeachingSessionResponse.fromJson(Map<String, dynamic> json) {
    final content = json['content'] as Map<String, dynamic>? ?? {};
    return TeachingSessionResponse(
      blockId: json['blockId'] as String? ?? '',
      subject: json['subject'] as String? ?? '',
      chapter: json['chapter'] as String? ?? '',
      grade: json['grade'] as int? ?? 0,
      fromCache: json['fromCache'] as bool? ?? false,
      introduction: content['introduction'] as String? ?? '',
      mainExplanation: content['main_explanation'] as String? ?? '',
      summary: content['summary'] as String? ?? '',
      followUpQuestion: content['follow_up_question'] as String? ?? '',
    );
  }
}

class TeachingService {
  TeachingService._();
  static final TeachingService instance = TeachingService._();

  final Dio _dio = Dio(
    BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: const Duration(seconds: 45), // AI might take time
      receiveTimeout: const Duration(seconds: 45),
    ),
  );

  /// Starts an AI tutor session for a chosen subject + chapter.
  /// Returns a [TeachingSessionResponse] containing the structured lesson.
  Future<TeachingSessionResponse> startSession({
    required String studentId,
    required String subject,
    required String chapter,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        ApiConstants.teachingSession,
        data: {'studentId': studentId, 'subject': subject, 'chapter': chapter},
      );

      if (response.data == null) {
        throw Exception('Received empty response from teaching session.');
      }

      return TeachingSessionResponse.fromJson(response.data!);
    } on DioException catch (e) {
      print('=== DIO ERROR IN START SESSION ===');
      print('Status Code: ${e.response?.statusCode}');
      print('Response Data: ${e.response?.data}');
      print('Request Data: ${e.requestOptions.data}');
      print('==================================');
      if (e.response?.data != null && e.response?.data is Map) {
        final errorMsg =
            e.response?.data['error'] ?? e.response?.data['message'];
        if (errorMsg != null) {
          throw Exception('Backend Error: $errorMsg');
        }
      }
      rethrow;
    } catch (e) {
      print('=== GENERAL ERROR IN START SESSION ===');
      print(e);
      rethrow;
    }
  }
}
