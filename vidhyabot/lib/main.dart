import 'package:flutter/material.dart';
import 'package:vidhyabot/presentation/home/home_screen.dart';
import 'core/theme/app_theme.dart';

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
      home: const HomeScreen(),
    );
  }
}
