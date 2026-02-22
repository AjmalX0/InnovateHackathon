import 'dart:convert';
import 'package:http/http.dart' as http;

/// Transparent Malayalam ↔ English translation using the free MyMemory API.
///
/// Detection relies on Unicode block U+0D00–U+0D7F (Malayalam script).
/// No API key is required for moderate usage.
///
/// MyMemory enforces a **500-character limit** per request. Long texts are
/// automatically split at sentence boundaries and translated in chunks.
class TranslationService {
  static const int _maxChunkChars = 480; // stay safely under 500

  // Malayalam Unicode range regex
  static final RegExp _malayalamRegex = RegExp(r'[\u0D00-\u0D7F]');

  /// Returns true if [text] contains at least one Malayalam character.
  static bool isMalayalam(String text) => _malayalamRegex.hasMatch(text);

  // ─── Internal: single-chunk request ────────────────────────────────────────

  static Future<String> _translateChunk(
    String text, {
    required String from,
    required String to,
  }) async {
    if (text.trim().isEmpty) return text;
    try {
      final uri = Uri.https('api.mymemory.translated.net', '/get', {
        'q': text,
        'langpair': '$from|$to',
      });
      final response = await http.get(uri).timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        final translated =
            (json['responseData']?['translatedText'] as String?) ?? text;
        return translated;
      }
    } catch (_) {
      // network / timeout: fall back to original chunk
    }
    return text;
  }

  // ─── Internal: split text into ≤480-char chunks at sentence boundaries ─────

  static List<String> _splitIntoChunks(String text) {
    if (text.length <= _maxChunkChars) return [text];

    final chunks = <String>[];
    // Split on sentence-ending punctuation followed by whitespace
    final sentences = text
        .splitMapJoin(
          RegExp(r'(?<=[.!?\n])\s+'),
          onMatch: (m) => '\x00', // sentinel
          onNonMatch: (s) => s,
        )
        .split('\x00');

    final buffer = StringBuffer();
    for (final sentence in sentences) {
      // If the sentence itself is longer than the limit, hard-split on spaces
      if (sentence.length > _maxChunkChars) {
        if (buffer.isNotEmpty) {
          chunks.add(buffer.toString().trim());
          buffer.clear();
        }
        // hard-split by words
        final words = sentence.split(' ');
        for (final word in words) {
          if (buffer.length + word.length + 1 > _maxChunkChars) {
            chunks.add(buffer.toString().trim());
            buffer.clear();
          }
          if (buffer.isNotEmpty) buffer.write(' ');
          buffer.write(word);
        }
        continue;
      }

      if (buffer.length + sentence.length + 1 > _maxChunkChars) {
        chunks.add(buffer.toString().trim());
        buffer.clear();
      }
      if (buffer.isNotEmpty) buffer.write(' ');
      buffer.write(sentence);
    }
    if (buffer.isNotEmpty) chunks.add(buffer.toString().trim());
    return chunks.where((c) => c.isNotEmpty).toList();
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /// Translate [text] from [from] to [to], automatically chunking long texts.
  ///
  /// Language codes: 'ml' = Malayalam, 'en' = English.
  /// Returns the translated text, or the original on failure.
  static Future<String> translate(
    String text, {
    required String from,
    required String to,
  }) async {
    if (text.trim().isEmpty) return text;
    final chunks = _splitIntoChunks(text);
    final translated = await Future.wait(
      chunks.map((c) => _translateChunk(c, from: from, to: to)),
    );
    return translated.join(' ');
  }

  /// Translate Malayalam → English.
  static Future<String> mlToEn(String text) =>
      translate(text, from: 'ml', to: 'en');

  /// Translate English → Malayalam.
  static Future<String> enToMl(String text) =>
      translate(text, from: 'en', to: 'ml');
}
