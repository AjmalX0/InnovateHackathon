import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/services/app_session.dart';
import '../../core/services/syllabus_service.dart';
import '../../core/utils/error_handler.dart';
import '../widgets/journey_path_painter.dart';
import 'chapter_details_screen.dart';

class SubjectDetailsScreen extends StatefulWidget {
  final String subjectSlug;
  final int grade;

  const SubjectDetailsScreen({
    super.key,
    required this.subjectSlug,
    required this.grade,
  });

  @override
  State<SubjectDetailsScreen> createState() => _SubjectDetailsScreenState();
}

class _SubjectDetailsScreenState extends State<SubjectDetailsScreen> {
  List<String> _chapters = [];
  bool _isLoading = true;
  String? _error;

  String get _displayName {
    return widget.subjectSlug
        .split('-')
        .map((w) => w.isEmpty ? '' : '${w[0].toUpperCase()}${w.substring(1)}')
        .join(' ');
  }

  @override
  void initState() {
    super.initState();
    _loadChapters();
  }

  Future<void> _loadChapters() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final chapters = await SyllabusService.instance.getChapters(
        widget.grade,
        widget.subjectSlug,
      );
      if (mounted) setState(() => _chapters = chapters);
    } catch (e) {
      if (mounted) setState(() => _error = ErrorHandler.getUserMessage(e));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          _displayName,
          style: const TextStyle(
            fontWeight: FontWeight.w800,
            fontSize: 22,
            letterSpacing: -0.5,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh',
            onPressed: _loadChapters,
          ),
        ],
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              AppColors.primaryLight.withValues(alpha: 0.1),
              AppColors.background,
            ],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.wifi_off_rounded, size: 56, color: Colors.grey),
              const SizedBox(height: 12),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: _loadChapters,
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    if (_chapters.isEmpty) {
      return const Center(child: Text('No chapters found for this subject.'));
    }

    return Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: 0.0,
      ), // Full width for curves
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 20, top: 16),
            child: Text(
              'Your Journey',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w900,
                color: AppColors.primaryDark,
                letterSpacing: -0.5,
              ),
            ),
          ),
          const SizedBox(height: 24),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadChapters,
              color: AppColors.primary,
              child: ListView.builder(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.only(bottom: 60),
                itemCount: _chapters.length,
                itemBuilder: (context, index) {
                  final slug = _chapters[index];
                  final title = SyllabusService.slugToTitle(slug);
                  final isLast = index == _chapters.length - 1;
                  final isLeft = index % 2 == 0;

                  // Determine mocked states (for gamified effect)
                  // e.g. first 2 are "completed", 3rd is "active", rest are "locked"
                  bool isCompleted = index < 2;
                  bool isActive = index == 2;
                  bool isLocked = index > 2;

                  if (_chapters.length < 4) {
                    // if very few chapters, make them all active for demo
                    isCompleted = false;
                    isActive = true;
                    isLocked = false;
                  }

                  Color nodeColor = AppColors.primary;
                  if (isCompleted) nodeColor = Colors.amber;
                  if (isLocked) nodeColor = Colors.grey.shade400;

                  return SizedBox(
                    height: 140,
                    child: Stack(
                      children: [
                        // The Path connecting to the NEXT node
                        if (!isLast)
                          Positioned(
                            top: 70, // Start from center of current node
                            bottom: -70, // Go to center of next node
                            left: 0,
                            right: 0,
                            child: CustomPaint(
                              painter: CurvedPathPainter(
                                color: isCompleted
                                    ? Colors.amber
                                    : Colors.grey.shade300,
                                isLeftToRight:
                                    isLeft, // if current is left, curve goes left->right
                              ),
                            ),
                          ),

                        // The Node itself
                        Align(
                          alignment: isLeft
                              ? Alignment.centerLeft
                              : Alignment.centerRight,
                          child: Padding(
                            padding: EdgeInsets.only(
                              left: isLeft ? 40.0 : 0,
                              right: isLeft ? 0 : 40.0,
                            ),
                            child: GestureDetector(
                              onTap: () {
                                if (isLocked) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text(
                                        'Complete previous chapters first! 🔒',
                                      ),
                                    ),
                                  );
                                  return;
                                }
                                final grade =
                                    AppSession.instance.studentGrade ??
                                    widget.grade;
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => ChapterDetailsScreen(
                                      chapterSlug: slug,
                                      chapterTitle: title,
                                      subjectName: widget.subjectSlug,
                                      grade: grade,
                                    ),
                                  ),
                                );
                              },
                              child: _JourneyNodeWidget(
                                index: index + 1,
                                title: title,
                                color: nodeColor,
                                isActive: isActive,
                                isLocked: isLocked,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _JourneyNodeWidget extends StatefulWidget {
  final int index;
  final String title;
  final Color color;
  final bool isActive;
  final bool isLocked;

  const _JourneyNodeWidget({
    required this.index,
    required this.title,
    required this.color,
    required this.isActive,
    required this.isLocked,
  });

  @override
  State<_JourneyNodeWidget> createState() => _JourneyNodeWidgetState();
}

class _JourneyNodeWidgetState extends State<_JourneyNodeWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
    );
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.15).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    if (widget.isActive && !widget.isLocked) {
      _pulseController.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // 3D Shadow depth color
    final shadowColor = HSLColor.fromColor(widget.color)
        .withLightness(
          (HSLColor.fromColor(widget.color).lightness - 0.2).clamp(0.0, 1.0),
        )
        .toColor();

    Widget node = Container(
      width: 76,
      height: 76,
      padding: const EdgeInsets.only(bottom: 6), // 3D offset
      decoration: BoxDecoration(
        color: shadowColor,
        shape: BoxShape.circle,
        boxShadow: widget.isActive
            ? [
                BoxShadow(
                  color: widget.color.withValues(alpha: 0.6),
                  blurRadius: 16,
                  spreadRadius: 4,
                ),
              ]
            : null,
      ),
      child: Container(
        decoration: BoxDecoration(
          color: widget.color,
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 3),
        ),
        child: Center(
          child: widget.isLocked
              ? const Icon(Icons.lock_rounded, color: Colors.white, size: 28)
              : widget.isActive
              ? const Icon(Icons.star_rounded, color: Colors.white, size: 36)
              : const Icon(Icons.check_rounded, color: Colors.white, size: 32),
        ),
      ),
    );

    if (widget.isActive) {
      node = AnimatedBuilder(
        animation: _pulseAnimation,
        builder: (context, child) =>
            Transform.scale(scale: _pulseAnimation.value, child: child),
        child: node,
      );
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        node,
        const SizedBox(height: 8),
        Container(
          width: 120, // constrain text width
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.9),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Text(
            '${widget.index}. ${widget.title}',
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: widget.isLocked ? Colors.grey : AppColors.primaryDark,
            ),
          ),
        ),
      ],
    );
  }
}
