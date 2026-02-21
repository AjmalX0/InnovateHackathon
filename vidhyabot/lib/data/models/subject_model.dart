class ChapterModel {
  final String id;
  final String title;
  final String description;

  const ChapterModel({
    required this.id,
    required this.title,
    required this.description,
  });
}

class SubjectModel {
  final String id;
  final String name;
  final String iconAsset; // Or use an IconData
  final List<ChapterModel> chapters;

  const SubjectModel({
    required this.id,
    required this.name,
    required this.iconAsset,
    required this.chapters,
  });
}

// Dummy Data
final List<SubjectModel> dummySubjects = [
  SubjectModel(
    id: 's1',
    name: 'Mathematics',
    iconAsset: 'calculate',
    chapters: [
      const ChapterModel(
        id: 'c1',
        title: 'Algebra',
        description: 'Equations and inequalities',
      ),
      const ChapterModel(
        id: 'c2',
        title: 'Geometry',
        description: 'Shapes and spaces',
      ),
      const ChapterModel(
        id: 'c3',
        title: 'Trigonometry',
        description: 'Triangles and relations',
      ),
    ],
  ),
  SubjectModel(
    id: 's2',
    name: 'Science',
    iconAsset: 'science',
    chapters: [
      const ChapterModel(
        id: 'c4',
        title: 'Physics: Motion',
        description: 'Learn about forces and motion',
      ),
      const ChapterModel(
        id: 'c5',
        title: 'Chemistry: Atoms',
        description: 'The building blocks of matter',
      ),
      const ChapterModel(
        id: 'c6',
        title: 'Biology: Cells',
        description: 'Structure and function of life',
      ),
    ],
  ),
  SubjectModel(
    id: 's3',
    name: 'History',
    iconAsset: 'history_edu',
    chapters: [
      const ChapterModel(
        id: 'c7',
        title: 'Ancient Civilizations',
        description: 'Mesopotamia, Egypt, Indus Valley',
      ),
      const ChapterModel(
        id: 'c8',
        title: 'Medieval Ages',
        description: 'Feudalism and empires',
      ),
    ],
  ),
  SubjectModel(
    id: 's4',
    name: 'English',
    iconAsset: 'menu_book',
    chapters: [
      const ChapterModel(
        id: 'c9',
        title: 'Grammar Basics',
        description: 'Nouns, verbs, adjectives',
      ),
      const ChapterModel(
        id: 'c10',
        title: 'Literature: Poetry',
        description: 'Understanding rhythm and meaning',
      ),
    ],
  ),
];
