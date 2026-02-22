/// Single source of truth for all backend URLs and endpoint paths.
class ApiConstants {
  ApiConstants._();

  static const String baseUrl = 'https://innovate-hackathon-green.vercel.app/';

  // REST
  static const String students = '/students';
  static String student(String id) => '/students/$id';
  static const String sessionsStart = '/sessions/start';
  static const String textbookUpload = '/textbook/upload';

  // WebSocket
  static const String socketUrl = baseUrl;

  // Socket.io emit events
  static const String evtStartLearning = 'start_learning';
  static const String evtAskDoubt = 'ask_doubt';

  // Socket.io listen events
  static const String evtLearningResponse = 'learning_response';
  static const String evtDoubtResponse = 'doubt_response';
  static const String evtError = 'error';
}
