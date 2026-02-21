import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../model/student_create_request.dart';

class StudentService {
  StudentService({
    http.Client? client,
    String? createStudentUrl,
  }) : _client = client ?? http.Client(),
       _createStudentUri = Uri.parse(
         createStudentUrl ?? _defaultCreateStudentUrl(),
       );

  final http.Client _client;
  final Uri _createStudentUri;

  static String _defaultCreateStudentUrl() {
    const configuredUrl = String.fromEnvironment('CREATE_STUDENT_URL');
    if (configuredUrl.isNotEmpty) {
      return configuredUrl;
    }

    final host = !kIsWeb && defaultTargetPlatform == TargetPlatform.android
        ? '10.0.2.2'
        : 'localhost';
    return 'http://$host:3000/students';
  }

  Future<void> createStudent(StudentCreateRequest request) async {
    final response = await _client.post(
      _createStudentUri,
      headers: const {'Content-Type': 'application/json'},
      body: jsonEncode(request.toJson()),
    );

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('Failed to create student: ${response.statusCode}');
    }
  }

  void dispose() {
    _client.close();
  }
}
