import 'package:flutter/material.dart';

import '../../core/constants/app_colors.dart';
import '../../core/services/manglish_transliterator.dart';
import '../../core/services/whisper_stt_service.dart';
import '../../core/services/text_to_speech_service.dart';

enum DoubtLanguageOption { english, malayalam, autoDetect }

class AskDoubtScreen extends StatefulWidget {
  const AskDoubtScreen({super.key, required this.chapterTitle});

  final String chapterTitle;

  @override
  State<AskDoubtScreen> createState() => _AskDoubtScreenState();
}

class _AskDoubtScreenState extends State<AskDoubtScreen> {
  final TextEditingController _textController = TextEditingController();
  final TextToSpeechService _ttsService = TextToSpeechService();
  final WhisperSttService _sttService = WhisperSttService();

  DoubtLanguageOption _selectedLanguage = DoubtLanguageOption.autoDetect;
  String _recognizedText = '';
  String? _errorMessage;
  double _pitch = 1.0;
  double _speechRate = 0.5;
  double _soundLevel = 0.0;
  bool _isTtsReady = false;
  bool _isSpeechReady = false;
  bool _isSpeaking = false;
  bool _isTranscribing = false;
  bool _isInitializing = true;

  List<Map<String, dynamic>> _availableVoices = [];

  void _log(String message) {
    debugPrint('[AskDoubtScreen] $message');
  }

  @override
  void initState() {
    super.initState();
    _initializeEngines();
  }

  Future<void> _initializeEngines() async {
    _log('Initializing speech and TTS engines');
    _isTtsReady = await _ttsService.initialize();

    try {
      if (_isTtsReady) {
        _availableVoices = await _ttsService.getAvailableVoices();
      }

      _isSpeechReady = await _sttService.initialize();
      _log('Engine init result -> TTS: $_isTtsReady, STT: $_isSpeechReady');

      final voiceUnavailable = !_isTtsReady && !_isSpeechReady;
      final sttUnavailable = _isTtsReady && !_isSpeechReady;
      final ttsUnavailable = !_isTtsReady && _isSpeechReady;

      String? initError;
      if (voiceUnavailable) {
        initError =
            'Voice features are unavailable in this runtime. Run on Android/iOS and do a full restart after adding plugins.';
      } else if (sttUnavailable) {
        initError =
            'Speech-to-Text is unavailable. Grant mic permission or run on Android/iOS.';
      } else if (ttsUnavailable) {
        initError =
            'Text-to-Speech is unavailable in this runtime. Try a full restart on Android/iOS.';
      }

      if (mounted) {
        setState(() {
          _errorMessage = initError;
          _isInitializing = false;
        });
      }
    } catch (error) {
      _log('Initialization exception: $error');
      if (!mounted) {
        return;
      }
      setState(() {
        _errorMessage =
            'Initialization failed. Run on Android/iOS and perform a full restart.';
        _isInitializing = false;
      });
    }
  }

  String _localeForTts(DoubtLanguageOption option, String text) {
    switch (option) {
      case DoubtLanguageOption.english:
        return 'en-IN';
      case DoubtLanguageOption.malayalam:
        return 'ml-IN';
      case DoubtLanguageOption.autoDetect:
        if (ManglishTransliterator.containsMalayalam(text)) {
          return 'ml-IN';
        }
        if (ManglishTransliterator.looksManglish(text)) {
          return 'ml-IN';
        }
        return 'en-IN';
    }
  }

  String? _localeForStt(DoubtLanguageOption option) {
    switch (option) {
      case DoubtLanguageOption.english:
        return 'en-IN';
      case DoubtLanguageOption.malayalam:
        return 'ml-IN';
      case DoubtLanguageOption.autoDetect:
        return null;
    }
  }

  String _textForSpeech(DoubtLanguageOption option, String text) {
    final trimmed = text.trim();
    if (option == DoubtLanguageOption.malayalam &&
        ManglishTransliterator.looksManglish(trimmed)) {
      return ManglishTransliterator.transliterate(trimmed);
    }

    if (option == DoubtLanguageOption.autoDetect &&
        ManglishTransliterator.looksManglish(trimmed)) {
      return ManglishTransliterator.transliterate(trimmed);
    }

    return trimmed;
  }

  Future<void> _speak() async {
    if (!_isTtsReady) {
      setState(() {
        _errorMessage =
            'Text-to-Speech is not available on this device/runtime.';
      });
      return;
    }

    final inputText = _textController.text;
    if (inputText.trim().isEmpty) {
      setState(() {
        _errorMessage = 'Please type or dictate text before speaking.';
      });
      return;
    }

    try {
      setState(() {
        _isSpeaking = true;
        _errorMessage = null;
      });

      final textToSpeak = _textForSpeech(_selectedLanguage, inputText);
      final languageCode = _localeForTts(_selectedLanguage, inputText);

      await _ttsService.setLanguage(languageCode);
      await _ttsService.setPitch(_pitch);
      await _ttsService.setSpeechRate(_speechRate);
      await _ttsService.speak(textToSpeak);
    } catch (error) {
      setState(() {
        _errorMessage = 'Text-to-Speech failed: $error';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isSpeaking = false;
        });
      }
    }
  }

  Future<void> _startListening() async {
    _log('Start listening tapped');
    if (!_isSpeechReady) {
      await _retrySpeechInitialization();
    }

    if (!_isSpeechReady) {
      final hasPermission = await _sttService.hasPermission();
      setState(() {
        _errorMessage = hasPermission
            ? 'Speech engine failed to initialize. Please restart the app and try again.'
            : 'Microphone permission is denied. Please enable microphone access in app settings and try again.';
      });
      return;
    }

    try {
      setState(() {
        _errorMessage = null;
      });

      await _sttService.startListening();

      setState(() {
        _recognizedText = 'Recording audio... Speak clearly.';
      });
      _log('Listening started successfully');
    } catch (error) {
      _log('Start listening failed: $error');
      final errorText = error.toString().toLowerCase();
      final localeUnavailable = errorText.contains(
        'requested speech locale is not installed',
      );

      if (localeUnavailable) {
        // Fallback or retry logic can be abbreviated since HF API just needs recording.
        await _sttService.startListening();
        setState(() {
          _recognizedText = 'Recording audio... (Retry)';
        });
        return;
      }

      setState(() {
        _errorMessage = 'Unable to start listening: $error';
      });
    }
  }

  Future<void> _retrySpeechInitialization() async {
    try {
      _log('Retrying speech initialization');
      final ready = await _sttService.initialize();

      if (!mounted) {
        return;
      }

      setState(() {
        _isSpeechReady = ready;
      });
    } catch (_) {
      if (!mounted) {
        return;
      }
      setState(() {
        _isSpeechReady = false;
      });
    }
  }

  Future<void> _stopListening() async {
    if (_isTranscribing) {
      return;
    }

    try {
      _log('Stop listening tapped; starting transcription');
      setState(() {
        _isTranscribing = true;
      });

      final transcribedText = await _sttService.stopListeningAndTranscribe(
        localeId: _localeForStt(_selectedLanguage),
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _recognizedText = transcribedText;
        _textController.text = transcribedText;
        _textController.selection = TextSelection.fromPosition(
          TextPosition(offset: _textController.text.length),
        );
        _soundLevel = 0.0;
        if (transcribedText.trim().isEmpty) {
          _errorMessage =
              'No clear speech detected. Please speak closer to the microphone and try again.';
        }
      });
      _log('Transcription result: $transcribedText');
    } catch (error) {
      _log('Stop listening/transcription failed: $error');
      if (!mounted) {
        return;
      }
      setState(() {
        _errorMessage = 'Unable to stop listening: $error';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isTranscribing = false;
        });
      }
    }
  }

  Future<void> _stopSpeaking() async {
    try {
      await _ttsService.stop();
      if (!mounted) {
        return;
      }
      setState(() {
        _isSpeaking = false;
      });
    } catch (error) {
      setState(() {
        _errorMessage = 'Unable to stop speaking: $error';
      });
    }
  }

  @override
  void dispose() {
    _textController.dispose();
    _ttsService.dispose();
    _sttService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Ask a Doubt • ${widget.chapterTitle}')),
      body: _isInitializing
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Ask your doubt by typing or speaking.',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: AppColors.onSurface,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _textController,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      labelText: 'Type your doubt',
                      alignLabelWithHint: true,
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<DoubtLanguageOption>(
                    initialValue: _selectedLanguage,
                    decoration: const InputDecoration(
                      labelText: 'Language',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(
                        value: DoubtLanguageOption.english,
                        child: Text('English (en-IN)'),
                      ),
                      DropdownMenuItem(
                        value: DoubtLanguageOption.malayalam,
                        child: Text('Malayalam (ml-IN)'),
                      ),
                      DropdownMenuItem(
                        value: DoubtLanguageOption.autoDetect,
                        child: Text('Auto Detect'),
                      ),
                    ],
                    onChanged: (value) {
                      if (value == null) {
                        return;
                      }
                      setState(() {
                        _selectedLanguage = value;
                      });
                    },
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Pitch: ${_pitch.toStringAsFixed(2)}',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  Slider(
                    min: 0.5,
                    max: 2.0,
                    value: _pitch,
                    onChanged: (value) {
                      setState(() {
                        _pitch = value;
                      });
                    },
                  ),
                  Text(
                    'Speech rate: ${_speechRate.toStringAsFixed(2)}',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  Slider(
                    min: 0.1,
                    max: 1.0,
                    value: _speechRate,
                    onChanged: (value) {
                      setState(() {
                        _speechRate = value;
                      });
                    },
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      ElevatedButton.icon(
                        onPressed: _isTtsReady ? _speak : null,
                        icon: const Icon(Icons.volume_up_outlined),
                        label: const Text('Speak'),
                      ),
                      ElevatedButton.icon(
                        onPressed: _isTranscribing ? null : _startListening,
                        icon: const Icon(Icons.mic_none_rounded),
                        label: const Text('Start Listening'),
                      ),
                      ElevatedButton.icon(
                        onPressed: _sttService.isListening && !_isTranscribing
                            ? _stopListening
                            : null,
                        icon: const Icon(Icons.stop_circle_outlined),
                        label: _isTranscribing
                            ? const Text('Uploading...')
                            : const Text('Stop & Transcribe'),
                      ),
                      ElevatedButton.icon(
                        onPressed: _isSpeaking ? _stopSpeaking : null,
                        icon: const Icon(Icons.volume_off_outlined),
                        label: const Text('Stop Speaking'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Mic level: ${_soundLevel.toStringAsFixed(1)}',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Recognized speech (real-time)',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade300),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _recognizedText.isEmpty
                          ? 'Start listening to see live transcription here.'
                          : _recognizedText,
                      style: TextStyle(
                        color: _recognizedText.isEmpty
                            ? Colors.grey.shade600
                            : AppColors.onSurface,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  if (_availableVoices.isNotEmpty)
                    Text(
                      'Available voices detected: ${_availableVoices.length}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.grey.shade700,
                      ),
                    ),
                  if (_errorMessage != null) ...[
                    const SizedBox(height: 10),
                    Text(
                      _errorMessage!,
                      style: const TextStyle(color: Colors.red),
                    ),
                  ],
                ],
              ),
            ),
    );
  }
}
