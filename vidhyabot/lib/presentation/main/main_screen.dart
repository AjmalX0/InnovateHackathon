import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../chat/ai_chat_screen.dart';
import '../home/home_screen.dart';
import '../quiz/quiz_screen.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 0;

  final List<Widget> _pages = const [
    HomeScreen(),
    AiChatScreen(),
    QuizScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: _pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (int index) {
          setState(() {
            _currentIndex = index;
          });
        },
        backgroundColor: AppColors.surface,
        indicatorColor: AppColors.primaryLight.withOpacity(0.3),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(
              Icons.home_rounded,
              color: AppColors.primaryDark,
            ),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.smart_toy_outlined),
            selectedIcon: Icon(
              Icons.smart_toy_rounded,
              color: AppColors.primaryDark,
            ),
            label: 'AI Chat',
          ),
          NavigationDestination(
            icon: Icon(Icons.quiz_outlined),
            selectedIcon: Icon(
              Icons.quiz_rounded,
              color: AppColors.primaryDark,
            ),
            label: 'Quiz',
          ),
        ],
      ),
    );
  }
}
