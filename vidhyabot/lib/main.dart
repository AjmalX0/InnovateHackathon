import 'package:flutter/material.dart';
import 'package:vidhyabot/presentation/main/main_screen.dart';
import 'core/theme/app_theme.dart';
import 'presentation/login/login_screen.dart';

void main() {
  runApp(const VidhyaBotApp());
}

class VidhyaBotApp extends StatelessWidget {
  const VidhyaBotApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Vidhyabot',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const MainScreen(),
    );
  }
}
