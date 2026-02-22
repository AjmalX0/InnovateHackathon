/// Single source of truth for all backend URLs and endpoint paths.
class ApiConstants {
  ApiConstants._();

  static const String baseUrl = 'http://10.141.171.15:3000';

  // REST
  static const String students = '/students';
  static String student(String id) => '/students/$id';
  static const String sessionsStart = '/sessions/start';
  static const String textbookUpload = '/textbook/upload';
  static const String syllabusSubjects = '/syllabus/subjects';
  static const String syllabusChapters = '/syllabus/chapters';
  static const String syllabusSearch = '/syllabus/search';
  static const String teachingSession = '/teaching/session';
  static String quiz(String id) => '/quizzes/$id';
  static String quizSubmit(String id) => '/quizzes/$id/submit';

  // WebSocket
  static const String socketUrl = baseUrl;

  // Socket.io emit events
  static const String evtStartLearning = 'start_learning';
  static const String evtAskDoubt = 'ask_doubt';

  // Socket.io listen events
  static const String evtLearningResponse = 'learning_response';
  static const String evtDoubtResponse = 'doubt_response'; // legacy
  static const String evtDoubtAnswered = 'doubt_answered'; // current
  static const String evtError = 'error';
}
