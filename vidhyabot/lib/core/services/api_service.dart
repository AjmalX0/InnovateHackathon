import 'package:dio/dio.dart';
import '../constants/api_constants.dart';

/// Dio-based REST client for the VidyaBot backend.
class ApiService {
  ApiService._()
    : _dio = Dio(
        BaseOptions(
          baseUrl: ApiConstants.baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 20),
          headers: {'Content-Type': 'application/json'},
        ),
      );

  static final ApiService instance = ApiService._();

  final Dio _dio;

  // ─── Student ───────────────────────────────────────────────────────────────

  /// Creates a new student profile.
  /// Body: { name: string, grade: int (1–12) }
  /// Returns the assigned student UUID.
  Future<String> createStudent({
    required String name,
    required int grade,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      ApiConstants.students,
      data: {'name': name, 'grade': grade},
    );
    final data = response.data!;
    // Response: { id, name, grade, capability_score, last_active }
    final id = data['id'] ?? data['studentId'] ?? '';
    return id.toString();
  }

  /// Fetches an existing student profile by ID.
  Future<Map<String, dynamic>> getStudent(String id) async {
    final response = await _dio.get<Map<String, dynamic>>(
      ApiConstants.student(id),
    );
    return response.data!;
  }

  // ─── Teaching Session (HTTP alternative) ───────────────────────────────────

  /// Starts a teaching session via HTTP (alternative to WebSocket).
  Future<Map<String, dynamic>> startTeachingSession({
    required String studentId,
    required String subject,
    required String chapter,
  }) async {
    final response = await _dio.post<Map<String, dynamic>>(
      ApiConstants.sessionsStart,
      data: {'studentId': studentId, 'subject': subject, 'chapter': chapter},
    );
    return response.data!;
  }
}
