import 'package:shared_preferences/shared_preferences.dart';

/// In-memory + persisted session state for the logged-in student.
///
/// Call [AppSession.load()] once at app startup to restore a previous session.
class AppSession {
  AppSession._();
  static final AppSession _instance = AppSession._();
  static AppSession get instance => _instance;

  static const _keyStudentId = 'student_id';
  static const _keyStudentName = 'student_name';
  static const _keyStudentGrade = 'student_grade';
  static const _keyStudentLanguage = 'student_language';

  String? studentId;
  String? studentName;
  int? studentGrade;
  String? studentLanguage; // 'en' | 'ml' | 'mng'

  bool get isLoggedIn => studentId != null;

  /// Load persisted session from SharedPreferences.
  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    studentId = prefs.getString(_keyStudentId);
    studentName = prefs.getString(_keyStudentName);
    studentGrade = prefs.getInt(_keyStudentGrade);
    studentLanguage = prefs.getString(_keyStudentLanguage);
  }

  /// Persist session after successful login.
  Future<void> save({
    required String id,
    required String name,
    required int grade,
    required String language,
  }) async {
    studentId = id;
    studentName = name;
    studentGrade = grade;
    studentLanguage = language;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyStudentId, id);
    await prefs.setString(_keyStudentName, name);
    await prefs.setInt(_keyStudentGrade, grade);
    await prefs.setString(_keyStudentLanguage, language);
  }

  /// Clear session on logout.
  Future<void> clear() async {
    studentId = null;
    studentName = null;
    studentGrade = null;
    studentLanguage = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyStudentId);
    await prefs.remove(_keyStudentName);
    await prefs.remove(_keyStudentGrade);
    await prefs.remove(_keyStudentLanguage);
  }
}
