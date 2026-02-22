import 'dart:io';
import 'package:dio/dio.dart';

class ErrorHandler {
  /// Converts raw exceptions (like DioException or SocketException)
  /// into short, user-friendly strings that kids and parents can understand.
  static String getUserMessage(dynamic error) {
    if (error is DioException) {
      if (error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.receiveTimeout ||
          error.type == DioExceptionType.sendTimeout) {
        return 'Connection timed out. Please check your internet connection and try again. 📡';
      }
      if (error.type == DioExceptionType.connectionError) {
        return 'Unable to connect to the server. Please check your internet connection or try again later. 🔌';
      }
      if (error.response != null) {
        final data = error.response?.data;
        if (data is Map<String, dynamic> && data['message'] != null) {
          return data['message'].toString();
        }
        return 'Server hiccup! (${error.response?.statusCode}). Please try again in a bit. 🛠️';
      }
      return 'A network error occurred. Please check your connection. 🌐';
    }

    if (error is SocketException) {
      return 'No internet connection. Please check your Wi-Fi or mobile data. 📶';
    }

    if (error is Exception) {
      final msg = error.toString();
      if (msg.startsWith('Exception: ')) {
        return msg.substring(11);
      }
      return msg;
    }

    return 'Oops! An unexpected error occurred. Please try again. 😅';
  }
}
