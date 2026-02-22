import 'dart:ui';
import 'package:flutter/material.dart';

class DottedLinePainter extends CustomPainter {
  final Color color;
  const DottedLinePainter({this.color = Colors.grey});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    final path = Path();
    path.moveTo(size.width / 2, 0);
    path.lineTo(size.width / 2, size.height);

    // Draw dashed line
    const dashWidth = 10.0;
    const dashSpace = 8.0;
    double startY = 0;
    while (startY < size.height) {
      canvas.drawLine(
        Offset(size.width / 2, startY),
        Offset(size.width / 2, startY + dashWidth),
        paint,
      );
      startY += dashWidth + dashSpace;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class CurvedPathPainter extends CustomPainter {
  final Color color;
  final bool isLeftToRight;

  const CurvedPathPainter({required this.color, required this.isLeftToRight});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    final path = Path();

    // Create an S-curve to connect nodes horizontally
    if (isLeftToRight) {
      path.moveTo(0, 0);
      path.cubicTo(
        size.width / 2,
        0,
        size.width / 2,
        size.height,
        size.width,
        size.height,
      );
    } else {
      path.moveTo(size.width, 0);
      path.cubicTo(
        size.width / 2,
        0,
        size.width / 2,
        size.height,
        0,
        size.height,
      );
    }

    // Draw dashed line for the curve
    PathMetrics pathMetrics = path.computeMetrics();
    for (PathMetric pathMetric in pathMetrics) {
      double distance = 0.0;
      bool draw = true;
      while (distance < pathMetric.length) {
        final length = draw ? 10.0 : 8.0;
        if (draw) {
          canvas.drawPath(
            pathMetric.extractPath(distance, distance + length),
            paint,
          );
        }
        distance += length;
        draw = !draw;
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
