import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class BouncyButton extends StatefulWidget {
  final String label;
  final VoidCallback onTap;
  final Color baseColor;
  final IconData? icon;
  final bool isSecondary;
  final bool isSelected;
  final Color? outlineColor;

  const BouncyButton({
    super.key,
    required this.label,
    required this.onTap,
    this.baseColor = AppColors.primary,
    this.icon,
    this.isSecondary = false,
    this.isSelected = false,
    this.outlineColor,
  });

  @override
  State<BouncyButton> createState() => _BouncyButtonState();
}

class _BouncyButtonState extends State<BouncyButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 100),
    );
    _scaleAnimation = Tween<double>(
      begin: 1.0,
      end: 0.95,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeInOut));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Color _getShadowColor() {
    return HSLColor.fromColor(widget.baseColor)
        .withLightness(
          (HSLColor.fromColor(widget.baseColor).lightness - 0.2).clamp(
            0.0,
            1.0,
          ),
        )
        .toColor();
  }

  void _onTapDown(TapDownDetails details) {
    setState(() => _isPressed = true);
    _controller.forward();
  }

  void _onTapUp(TapUpDetails details) {
    setState(() => _isPressed = false);
    _controller.reverse();
    widget.onTap();
  }

  void _onTapCancel() {
    setState(() => _isPressed = false);
    _controller.reverse();
  }

  @override
  Widget build(BuildContext context) {
    final shadowColor = widget.isSecondary
        ? Colors.grey.shade300
        : _getShadowColor();
    final faceColor = widget.isSecondary ? Colors.white : widget.baseColor;
    final textColor = widget.isSecondary ? Colors.black87 : Colors.white;

    Border? border;
    if (widget.outlineColor != null) {
      border = Border.all(color: widget.outlineColor!, width: 3);
    } else if (widget.isSecondary) {
      border = Border.all(color: Colors.grey.shade300, width: 2);
    } else if (widget.isSelected) {
      border = Border.all(color: Colors.white, width: 3);
    }

    return GestureDetector(
      onTapDown: _onTapDown,
      onTapUp: _onTapUp,
      onTapCancel: _onTapCancel,
      child: AnimatedBuilder(
        animation: _scaleAnimation,
        builder: (context, child) {
          return Transform.scale(
            scale: _scaleAnimation.value,
            child: SizedBox(
              height: 64, // Fixed height for consistency
              child: Stack(
                children: [
                  // 3D Shadow Base
                  Positioned.fill(
                    top: _isPressed ? 0 : 6,
                    child: Container(
                      decoration: BoxDecoration(
                        color: shadowColor,
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                  ),
                  // Main Button Face
                  AnimatedPositioned(
                    duration: const Duration(milliseconds: 100),
                    top: _isPressed ? 6 : 0,
                    bottom: _isPressed ? 0 : 6,
                    left: 0,
                    right: 0,
                    child: Container(
                      decoration: BoxDecoration(
                        color: faceColor,
                        borderRadius: BorderRadius.circular(16),
                        border: border,
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (widget.icon != null) ...[
                            Icon(widget.icon, color: textColor, size: 24),
                            const SizedBox(width: 8),
                          ],
                          Flexible(
                            child: Text(
                              widget.label,
                              textAlign: TextAlign.center,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: textColor,
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
