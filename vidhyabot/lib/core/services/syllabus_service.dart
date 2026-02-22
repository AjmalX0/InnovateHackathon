import 'package:dio/dio.dart';
import '../constants/api_constants.dart';

/// Model for a syllabus search chunk.
class SyllabusChunk {
  final String id;
  final String chapter;
  final int chunkOrder;
  final String content;

  SyllabusChunk({
    required this.id,
    required this.chapter,
    required this.chunkOrder,
    required this.content,
  });

  factory SyllabusChunk.fromJson(Map<String, dynamic> json) {
    return SyllabusChunk(
      id: json['id'] as String? ?? '',
      chapter: json['chapter'] as String? ?? '',
      chunkOrder: json['chunk_order'] as int? ?? 0,
      content: json['content'] as String? ?? '',
    );
  }
}

/// Fetches syllabus data (subjects & chapters) from the backend.
class SyllabusService {
  SyllabusService._();
  static final SyllabusService instance = SyllabusService._();

  final Dio _dio = Dio(
    BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
    ),
  );

  // ─── Subjects ─────────────────────────────────────────────────────────────

  /// Returns list of subject name strings for [grade], e.g. ["mathematics","science"].
  Future<List<String>> getSubjects(int grade) async {
    final response = await _dio.get<Map<String, dynamic>>(
      ApiConstants.syllabusSubjects,
      queryParameters: {'grade': grade},
    );
    final data = response.data!;
    final list = data['subjects'];
    if (list is List) {
      return list.map((e) => e.toString()).toList();
    }
    return [];
  }

  // ─── Chapters ─────────────────────────────────────────────────────────────

  /// Returns list of chapter slug strings for [grade] + [subject],
  /// e.g. ["chapter-1-life-processes", "chapter-2-control-coordination"].
  Future<List<String>> getChapters(int grade, String subject) async {
    final response = await _dio.get<Map<String, dynamic>>(
      ApiConstants.syllabusChapters,
      queryParameters: {'grade': grade, 'subject': subject},
    );
    final data = response.data!;
    final list = data['chapters'];
    if (list is List) {
      return list.map((e) => e.toString()).toList();
    }
    return [];
  }

  // ─── Semantic Search ──────────────────────────────────────────────────────

  /// Runs a vector similarity search against stored chunks.
  /// Used to debug RAG retrieval quality or provide raw context.
  Future<List<SyllabusChunk>> searchSyllabus({
    required String query,
    required int grade,
    required String subject,
    int limit = 3,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      ApiConstants.syllabusSearch,
      queryParameters: {
        'query': query,
        'grade': grade,
        'subject': subject,
        'limit': limit,
      },
    );
    final data = response.data!;
    final list = data['results'];
    if (list is List) {
      return list
          .map((e) => SyllabusChunk.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /// Converts a slug like "chapter-1-life-processes" to "Life Processes"
  static String slugToTitle(String slug) {
    // Remove leading "chapter-N-" prefix if present
    final withoutPrefix = slug.replaceFirst(RegExp(r'^chapter-\d+-'), '');
    return withoutPrefix
        .split('-')
        .map((w) => w.isEmpty ? '' : '${w[0].toUpperCase()}${w.substring(1)}')
        .join(' ');
  }

  /// Maps a subject name to a Material icon name string.
  static String subjectToIcon(String subject) {
    switch (subject.toLowerCase()) {
      case 'mathematics':
      case 'maths':
        return 'calculate';
      case 'science':
      case 'physics':
      case 'chemistry':
        return 'science';
      case 'history':
      case 'social science':
      case 'social studies':
        return 'history_edu';
      case 'english':
      case 'language':
        return 'menu_book';
      default:
        return 'book';
    }
  }
}
