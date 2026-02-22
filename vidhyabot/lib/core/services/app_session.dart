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
  static const _keyStudentStreak = 'student_streak';
  static const _keyStudentPoints = 'student_points';

  String? studentId;
  String? studentName;
  int? studentGrade;
  String? studentLanguage; // 'en' | 'ml' | 'mng'

  // Gamification fields
  int streak = 0;
  int points = 0;

  bool get isLoggedIn => studentId != null;

  /// Load persisted session from SharedPreferences.
  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    studentId = prefs.getString(_keyStudentId);
    studentName = prefs.getString(_keyStudentName);
    studentGrade = prefs.getInt(_keyStudentGrade);
    studentLanguage = prefs.getString(_keyStudentLanguage);

    // Mock starting values if they don't exist yet to give a fun first experience
    streak = prefs.getInt(_keyStudentStreak) ?? 3;
    points = prefs.getInt(_keyStudentPoints) ?? 150;
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
    streak = 3; // starting streak
    points = 150; // starting points

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyStudentId, id);
    await prefs.setString(_keyStudentName, name);
    await prefs.setInt(_keyStudentGrade, grade);
    await prefs.setString(_keyStudentLanguage, language);
    await prefs.setInt(_keyStudentStreak, streak);
    await prefs.setInt(_keyStudentPoints, points);
  }

  /// Add points and immediately save
  Future<void> addPoints(int amount) async {
    points += amount;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_keyStudentPoints, points);
  }

  /// Clear session on logout.
  Future<void> clear() async {
    studentId = null;
    studentName = null;
    studentGrade = null;
    studentLanguage = null;
    streak = 0;
    points = 0;

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyStudentId);
    await prefs.remove(_keyStudentName);
    await prefs.remove(_keyStudentGrade);
    await prefs.remove(_keyStudentLanguage);
    await prefs.remove(_keyStudentStreak);
    await prefs.remove(_keyStudentPoints);
  }
}
