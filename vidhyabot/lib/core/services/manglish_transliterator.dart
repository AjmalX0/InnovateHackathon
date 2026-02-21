class ManglishTransliterator {
  static final Map<String, String> _wordMap = {
    'namaskaram': 'നമസ്കാരം',
    'njan': 'ഞാൻ',
    'njananu': 'ഞാനാണ്',
    'entha': 'എന്താ',
    'enthu': 'എന്ത്',
    'sukhamano': 'സുഖമാണോ',
    'padikkan': 'പഠിക്കാൻ',
    'pokunnathu': 'പോകുന്നത്',
    'anu': 'ആണ്',
    'alle': 'അല്ലേ',
    'doubt': 'ഡൗട്ട്',
    'teacher': 'ടീച്ചർ',
    'chapter': 'ചാപ്റ്റർ',
    'question': 'ചോദ്യo',
    'answer': 'ഉത്തരം',
  };

  static final List<MapEntry<String, String>> _phoneticMap = [
    const MapEntry('ngh', 'ങ്ഹ'),
    const MapEntry('nch', 'ഞ്ച'),
    const MapEntry('nth', 'ന്ത'),
    const MapEntry('ndh', 'ന്ധ'),
    const MapEntry('sh', 'ശ'),
    const MapEntry('ch', 'ച'),
    const MapEntry('th', 'ത'),
    const MapEntry('dh', 'ധ'),
    const MapEntry('ph', 'ഫ'),
    const MapEntry('kh', 'ഖ'),
    const MapEntry('gh', 'ഘ'),
    const MapEntry('aa', 'ആ'),
    const MapEntry('ee', 'ഈ'),
    const MapEntry('ii', 'ഈ'),
    const MapEntry('oo', 'ഊ'),
    const MapEntry('uu', 'ഊ'),
    const MapEntry('ai', 'ഐ'),
    const MapEntry('au', 'ഔ'),
    const MapEntry('a', 'അ'),
    const MapEntry('b', 'ബ'),
    const MapEntry('c', 'ക'),
    const MapEntry('d', 'ഡ'),
    const MapEntry('e', 'എ'),
    const MapEntry('f', 'ഫ്'),
    const MapEntry('g', 'ഗ'),
    const MapEntry('h', 'ഹ'),
    const MapEntry('i', 'ഇ'),
    const MapEntry('j', 'ജ'),
    const MapEntry('k', 'ക'),
    const MapEntry('l', 'ല'),
    const MapEntry('m', 'മ'),
    const MapEntry('n', 'ന'),
    const MapEntry('o', 'ഒ'),
    const MapEntry('p', 'പ'),
    const MapEntry('q', 'ക്യു'),
    const MapEntry('r', 'ര'),
    const MapEntry('s', 'സ'),
    const MapEntry('t', 'ട'),
    const MapEntry('u', 'ഉ'),
    const MapEntry('v', 'വ'),
    const MapEntry('w', 'വ്'),
    const MapEntry('x', 'ക്സ്'),
    const MapEntry('y', 'യ'),
    const MapEntry('z', 'സ്'),
  ];

  static bool containsMalayalam(String text) {
    return RegExp(r'[\u0D00-\u0D7F]').hasMatch(text);
  }

  static bool looksManglish(String text) {
    final normalized = text.trim().toLowerCase();
    if (normalized.isEmpty) {
      return false;
    }

    final hasLatin = RegExp(r'[a-z]').hasMatch(normalized);
    final hasMalayalam = containsMalayalam(normalized);
    return hasLatin && !hasMalayalam;
  }

  static String transliterate(String input) {
    final normalized = input.trim().toLowerCase();
    if (normalized.isEmpty) {
      return input;
    }

    final words = normalized.split(RegExp(r'\s+'));
    final convertedWords = words.map((word) {
      final direct = _wordMap[word];
      if (direct != null) {
        return direct;
      }

      var transformed = word;
      for (final entry in _phoneticMap) {
        transformed = transformed.replaceAll(entry.key, entry.value);
      }
      return transformed;
    }).toList();

    return convertedWords.join(' ');
  }
}
