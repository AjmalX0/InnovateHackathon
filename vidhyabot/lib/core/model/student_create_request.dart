enum StudentGrade {
  grade3(3),
  grade4(4),
  grade5(5),
  grade6(6),
  grade7(7),
  grade8(8),
  grade9(9),
  grade10(10),
  grade11(11),
  grade12(12);

  const StudentGrade(this.value);

  final int value;
}

enum StudentLanguage {
  malayalam('ml'),
  english('en'),
  manglish('mng');

  const StudentLanguage(this.value);

  final String value;
}

class StudentCreateRequest {
  final String name;
  final StudentGrade grade;
  final StudentLanguage language;

  const StudentCreateRequest({
    required this.name,
    required this.grade,
    required this.language,
  });

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'grade': grade.value,
      'language': language.value,
    };
  }
}
