import 'package:flutter/material.dart';
import 'package:vidhyabot/presentation/main/main_screen.dart';
import 'core/services/app_session.dart';
import 'core/theme/app_theme.dart';
import 'presentation/login/login_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Restore student session from SharedPreferences
  await AppSession.instance.load();
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
      // Route to MainScreen if already logged in, else LoginScreen
      home: AppSession.instance.isLoggedIn
          ? const MainScreen()
          : const LoginScreen(),
    );
  }
}
