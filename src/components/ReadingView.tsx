import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Type,
  CheckCircle2,
  RefreshCw,
  Volume2,
  Check,
  X,
  BookOpen,
  FileText,
  Layers,
  Award,
  Play,
  Pause
} from 'lucide-react';
import { AppLanguage, LessonMode, ReadingItem, WordAnalysis, SavedRecording } from '../types';
import { getLessonItems } from '../data/lessons';
import {
  recordSessionInSpeechProfile,
  getAdaptiveLessonItems
} from '../services/speechProfile';
import {
  SpeechRecognizer,
  speakWord,
  getFriendlySpeechErrorMessage,
  RecognitionState,
  SpeechDiagnosticEvent
} from '../services/speech';
import { AudioRecorder, AudioDiagnosticInfo } from '../services/audioRecorder';
import { analyzeSpokenText, wordSimilarity, cleanWord } from '../services/soundAnalysis';
import {
  analyzeSpeech,
  SpeechAnalysisResult,
  ChildFriendlyResultState,
  AudioQualityState,
} from '../services/speechAnalyzer';
import {
  triggerParagraphSuccessConfetti,
  triggerDailySessionCompleteConfetti,
} from '../utils/confetti';
import {
  saveRecording,
  recordSubstitutions,
  addStars,
  addSessionTime,
  updateBadgeProgress,
  getChildProfile,
  getAppSettings,
} from '../services/storage';
import { playSuccessChime, playEncouragingTone } from '../utils/soundEffects';
import { WordHelpModal } from './WordHelpModal';
import { BuddyMascot } from './BuddyMascot';

interface ReadingViewProps {
  language: AppLanguage;
  onSessionComplete?: () => void;
}

export const ReadingView: React.FC<ReadingViewProps> = ({
  language,
  onSessionComplete,
}) => {
  // Mode selection: Single Word, Two Words, One Line, Paragraph
  const [selectedMode, setSelectedMode] = useState<LessonMode>(() => {
    const saved = localStorage.getItem('readbuddy_lesson_mode') as LessonMode;
    return saved && ['word', 'two-words', 'line', 'paragraph'].includes(saved)
      ? saved
      : 'word';
  });

  const lessonItems = getAdaptiveLessonItems(selectedMode, language);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentItem: ReadingItem =
    lessonItems[currentIndex] || lessonItems[0] || {
      id: 'fallback',
      title: 'Lesson',
      language,
      category: 'Practice',
      grade: 'Class 6',
      difficulty: 'easy',
      text: 'hello',
      targetSounds: ['h'],
      syllablesMap: { hello: 'hel-lo' },
      mode: 'word',
    };

  // Font size state: normal (false) vs extra-large (true)
  const [extraLargeText, setExtraLargeText] = useState(false);

  // Speech Recognition & Audio Recorder states
  const [isRecording, setIsRecording] = useState(false);
  const [recogState, setRecogState] = useState<RecognitionState>('IDLE');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isAutoStoppedCap, setIsAutoStoppedCap] = useState(false);
  const [rawTranscript, setRawTranscript] = useState('');
  const [wordAnalysisList, setWordAnalysisList] = useState<WordAnalysis[]>([]);
  const [selectedWordForHelp, setSelectedWordForHelp] = useState<WordAnalysis | null>(null);
  const [hasAttempted, setHasAttempted] = useState(false);

  // Session completion modal
  const [showCelebration, setShowCelebration] = useState(false);
  const [isEmptyTranscript, setIsEmptyTranscript] = useState(false);
  const [lastErrorCode, setLastErrorCode] = useState<string | null>(null);
  const [sessionAccuracy, setSessionAccuracy] = useState(0);
  const [starsAwarded, setStarsAwarded] = useState(10);
  const [sessionAudioUrl, setSessionAudioUrl] = useState<string | null>(null);
  const [isPlayingSessionAudio, setIsPlayingSessionAudio] = useState(false);
  const [audioDiagnostic, setAudioDiagnostic] = useState<AudioDiagnosticInfo | null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  // Settings & Voice Recording Step States
  const [saveVoiceRecordingEnabled, setSaveVoiceRecordingEnabled] = useState(
    () => getAppSettings().saveVoiceRecording
  );
  const [lastSavedRecord, setLastSavedRecord] = useState<SavedRecording | null>(null);
  const [isVoiceRecordingActive, setIsVoiceRecordingActive] = useState(false);
  const [voiceRecSeconds, setVoiceRecSeconds] = useState(0);
  const [voiceRecError, setVoiceRecError] = useState<string | null>(null);
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Diagnostic state for Section 15 Speech Debug Panel
  const [micPermissionState, setMicPermissionState] = useState<'granted' | 'denied' | 'prompt'>('granted');
  const [recognitionEndedTime, setRecognitionEndedTime] = useState<string | null>(null);
  const [speechDetectedFlag, setSpeechDetectedFlag] = useState(false);
  const [analyzerStatus, setAnalyzerStatus] = useState<string>('IDLE');
  const [analysisResult, setAnalysisResult] = useState<SpeechAnalysisResult | null>(null);

  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const audioRecorderRef = useRef<AudioRecorder>(new AudioRecorder());
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const startTimeRef = useRef<number>(0);
  const isRecordingRef = useRef(false);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopSessionRef = useRef<(isAutoCap?: boolean) => Promise<void>>(async () => {});
  const lastSoundFeedbackSigRef = useRef<string>('');

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    const recorder = audioRecorderRef.current;
    recorder.setDiagnosticCallback((info) => {
      setAudioDiagnostic(info);
    });

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (recognizerRef.current) {
        recognizerRef.current.abort();
        recognizerRef.current = null;
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
      recorder.cleanup();
    };
  }, []);

  const handleTogglePlaySessionAudio = () => {
    if (!sessionAudioUrl) return;

    if (isPlayingSessionAudio) {
      audioElementRef.current?.pause();
      setIsPlayingSessionAudio(false);
      return;
    }

    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }

    const audio = new Audio(sessionAudioUrl);
    audioElementRef.current = audio;
    setIsPlayingSessionAudio(true);

    audio.play().catch((err) => {
      console.warn('[ReadingView] Play audio error:', err);
      setIsPlayingSessionAudio(false);
    });

    audio.onended = () => {
      setIsPlayingSessionAudio(false);
    };
  };

  // Handle mode change
  const handleModeChange = (newMode: LessonMode) => {
    if (isRecordingRef.current) {
      stopSessionRef.current(false);
    }
    if (recognizerRef.current) {
      recognizerRef.current.abort();
      recognizerRef.current = null;
    }
    setSelectedMode(newMode);
    localStorage.setItem('readbuddy_lesson_mode', newMode);
    setCurrentIndex(0);
    setHasAttempted(false);
    setRawTranscript('');
  };

  // Reset or initialize word list when current item or mode changes
  useEffect(() => {
    if (!currentItem) return;
    if (isRecordingRef.current) {
      stopSessionRef.current(false);
    }
    const initialWords = currentItem.text
      .trim()
      .split(/\s+/)
      .map((word) => ({
        expected: word,
        cleaned: word.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, ''),
        status: 'pending' as const,
        syllables:
          currentItem.syllablesMap[
            word.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, '')
          ],
      }));
    setWordAnalysisList(initialWords);
    setRawTranscript('');
    setIsRecording(false);
    isRecordingRef.current = false;
    setRecordingSeconds(0);
    setIsAutoStoppedCap(false);
    setShowCelebration(false);
    setHasAttempted(false);
    lastSoundFeedbackSigRef.current = '';
  }, [currentItem?.id, selectedMode, language]);

  // Keep recognizer language in sync
  useEffect(() => {
    if (recognizerRef.current) {
      recognizerRef.current.setLanguage(language);
    }
  }, [language]);

  // Handle Live Transcript updates (accumulates across auto-restarts)
  const handleTranscript = (transcript: string) => {
    setRawTranscript(transcript);
    setHasAttempted(true);
    const analysis = analyzeSpokenText(
      currentItem.text,
      transcript,
      language,
      currentItem.syllablesMap,
      true // Live listening: trailing unsaid words stay pending
    );
    setWordAnalysisList(analysis);

    // Audio chime on evaluation: Green chime or soft red encouragement
    const spokenWords = analysis.filter((w) => w.status !== 'pending');
    if (spokenWords.length > 0) {
      const signature = spokenWords.map((w) => `${w.cleaned}:${w.status}`).join('|');
      if (signature !== lastSoundFeedbackSigRef.current) {
        lastSoundFeedbackSigRef.current = signature;
        const allCorrect = spokenWords.every((w) => w.status === 'correct');
        if (allCorrect && spokenWords.length === analysis.length) {
          playSuccessChime();
        } else if (spokenWords.some((w) => w.status === 'needs-practice')) {
          playEncouragingTone();
        }
      }
    }
  };

  // Stop reading session & calculate rewards
  const stopSession = async (isAutoCap: boolean = false) => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    setIsRecording(false);
    setHasAttempted(true);

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (isAutoCap) {
      setIsAutoStoppedCap(true);
    }

    // Stop speech recognition and wait until onend fires (or at most 1500 ms)
    let finalTranscript = '';
    if (recognizerRef.current) {
      finalTranscript = await recognizerRef.current.stopAndWait(1500);
    }

    // Prefer recognizer.getLatestTranscript() over React state rawTranscript to avoid stale values
    if (!finalTranscript) {
      finalTranscript = (recognizerRef.current?.getLatestTranscript() || rawTranscript || '').trim();
    }
    const totalResults = recognizerRef.current?.getTotalResultsReceived() || 0;
    const speechDetected = recognizerRef.current?.isSpeechDetected() || false;
    const errCode = recognizerRef.current?.getLastErrorCode();

    console.log('[Speech] PROCESSING FINAL TRANSCRIPT:', finalTranscript);

    // Call abort() and clean up recognizer only after reading getLatestTranscript()
    if (recognizerRef.current) {
      recognizerRef.current.abort();
      recognizerRef.current = null;
    }

    // Stop audio recording safely if active
    if (audioRecorderRef.current.isRecording()) {
      try {
        await audioRecorderRef.current.stop();
      } catch (e) {
        console.warn('[ReadingView] Audio recording stop warning:', e);
      }
    }
    setSessionAudioUrl(null);

    const elapsedSeconds = Math.max(2, Math.round((Date.now() - startTimeRef.current) / 1000));
    addSessionTime(elapsedSeconds);

    // 1. Run AI Speech Analyzer Pipeline (Scoring uses speech recognition only)
    setAnalyzerStatus('ANALYZING');
    const analysis = await analyzeSpeech({
      audioBlob: null,
      targetText: currentItem.text,
      recognizedText: finalTranscript,
      language,
      exerciseType: selectedMode,
      syllablesMap: currentItem.syllablesMap,
      totalResultsReceived: totalResults,
      speechDetected,
      errorCode: errCode,
    });
    setAnalysisResult(analysis);
    setAnalyzerStatus('COMPLETE');

    // Only treat it as "not heard" if recognition ended with NO speech detected AND no text:
    if (!analysis.speechDetected && !finalTranscript && totalResults === 0 && !speechDetected) {
      setIsEmptyTranscript(true);
      setLastErrorCode(errCode || 'no-speech');
      setShowCelebration(true);
      playEncouragingTone();

      // In single or two-word mode, mark remaining as needs-practice
      if (selectedMode === 'word' || selectedMode === 'two-words') {
        setWordAnalysisList((prev) =>
          prev.map((w) => (w.status === 'pending' ? { ...w, status: 'needs-practice' as const } : w))
        );
      }
      return;
    }

    setIsEmptyTranscript(false);
    setLastErrorCode(null);

    // Apply analyzer word analysis list
    let finalAnalysis = analysis.wordResults;
    if (selectedMode === 'word' || selectedMode === 'two-words') {
      finalAnalysis = finalAnalysis.map((w) =>
        w.status === 'pending' ? { ...w, status: 'needs-practice' as const } : w
      );
    }
    setWordAnalysisList(finalAnalysis);

    const calculatedClarity = analysis.clarityScore;
    setSessionAccuracy(calculatedClarity);

    // 2. Stars depend on score:
    const starsEarned = analysis.starsEarned;
    setStarsAwarded(starsEarned);
    addStars(starsEarned);
    updateBadgeProgress('clearer-every-day', calculatedClarity >= 80 ? 1 : 0);
    updateBadgeProgress('bilingual-voice', 1);

    // Play final sound feedback
    if (calculatedClarity >= 70) {
      playSuccessChime();
    } else {
      playEncouragingTone();
    }

    // Collect weak sound substitutions
    const subsToLog: Array<{
      expectedSound: string;
      spokenSound: string;
      exampleWord: string;
      lang: AppLanguage;
    }> = [];
    const identifiedSubsLabels = analysis.identifiedSubstitutions;

    finalAnalysis.forEach((w) => {
      if (w.status === 'needs-practice' && w.detectedSubstitution) {
        subsToLog.push({
          expectedSound: w.detectedSubstitution.expectedSound,
          spokenSound: w.detectedSubstitution.spokenSound,
          exampleWord: `${w.cleaned} ➔ ${w.spoken || '?'}`,
          lang: language,
        });
      }
    });

    if (subsToLog.length > 0) {
      await recordSubstitutions(subsToLog);
    }

    // Record session in Speech Profile Engine
    recordSessionInSpeechProfile(
      finalAnalysis,
      elapsedSeconds,
      language,
      calculatedClarity
    );

    // Save recording record in session history (voice recording added in separate step if enabled)
    const recToSave: SavedRecording = {
      id: `rec-${Date.now()}`,
      timestamp: Date.now(),
      dateFormatted: 'Just now',
      paragraphId: currentItem.id,
      paragraphTitle: currentItem.title,
      language,
      accuracy: calculatedClarity,
      durationSeconds: elapsedSeconds,
      audioBlob: undefined,
      identifiedSubstitutions: identifiedSubsLabels,
      expectedText: currentItem.text,
      heardTranscript: finalTranscript,
      errorCode: errCode || undefined,
      recognitionLanguage: language === 'hi' ? 'hi-IN' : 'en-IN',
    };
    await saveRecording(recToSave);
    setLastSavedRecord(recToSave);
    updateBadgeProgress('first-recording', 1);

    // Show celebration modal
    setShowCelebration(true);

    // Confetti only for good score
    if (calculatedClarity >= 70) {
      triggerParagraphSuccessConfetti();
    }

    // Check if daily session target was reached during this reading
    const updatedProfile = getChildProfile();
    const sessionMin = Math.floor(updatedProfile.todaySessionSeconds / 60);
    if (sessionMin >= (updatedProfile.dailyCapMinutes || 15)) {
      setTimeout(() => {
        triggerDailySessionCompleteConfetti();
      }, 700);
    }

    onSessionComplete?.();
  };

  stopSessionRef.current = stopSession;

  // Start reading session
  const startSession = () => {
    // Prevent multiple rapid taps
    if (isRecordingRef.current) return;
    isRecordingRef.current = true;
    setIsRecording(true);

    setRawTranscript('');
    setRecordingSeconds(0);
    setIsAutoStoppedCap(false);
    setHasAttempted(false);
    setIsEmptyTranscript(false);
    setLastErrorCode(null);
    setSessionAudioUrl(null);
    setRecogState('LISTENING');
    lastSoundFeedbackSigRef.current = '';
    startTimeRef.current = Date.now();

    // Start timer with 3-minute safety cap (180 seconds)
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setRecordingSeconds((prev) => {
        const next = prev + 1;
        if (next >= 180) {
          // Trigger 3-minute safety cap stop
          setTimeout(() => {
            stopSessionRef.current(true);
          }, 0);
        }
        return next;
      });
    }, 1000);

    // GOLDEN REFERENCE: Synchronously create and start SpeechRecognizer in the user-gesture tick
    if (recognizerRef.current) {
      recognizerRef.current.abort();
      recognizerRef.current = null;
    }

    const freshRecognizer = new SpeechRecognizer(language);
    recognizerRef.current = freshRecognizer;

    console.log('[READ DEBUG] recognition created', {
      language,
      continuous: true,
      interimResults: true,
    });
    console.log('[READ DEBUG] recognition.start called');

    const saveVoiceRecordingEnabled = getAppSettings().saveVoiceRecording;

    freshRecognizer.start(
      (transcript) => {
        console.log('[READ DEBUG] onresult transcript:', transcript);
        handleTranscript(transcript);
      },
      (error) => {
        console.log('[READ DEBUG] onerror:', error);
        setLastErrorCode(error);
        if (
          error === 'not-allowed' ||
          error === 'service-not-allowed' ||
          error === 'audio-capture'
        ) {
          setMicPermissionState('denied');
          stopSession(false);
        }
      },
      (active) => {
        console.log('[READ DEBUG] current recognition state active:', active);
        setRecogState(active ? 'LISTENING' : 'IDLE');
      },
      (diagEvent: SpeechDiagnosticEvent) => {
        const d = diagEvent.details;
        switch (diagEvent.type) {
          case 'onstart':
            console.log('[READ DEBUG] recognition onstart');
            setMicPermissionState('granted');
            setRecognitionEndedTime(null);
            setSpeechDetectedFlag(false);
            setAnalyzerStatus('LISTENING');
            break;
          case 'onaudiostart':
            console.log('[READ DEBUG] onaudiostart (audio capture started)');
            break;
          case 'onspeechstart':
            console.log('[READ DEBUG] speechstart');
            setSpeechDetectedFlag(true);
            break;
          case 'onresult':
            setSpeechDetectedFlag(true);
            console.log('[READ DEBUG] onresult', {
              transcript: d?.fullTranscript,
              isFinal: d?.isFinal,
              finalText: d?.finalText,
              interimText: d?.interimText,
              confidence: d?.confidence,
              alternatives: d?.alternatives,
            });
            break;
          case 'onspeechend':
            console.log('[READ DEBUG] speechend');
            break;
          case 'onaudioend':
            console.log('[READ DEBUG] onaudioend');
            break;
          case 'onend':
            setRecognitionEndedTime(new Date().toLocaleTimeString());
            console.log('[READ DEBUG] onend', {
              fullTranscript: d?.fullTranscript,
            });
            break;
          case 'onerror':
            if (d?.errorCode === 'not-allowed' || d?.errorCode === 'service-not-allowed') {
              setMicPermissionState('denied');
            }
            console.log('[READ DEBUG] onerror', {
              errorCode: d?.errorCode,
              errorMessage: d?.errorMessage,
            });
            break;
        }
      }
    );
  };

  const handleStartVoiceRecording = async () => {
    // Make sure speech recognizer is fully stopped and aborted
    if (recognizerRef.current) {
      recognizerRef.current.abort();
      recognizerRef.current = null;
    }
    setVoiceRecError(null);
    setVoiceRecSeconds(0);
    setIsVoiceRecordingActive(true);

    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    voiceTimerRef.current = setInterval(() => {
      setVoiceRecSeconds((prev) => prev + 1);
    }, 1000);

    const success = await audioRecorderRef.current.start();
    if (!success) {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
      setIsVoiceRecordingActive(false);
      setVoiceRecError(
        language === 'en'
          ? 'We could not access the microphone, please check permissions.'
          : 'माइक एक्सेस नहीं हो सका, कृपया अनुमति जाँचें।'
      );
    }
  };

  const handleStopVoiceRecording = async () => {
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }

    const recResult = await audioRecorderRef.current.stop();
    setIsVoiceRecordingActive(false);

    if (!recResult || !recResult.blob || recResult.blob.size === 0 || recResult.isSilent) {
      setVoiceRecError(
        language === 'en'
          ? 'We could not record clearly, please try again'
          : 'हम स्पष्ट रूप से रिकॉर्ड नहीं कर सके, कृपया पुनः प्रयास करें'
      );
      return;
    }

    setVoiceRecError(null);
    const url = URL.createObjectURL(recResult.blob);
    setSessionAudioUrl(url);

    if (lastSavedRecord) {
      const updatedRecord: SavedRecording = {
        ...lastSavedRecord,
        audioBlob: recResult.blob,
        audioUrl: url,
        durationSeconds: recResult.durationSeconds || lastSavedRecord.durationSeconds,
      };
      await saveRecording(updatedRecord);
      setLastSavedRecord(updatedRecord);
    }
  };

  const handleWordPracticed = (practicedWord: string) => {
    setWordAnalysisList((prev) =>
      prev.map((w) => (w.cleaned === practicedWord ? { ...w, status: 'correct' as const } : w))
    );
    playSuccessChime();
  };

  // Demo simulation button: Allows child or tester to simulate speech recognition
  const handleSimulateSpeech = () => {
    setHasAttempted(true);
    const textWords = currentItem.text.split(/\s+/);
    if (selectedMode === 'word' || selectedMode === 'two-words') {
      // Simulate successful pronunciation
      handleTranscript(currentItem.text);
    } else {
      // Simulate sentence with intentional subtle substitution to show both green & red
      const simulatedWords = textWords.map((w, i) => {
        if (i === 1 && language === 'en') return 'wabbit';
        if (i === 3 && language === 'hi') return 'सेर';
        return w;
      });
      handleTranscript(simulatedWords.join(' '));
    }
  };

  // Single / Two words calculation
  const isShortMode = selectedMode === 'word' || selectedMode === 'two-words';
  const hasSpoken = hasAttempted || wordAnalysisList.some((w) => w.status !== 'pending');
  const allWordsCorrect =
    wordAnalysisList.length > 0 && wordAnalysisList.every((w) => w.status === 'correct');
  const hasRedWords = wordAnalysisList.some((w) => w.status === 'needs-practice');
  const firstRedWord = wordAnalysisList.find((w) => w.status === 'needs-practice');

  // Syllables breakdown for display
  const rawWords = currentItem.text.trim().split(/\s+/);
  const displaySyllables = rawWords
    .map(
      (w) =>
        currentItem.syllablesMap[w.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, '')] ||
        w
    )
    .join(' · ');

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-28">
      {/* 1. LESSON MODES SELECTOR PILLS */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5 px-0.5">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            {language === 'en' ? 'Lesson Mode' : 'अभ्यास स्तर'}
          </span>
          <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            {language === 'en' ? 'CBSE Step-by-Step' : 'क्रमबद्ध अभ्यास'}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-200/70 rounded-2xl">
          {/* Mode 1: Single Word */}
          <button
            onClick={() => handleModeChange('word')}
            className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all ${
              selectedMode === 'word'
                ? 'bg-indigo-600 text-white shadow-xs scale-102'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span className="block leading-tight">{language === 'en' ? '1 Word' : '१ शब्द'}</span>
            <span className="block text-[9px] opacity-80 font-normal">
              {language === 'en' ? 'Single' : 'एकल'}
            </span>
          </button>

          {/* Mode 2: Two Words */}
          <button
            onClick={() => handleModeChange('two-words')}
            className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all ${
              selectedMode === 'two-words'
                ? 'bg-indigo-600 text-white shadow-xs scale-102'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span className="block leading-tight">{language === 'en' ? '2 Words' : '२ शब्द'}</span>
            <span className="block text-[9px] opacity-80 font-normal">
              {language === 'en' ? 'Pairs' : 'जोड़े'}
            </span>
          </button>

          {/* Mode 3: One Line */}
          <button
            onClick={() => handleModeChange('line')}
            className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all ${
              selectedMode === 'line'
                ? 'bg-indigo-600 text-white shadow-xs scale-102'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span className="block leading-tight">{language === 'en' ? '1 Line' : '१ पंक्ति'}</span>
            <span className="block text-[9px] opacity-80 font-normal">
              {language === 'en' ? 'Sentence' : 'वाक्य'}
            </span>
          </button>

          {/* Mode 4: Paragraph */}
          <button
            onClick={() => handleModeChange('paragraph')}
            className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all ${
              selectedMode === 'paragraph'
                ? 'bg-indigo-600 text-white shadow-xs scale-102'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span className="block leading-tight">{language === 'en' ? 'Story' : 'पाठ'}</span>
            <span className="block text-[9px] opacity-80 font-normal">
              {language === 'en' ? 'Paragraph' : 'अनुच्छेद'}
            </span>
          </button>
        </div>
      </div>

      {/* Top Controls: Item Navigator & Font Size Toggle */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              setCurrentIndex((prev) => (prev > 0 ? prev - 1 : lessonItems.length - 1))
            }
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 active:scale-95 transition"
            title="Previous item"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-600 px-2 py-0.5 bg-white border border-slate-200 rounded-lg font-mono">
            {currentIndex + 1} / {lessonItems.length}
          </span>
          <button
            onClick={() =>
              setCurrentIndex((prev) => (prev < lessonItems.length - 1 ? prev + 1 : 0))
            }
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 active:scale-95 transition"
            title="Next item"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Listen Button for the current word/line */}
          <button
            onClick={() => speakWord(currentItem.text, language, 'slow')}
            title="Listen to slow pronunciation"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 active:scale-95 transition"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{language === 'en' ? 'Listen' : 'सुनें'}</span>
          </button>

          {/* Extra Large Text Toggle */}
          <button
            onClick={() => setExtraLargeText((prev) => !prev)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition active:scale-95 ${
              extraLargeText
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>{extraLargeText ? 'Aa+' : 'Aa'}</span>
          </button>
        </div>
      </div>

      {/* Prominent Recording Banner with Running Timer */}
      {isRecording && (
        <div className="bg-rose-50 border border-rose-200/90 rounded-2xl p-3 mb-3 flex items-center justify-between shadow-2xs animate-pulse">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
            </span>
            <span className="text-xs font-bold text-rose-900">
              {language === 'en' ? 'Recording in progress...' : 'रिकॉर्डिंग जारी है...'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-black text-rose-700 tabular-nums bg-white px-2.5 py-0.5 rounded-lg border border-rose-200 shadow-2xs">
              {formatTimer(recordingSeconds)} / 3:00
            </span>
            <span className="text-[10px] text-rose-600 font-semibold hidden sm:inline">
              {language === 'en' ? 'Tap stop when done' : 'समाप्त होने पर रोकें'}
            </span>
          </div>
        </div>
      )}

      {/* 2. DYNAMIC CONTENT CARD ACCORDING TO LESSON MODE */}
      {isShortMode ? (
        /* =========================================================================
           SINGLE WORD & TWO WORDS MODE: Large Result Panel (Green / Red)
           ========================================================================= */
        <div className="mb-4 transition-all">
          {hasSpoken && allWordsCorrect ? (
            /* --- LARGE GREEN RESULT PANEL --- */
            <div className="bg-emerald-50/95 border-2 border-emerald-300 rounded-3xl p-6 text-center shadow-md animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-full bg-emerald-500 text-white mx-auto flex items-center justify-center text-3xl font-black mb-3 shadow-md shadow-emerald-500/30">
                ✓
              </div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full inline-block mb-2">
                {language === 'en' ? 'Super Clear Pronunciation! ⭐' : 'शानदार स्पष्ट उच्चारण! ⭐'}
              </span>

              <h2
                className={`text-4xl sm:text-5xl font-black text-emerald-950 mb-3 tracking-tight ${
                  language === 'hi' ? 'font-hindi' : ''
                }`}
              >
                {currentItem.text}
              </h2>

              {/* Syllables pill */}
              <div className="inline-block px-3.5 py-1.5 bg-white text-emerald-800 text-sm font-bold rounded-xl border border-emerald-200 mb-4 shadow-2xs">
                {displaySyllables}
              </div>

              <div className="flex items-center justify-center gap-2 mb-2">
                <BuddyMascot mood="cheering" size="sm" showSpeechBubble={false} />
                <span className="text-xs font-bold text-emerald-900">
                  {language === 'en'
                    ? 'Perfect sound! You nailed it!'
                    : 'बिल्कुल सही! बहुत सुंदर उच्चारण!'}
                </span>
              </div>
            </div>
          ) : hasSpoken && hasRedWords ? (
            /* --- LARGE SOFT RED RESULT PANEL --- */
            <div className="bg-rose-50/95 border-2 border-rose-300 rounded-3xl p-6 text-center shadow-md animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-full bg-rose-500 text-white mx-auto flex items-center justify-center text-2xl font-black mb-3 shadow-md shadow-rose-500/30">
                ✕
              </div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-rose-800 bg-rose-100 px-3 py-1 rounded-full inline-block mb-2">
                {language === 'en' ? 'Try Once More' : 'एक बार फिर प्रयास करें'}
              </span>

              <h2
                className={`text-4xl sm:text-5xl font-black text-rose-950 mb-3 tracking-tight ${
                  language === 'hi' ? 'font-hindi' : ''
                }`}
              >
                {currentItem.text}
              </h2>

              {/* Syllables pill */}
              <div className="inline-block px-3.5 py-1.5 bg-white text-rose-800 text-sm font-bold rounded-xl border border-rose-200 mb-4 shadow-2xs">
                {displaySyllables}
              </div>

              <div className="flex items-center justify-center gap-2 mb-4">
                <BuddyMascot mood="encouraging" size="sm" showSpeechBubble={false} />
                <span className="text-xs font-bold text-rose-900">
                  {language === 'en'
                    ? 'Nice try! Tap below to practice slowly with Buddy'
                    : 'बहुत अच्छा प्रयास! धीमे अभ्यास के लिए नीचे टैप करें'}
                </span>
              </div>

              {/* Retry with Word Help Modal */}
              <button
                onClick={() => {
                  if (firstRedWord) setSelectedWordForHelp(firstRedWord);
                }}
                className="w-full max-w-xs mx-auto py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/30 active:scale-95 transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>
                  {language === 'en'
                    ? 'Practice with Word Helper'
                    : 'सहायक से धीमा अभ्यास करें'}
                </span>
              </button>
            </div>
          ) : (
            /* --- INITIAL / IDLE CARD FOR SHORT MODES --- */
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200/80 text-center">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 text-xs">
                <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  {currentItem.grade}
                </span>
                <span className="text-slate-400 font-medium">{currentItem.category}</span>
              </div>

              <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider block mb-1">
                {selectedMode === 'word'
                  ? language === 'en'
                    ? 'Target Single Word'
                    : 'लक्ष्य शब्द'
                  : language === 'en'
                  ? 'Target Two Words'
                  : 'लक्ष्य दो शब्द'}
              </span>

              <h2
                className={`text-4xl sm:text-5xl font-black text-slate-900 tracking-tight my-4 ${
                  language === 'hi' ? 'font-hindi' : ''
                }`}
              >
                {currentItem.text}
              </h2>

              {/* Syllables breakdown pill */}
              <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm font-extrabold rounded-xl border border-indigo-100 shadow-2xs">
                  {displaySyllables}
                </span>
                <button
                  onClick={() => speakWord(currentItem.text, language, 'slow')}
                  title="Listen slow"
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-indigo-600 transition"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                {language === 'en'
                  ? 'Tap the mic below and read out loud!'
                  : 'नीचे माइक दबाकर स्पष्ट आवाज़ में बोलें!'}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* =========================================================================
           LINE & PARAGRAPH MODE: Inline Word Coloring (Green ✓ / Red ✕)
           ========================================================================= */
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200/80 mb-4 transition-all">
          <div className="flex items-center justify-between gap-2 pb-2 mb-3 border-b border-slate-100 text-xs">
            <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
              {currentItem.grade}
            </span>
            <span className="text-slate-400 font-medium">{currentItem.category}</span>
          </div>

          <h1
            className={`text-lg sm:text-xl font-bold text-slate-900 mb-3 tracking-tight ${
              language === 'hi' ? 'font-hindi' : ''
            }`}
          >
            {currentItem.title}
          </h1>

          {/* Main Text with Green (✓) and Red (✕) Word Highlighting */}
          <div
            className={`leading-relaxed tracking-normal select-none transition-all ${
              extraLargeText
                ? 'text-2xl sm:text-3xl space-y-3'
                : selectedMode === 'line'
                ? 'text-xl sm:text-2xl space-y-2'
                : 'text-lg sm:text-xl space-y-2'
            } ${language === 'hi' ? 'font-hindi leading-loose' : ''}`}
          >
            {wordAnalysisList.map((item, index) => {
              const isCorrect = item.status === 'correct';
              const isNeedsPractice = item.status === 'needs-practice';
              const isNotHeard = item.status === 'not-heard';

              return (
                <span
                  key={index}
                  onClick={() => {
                    if (isNeedsPractice || isNotHeard || isCorrect) {
                      setSelectedWordForHelp(item);
                    }
                  }}
                  className={`inline-flex items-center gap-1 mr-1.5 px-2 py-0.5 rounded-lg cursor-pointer transition-colors duration-150 ${
                    isCorrect
                      ? 'bg-emerald-100 text-emerald-950 font-semibold border-b-2 border-emerald-500 shadow-2xs'
                      : isNeedsPractice
                      ? 'bg-rose-100 text-rose-950 font-bold border-b-2 border-rose-400 shadow-xs animate-pulse-once'
                      : isNotHeard
                      ? 'bg-amber-100 text-amber-950 font-bold border-b-2 border-amber-400 shadow-xs'
                      : 'text-slate-800 hover:bg-slate-100'
                  }`}
                  title={
                    isNeedsPractice
                      ? language === 'en'
                        ? 'Tap for pronunciation and slow syllable help!'
                        : 'उच्चारण और धीमे अभ्यास के लिए टैप करें!'
                      : isNotHeard
                      ? language === 'en'
                        ? 'Not heard - tap to say this word again'
                        : 'सुना नहीं गया - फिर से बोलने के लिए टैप करें'
                      : ''
                  }
                >
                  <span>{item.expected}</span>
                  {/* Green Tick, Red Cross, or Amber Question badge */}
                  {isCorrect && (
                    <span className="text-emerald-700 text-xs font-black">✓</span>
                  )}
                  {isNeedsPractice && (
                    <span className="w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center font-bold">
                      ✕
                    </span>
                  )}
                  {isNotHeard && (
                    <span className="w-3.5 h-3.5 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center font-bold">
                      ?
                    </span>
                  )}
                </span>
              );
            })}
          </div>

          {/* Legend reminder: Green (✓), Red (✕), and Amber (?) */}
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
              <span className="flex items-center gap-1 font-semibold text-emerald-800">
                <span className="w-3 h-3 rounded-full bg-emerald-500 text-white text-[8px] flex items-center justify-center font-bold">
                  ✓
                </span>
                <span>{language === 'en' ? 'Clear' : 'स्पष्ट'}</span>
              </span>
              <span className="flex items-center gap-1 font-semibold text-rose-800">
                <span className="w-3 h-3 rounded-full bg-rose-500 text-white text-[8px] flex items-center justify-center font-bold">
                  ✕
                </span>
                <span>
                  {language === 'en' ? 'Needs practice' : 'अभ्यास चाहिए'}
                </span>
              </span>
              <span className="flex items-center gap-1 font-semibold text-amber-800">
                <span className="w-3 h-3 rounded-full bg-amber-500 text-white text-[8px] flex items-center justify-center font-bold">
                  ?
                </span>
                <span>
                  {language === 'en' ? 'Not heard (tap to retry)' : 'सुना नहीं (टैप करें)'}
                </span>
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              {language === 'en' ? 'Lenient matching' : 'सरल मूल्यांकन'}
            </span>
          </div>

          {/* Buddy Encouragement Banner when Red Words are Present */}
          {wordAnalysisList.some((w) => w.status === 'needs-practice') && (
            <div className="mt-3 p-3 rounded-2xl bg-rose-50/90 border border-rose-200/90 flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <BuddyMascot mood="encouraging" size="sm" showSpeechBubble={false} />
                <div>
                  <span className="block text-xs font-bold text-rose-950">
                    {language === 'en' ? 'Nice try! Once more?' : 'बहुत अच्छा प्रयास! एक बार और?'}
                  </span>
                  <span className="block text-[10px] text-rose-800">
                    {language === 'en'
                      ? 'Tap any red word above for slow syllable help'
                      : 'धीमे उच्चारण अभ्यास के लिए किसी भी लाल शब्द को टैप करें'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Target Sounds Highlight */}
      <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-indigo-900 font-medium">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>
            {language === 'en' ? 'Focus Sounds in this lesson:' : 'इस पाठ की मुख्य ध्वनियाँ:'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {currentItem.targetSounds.map((snd, idx) => (
            <span
              key={idx}
              className="bg-white text-indigo-700 font-bold text-xs px-2 py-0.5 rounded-md border border-indigo-200 shadow-2xs"
            >
              /{snd}/
            </span>
          ))}
        </div>
      </div>

      {/* Live transcript & child-friendly recognition state preview (Requirement 17) */}
      {isRecording && (
        <div className="bg-indigo-50/90 rounded-2xl p-3.5 mb-4 border border-indigo-200/90 text-xs shadow-xs animate-in fade-in">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 font-bold text-indigo-950">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>
                {recogState === 'SPEECH_DETECTED'
                  ? language === 'en'
                    ? 'Great! I heard you. Keep speaking…'
                    : 'बहुत बढ़िया! मैंने सुना, बोलते रहिए…'
                  : recogState === 'WAITING_FOR_SILENCE' || recogState === 'PROCESSING'
                  ? language === 'en'
                    ? 'Processing…'
                    : 'जाँच रहे हैं…'
                  : language === 'en'
                  ? 'Listening… 🎤 (Say words at your pace)'
                  : 'सुन रहे हैं… 🎤 (अपनी गति से बोलें)'}
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
              {formatTimer(recordingSeconds)}
            </span>
          </div>
          {rawTranscript ? (
            <p className="italic font-bold text-slate-900 bg-white/90 p-2 rounded-xl border border-indigo-100 break-words">
              "{rawTranscript}"
            </p>
          ) : (
            <p className="text-[11px] text-indigo-700/80 italic">
              {selectedMode === 'word'
                ? language === 'en'
                  ? `Say "${currentItem.text}" clearly into the mic`
                  : `माइक के पास आकर "${currentItem.text}" बोलें`
                : language === 'en'
                ? 'Speak clearly into the phone microphone…'
                : 'फोन के माइक के पास स्पष्ट आवाज़ में बोलें…'}
            </p>
          )}
        </div>
      )}

      {/* Large Thumb-Friendly Mic Button (Anchor) */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pointer-events-none z-30">
        <div className="max-w-md mx-auto flex items-center justify-center gap-3 pointer-events-auto">
          {!isRecording ? (
            <button
              onClick={startSession}
              className="flex-1 max-w-xs h-14 rounded-2xl bg-indigo-600 text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition"
            >
              <Mic className="w-6 h-6" />
              <span>
                {selectedMode === 'word'
                  ? language === 'en'
                    ? 'Speak Word'
                    : 'शब्द बोलें'
                  : selectedMode === 'two-words'
                  ? language === 'en'
                    ? 'Speak Words'
                    : 'शब्द बोलें'
                  : selectedMode === 'line'
                  ? language === 'en'
                    ? 'Read Line'
                    : 'पंक्ति पढ़ें'
                  : language === 'en'
                  ? 'Start Reading'
                  : 'पढ़ना शुरू करें'}
              </span>
            </button>
          ) : (
            <button
              onClick={() => stopSession(false)}
              className="flex-1 max-w-xs h-14 rounded-2xl bg-rose-600 text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-lg shadow-rose-600/35 mic-active hover:bg-rose-700 active:scale-95 transition"
            >
              <Square className="w-5 h-5 fill-white shrink-0" />
              <div className="flex flex-col items-start leading-tight">
                <span className="text-sm font-bold">
                  {language === 'en' ? 'Finish & Check' : 'समाप्त करें'}
                </span>
                <span className="text-[10px] font-mono text-rose-100 font-medium">
                  {formatTimer(recordingSeconds)} (tap to stop)
                </span>
              </div>
            </button>
          )}

          {/* Quick Demo Helper Button */}
          {!isRecording && (
            <button
              onClick={handleSimulateSpeech}
              title="Practice simulation (useful for testing or quiet rooms)"
              className="h-14 px-3 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center shadow-xs active:scale-95 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Word Help Modal */}
      {selectedWordForHelp && (
        <WordHelpModal
          wordAnalysis={selectedWordForHelp}
          language={language}
          onClose={() => setSelectedWordForHelp(null)}
          onWordPracticed={handleWordPracticed}
        />
      )}

      {/* Session Result / Celebration Modal */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          {isEmptyTranscript ? (
            /* 4. Empty Transcript: We couldn't hear you */
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center border border-slate-100 animate-in zoom-in-95">
              <div className="mx-auto flex items-center justify-center mb-3">
                <BuddyMascot mood="encouraging" size="md" showSpeechBubble={false} />
              </div>

              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 mx-auto flex items-center justify-center mb-2">
                <MicOff className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-black text-slate-900">
                {language === 'en' ? "We couldn't hear you" : 'हम आपकी आवाज़ नहीं सुन पाए'}
              </h3>
              <p className="mt-2.5 text-xs font-semibold text-rose-800 bg-rose-50 p-3 rounded-2xl border border-rose-200/90 leading-relaxed text-left">
                {getFriendlySpeechErrorMessage(lastErrorCode, language)}
              </p>
              {lastErrorCode && (
                <span className="block mt-1 text-[10px] text-slate-400 font-mono text-center">
                  Error Code: {lastErrorCode}
                </span>
              )}

              <div className="my-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
                {language === 'en'
                  ? 'Tip: Hold the device closer, check mic volume, or speak slightly louder.'
                  : 'सुझाव: फोन पास रखें, माइक वॉल्यूम जाँचें, या थोड़ा और स्पष्ट बोलें।'}
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    if (recognizerRef.current) {
                      recognizerRef.current.abort();
                      recognizerRef.current = null;
                    }
                    setShowCelebration(false);
                    setIsEmptyTranscript(false);
                    startSession();
                  }}
                  className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 active:scale-98 transition shadow-xs flex items-center justify-center gap-2"
                >
                  <Mic className="w-4 h-4" />
                  <span>{language === 'en' ? 'Try Again (Tap to Speak)' : 'फिर से बोलें'}</span>
                </button>
                <button
                  onClick={() => {
                    if (recognizerRef.current) {
                      recognizerRef.current.abort();
                      recognizerRef.current = null;
                    }
                    setShowCelebration(false);
                    setIsEmptyTranscript(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 active:scale-98 transition"
                >
                  {language === 'en' ? 'Close' : 'बंद करें'}
                </button>
              </div>
            </div>
          ) : (
            /* 1, 2, 3. Real Score, Dynamic Headline, and Buddy Robot Message */
            (() => {
              const feedback =
                sessionAccuracy >= 90
                  ? {
                      headline: language === 'en' ? 'Outstanding Reading! 🌟' : 'अद्भुत पठन! 🌟',
                      subtext:
                        language === 'en'
                          ? 'Your speech rhythm was crystal clear and confident!'
                          : 'आपकी आवाज़ और उच्चारण बिल्कुल स्पष्ट और आत्मविश्वास से भरपूर था!',
                      buddyMood: 'cheering' as const,
                      colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
                    }
                  : sessionAccuracy >= 70
                  ? {
                      headline: language === 'en' ? 'Good Job! 👍' : 'शाबाश! बहुत अच्छा प्रयास! 👍',
                      subtext:
                        language === 'en'
                          ? 'Good job, a little more practice and you will master this!'
                          : 'बहुत अच्छा काम! थोड़े और अभ्यास से यह बिल्कुल सिद्ध हो जाएगा!',
                      buddyMood: 'greeting' as const,
                      colorClass: 'text-indigo-700 bg-indigo-50 border-indigo-200',
                    }
                  : {
                      headline: language === 'en' ? 'Nice Try! 🌱' : 'अच्छा प्रयास! 🌱',
                      subtext:
                        language === 'en'
                          ? "Nice try! Let's do it once more together."
                          : 'अच्छा प्रयास! आइए मिलकर एक बार और अभ्यास करते हैं।',
                      buddyMood: 'encouraging' as const,
                      colorClass: 'text-rose-700 bg-rose-50 border-rose-200',
                    };

              return (
                <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center border border-slate-100 animate-in zoom-in-95">
                  <div className="mx-auto flex items-center justify-center mb-2">
                    <BuddyMascot mood={feedback.buddyMood} size="lg" showSpeechBubble={false} />
                  </div>

                  <h3 className="text-xl font-black text-slate-900">
                    {feedback.headline}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600">
                    {feedback.subtext}
                  </p>

                  {isAutoStoppedCap && (
                    <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold text-center flex items-center justify-center gap-1.5">
                      <span>⏰</span>
                      <span>
                        {language === 'en'
                          ? '3-minute safety limit reached! Great reading session!'
                          : '३ मिनट की समय सीमा पूरी हुई! बेहतरीन अभ्यास सत्र!'}
                      </span>
                    </div>
                  )}

                  <div className="my-5 grid grid-cols-2 gap-3">
                    <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
                      <span className="text-2xl font-black text-amber-600">+{starsAwarded}</span>
                      <span className="block text-[11px] font-bold text-amber-800 mt-0.5">
                        {language === 'en' ? 'Stars Earned ⭐' : 'सितारे मिले ⭐'}
                      </span>
                    </div>
                    <div className={`p-3 rounded-2xl border ${feedback.colorClass}`}>
                      <span className="text-2xl font-black">{sessionAccuracy}%</span>
                      <span className="block text-[11px] font-bold mt-0.5">
                        {language === 'en' ? 'Speech Clarity' : 'स्पष्टता स्कोर'}
                      </span>
                    </div>
                  </div>

                  {/* Not-heard hint if speech engine missed words */}
                  {analysisResult && analysisResult.notHeardCount > 0 && (
                    <div className="mb-4 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-center gap-1.5 text-center">
                      <span>💡</span>
                      <span>
                        {language === 'en'
                          ? `${analysisResult.notHeardCount} word${analysisResult.notHeardCount > 1 ? 's' : ''} not heard, tap in the lesson to say again`
                          : `${analysisResult.notHeardCount} शब्द सुना नहीं गया, दोबारा बोलने के लिए टैप करें`}
                      </span>
                    </div>
                  )}

                  {/* Real Comparison note: What was expected vs heard */}
                  <div className="mb-4 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-left text-[11px] space-y-1">
                    <div className="flex items-start gap-1 text-slate-500">
                      <span className="font-bold text-slate-700 shrink-0">
                        {language === 'en' ? 'Expected:' : 'मूल:'}
                      </span>
                      <span className="italic truncate">{currentItem.text}</span>
                    </div>
                    <div className="flex items-start gap-1 text-slate-500">
                      <span className="font-bold text-slate-700 shrink-0">
                        {language === 'en' ? 'Heard:' : 'सुना:'}
                      </span>
                      <span className="italic text-indigo-900 font-semibold truncate">
                        {rawTranscript.trim()}
                      </span>
                    </div>
                  </div>

                  {/* Record my voice (for Before vs After) Step (Requirement 3 & 5) */}
                  {saveVoiceRecordingEnabled && (
                    <div className="mb-4">
                      {isVoiceRecordingActive ? (
                        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-center animate-pulse">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <span className="relative flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
                            </span>
                            <span className="text-xs font-bold text-rose-900">
                              {language === 'en' ? 'Recording voice...' : 'आवाज़ रिकॉर्ड हो रही है...'}
                            </span>
                          </div>
                          <span className="block text-sm font-mono font-black text-rose-700 my-1">
                            {formatTimer(voiceRecSeconds)}
                          </span>
                          <button
                            onClick={handleStopVoiceRecording}
                            className="mt-2 w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition shadow-xs cursor-pointer"
                          >
                            <Square className="w-3.5 h-3.5 fill-current" />
                            <span>{language === 'en' ? 'Stop Recording' : 'रिकॉर्डिंग रोकें'}</span>
                          </button>
                        </div>
                      ) : voiceRecError ? (
                        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-2">
                          <p className="text-xs font-bold text-rose-800">
                            {voiceRecError}
                          </p>
                          <button
                            onClick={handleStartVoiceRecording}
                            className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
                          >
                            <Mic className="w-3.5 h-3.5" />
                            <span>{language === 'en' ? 'Retry Voice Recording' : 'पुनः रिकॉर्ड करें'}</span>
                          </button>
                        </div>
                      ) : sessionAudioUrl ? (
                        <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-center space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                              <Volume2 className="w-4 h-4 text-indigo-600" />
                              <span>{language === 'en' ? 'Voice Recording Attached' : 'वॉइस रिकॉर्डिंग संलग्न है'}</span>
                            </div>
                            <button
                              onClick={handleTogglePlaySessionAudio}
                              className="py-1 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 active:scale-95 transition cursor-pointer"
                            >
                              {isPlayingSessionAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                              <span>{isPlayingSessionAudio ? 'Pause' : 'Play'}</span>
                            </button>
                          </div>
                          <span className="block text-[10px] text-indigo-700 font-medium">
                            {language === 'en'
                              ? 'Saved for Before vs After comparison in Parent Section!'
                              : 'अभिभावक अनुभाग में तुलना के लिए सहेजा गया!'}
                          </span>
                          <button
                            onClick={handleStartVoiceRecording}
                            className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                          >
                            {language === 'en' ? 'Record again' : 'फिर से रिकॉर्ड करें'}
                          </button>
                        </div>
                      ) : (
                        <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 text-center">
                          <span className="block text-xs font-bold text-indigo-950 mb-2">
                            {language === 'en' ? 'Record your voice for Before vs After comparison:' : 'तुलना के लिए अपनी आवाज़ रिकॉर्ड करें:'}
                          </span>
                          <button
                            onClick={handleStartVoiceRecording}
                            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition shadow-xs cursor-pointer"
                          >
                            <Mic className="w-4 h-4" />
                            <span>{language === 'en' ? 'Record my voice (for Before vs After)' : 'अपनी आवाज़ रिकॉर्ड करें (तुलना के लिए)'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        if (recognizerRef.current) {
                          recognizerRef.current.abort();
                          recognizerRef.current = null;
                        }
                        setShowCelebration(false);
                        setCurrentIndex((prev) => (prev + 1) % lessonItems.length);
                      }}
                      className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 active:scale-98 transition shadow-xs"
                    >
                      {language === 'en' ? 'Next Lesson' : 'अगला पाठ'}
                    </button>
                    <button
                      onClick={() => {
                        if (recognizerRef.current) {
                          recognizerRef.current.abort();
                          recognizerRef.current = null;
                        }
                        setShowCelebration(false);
                      }}
                      className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 active:scale-98 transition"
                    >
                      {language === 'en' ? 'Review Current Lesson' : 'यही अभ्यास दोबारा देखें'}
                    </button>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Developer Diagnostic Debug Panel (Section 15 Specification) */}
      <div className="mt-8 border-t border-slate-200/60 pt-3">
        <button
          onClick={() => setShowDebugPanel((prev) => !prev)}
          className="text-[10px] font-mono font-bold text-slate-600 hover:text-slate-800 flex items-center gap-1.5 transition cursor-pointer"
        >
          <span>{showDebugPanel ? '▼ Hide Speech Debug Panel (Dev Mode)' : '▶ Show Speech Debug Panel (Dev Mode)'}</span>
        </button>

        {showDebugPanel && (
          <div className="mt-2 p-3 rounded-2xl bg-slate-900 text-slate-200 font-mono text-[10px] space-y-1.5 shadow-inner border border-slate-800">
            <div className="text-emerald-400 font-bold border-b border-slate-800 pb-1 mb-1 flex items-center justify-between">
              <span>SPEECH & AUDIO PIPELINE DIAGNOSTICS</span>
              <span className="text-[9px] text-slate-400 font-normal">Dev Mode Only</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              <div>Microphone permission: <span className={`font-bold ${micPermissionState === 'granted' ? 'text-emerald-400' : 'text-rose-400'}`}>{micPermissionState}</span></div>
              <div>Audio stream: <span className="text-white font-bold">{audioDiagnostic?.audioTrackStatus === 'LIVE' ? 'active' : isRecording ? 'active' : 'inactive'}</span></div>
              <div>Audio track: <span className="text-white font-bold">{audioDiagnostic?.audioTrackStatus === 'LIVE' ? 'live' : 'ended'}</span></div>
              <div>Track enabled: <span className="text-white font-bold">{String(audioDiagnostic?.trackEnabled ?? true)}</span></div>
              <div>Track muted: <span className="text-white font-bold">{String(audioDiagnostic?.trackMuted ?? false)}</span></div>
              <div>MediaRecorder: <span className="text-white font-bold">{(audioDiagnostic?.recorderState?.toLowerCase() as string) || (isRecording ? 'recording' : 'inactive')}</span></div>
              <div>Audio chunks: <span className="text-white font-bold">{audioDiagnostic?.chunksCount || 0}</span></div>
              <div>Audio bytes: <span className="text-white font-bold">{audioDiagnostic?.finalBlobSize || 0} bytes</span></div>
              <div>Final Blob: <span className="text-white font-bold">{audioDiagnostic?.finalBlobSize || 0} bytes</span></div>
              <div>Final MIME type: <span className="text-white font-bold truncate">{audioDiagnostic?.blobType || 'audio/webm'}</span></div>
              <div>Recognition: <span className="text-white font-bold">{recogState === 'LISTENING' || recogState === 'SPEECH_DETECTED' ? 'listening' : isRecording ? 'started' : 'ended'}</span></div>
              <div>Speech detected: <span className={`font-bold ${speechDetectedFlag || !!rawTranscript ? 'text-emerald-400' : 'text-amber-400'}`}>{speechDetectedFlag || !!rawTranscript ? 'yes' : 'no'}</span></div>
              <div>Audio Level (RMS): <span className="text-white font-bold">{audioDiagnostic?.audioLevel ?? 0}</span></div>
              <div>Analyzer status: <span className="text-cyan-300 font-bold">{analyzerStatus} ({analysisResult?.analysisType || 'browser_phonetic'})</span></div>
            </div>
            <div className="border-t border-slate-800 pt-1 mt-1 space-y-0.5">
              <div>Interim transcript: <span className="text-amber-300 font-semibold">"{recognizerRef.current?.getInterimTranscript() || ''}"</span></div>
              <div>Final transcript: <span className="text-emerald-300 font-semibold">"{recognizerRef.current?.getFinalTranscript() || rawTranscript}"</span></div>
              <div>Recognition error: <span className="text-rose-400">{lastErrorCode || 'none'}</span></div>
              <div>Recognition end: <span className="text-slate-400">{recognitionEndedTime || (isRecording ? 'in-progress' : 'idle')}</span></div>
            </div>
            {wordAnalysisList.length > 0 && (
              <div className="border-t border-slate-800 pt-1.5 mt-1.5">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Sequence Alignment (Needleman-Wunsch):
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                  {wordAnalysisList.map((w, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[9px] bg-slate-800/80 px-1.5 py-0.5 rounded">
                      <span className="text-slate-300 font-semibold">
                        {idx + 1}. <strong className="text-white">{w.expected}</strong> ➔ {w.spoken ? `"${w.spoken}"` : '∅ (gap)'}
                      </span>
                      <span
                        className={`font-bold px-1 rounded text-[8px] ${
                          w.status === 'correct'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : w.status === 'not-heard'
                            ? 'bg-amber-950 text-amber-300 border border-amber-700'
                            : w.status === 'needs-practice'
                            ? 'bg-rose-950 text-rose-300 border border-rose-700'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {w.status === 'correct'
                          ? 'matched'
                          : w.status === 'not-heard'
                          ? 'not heard'
                          : w.status === 'needs-practice'
                          ? 'mismatch'
                          : 'pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
