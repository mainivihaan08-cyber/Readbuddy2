import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Mic,
  Square,
  RotateCcw,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Activity,
  Sparkles,
  HelpCircle,
  X,
  VolumeX,
  RefreshCw,
  Award,
  AlertCircle,
  Radio,
  Clock,
  AudioWaveform as Waveform
} from 'lucide-react';
import { AppLanguage } from '../types';
import {
  ReadWordItem,
  ReadCombinationItem,
  ReadSentenceItem,
  ReadStoryItem,
  LEVEL_1_SINGLE_WORDS,
  LEVEL_2_COMBINATIONS,
  LEVEL_3_SENTENCES,
  LEVEL_4_STORIES
} from '../data/readModuleData';
import { speakWord } from '../services/speech';
import { cleanWord, wordSimilarity, normalizeForCompare } from '../services/soundAnalysis';
import {
  analyzeReadingAttempt,
  recordItemResult,
  recordReadSessionHistory,
  ReadAttemptResult
} from '../services/readProgressEngine';
import { recordAdaptiveAttemptResult } from '../services/aiAdaptiveReadingEngine';
import {
  evaluateChildReadingAttemptWithAudioIsolation,
  detectAudioCapabilities,
  VoiceIsolationAttemptResult
} from '../services/smartVoiceIsolationEngine';
import {
  acquireMicrophoneStream,
  stopMicrophoneStream,
  unlockAudioContext,
} from '../services/audioStreamManager';
import { AudioMeter } from './AudioMeter';
import { triggerSuccessConfetti } from '../utils/confetti';

interface ReadSessionViewProps {
  language: AppLanguage;
  levelNumber: 1 | 2 | 3 | 4;
  customWordList?: ReadWordItem[]; // For adaptive practice mode
  onClose: () => void;
  onSessionComplete: () => void;
}

export const ReadSessionView: React.FC<ReadSessionViewProps> = ({
  language,
  levelNumber,
  customWordList,
  onClose,
  onSessionComplete,
}) => {
  // Items list based on level or custom adaptive list
  const items = customWordList || (
    levelNumber === 1 ? LEVEL_1_SINGLE_WORDS :
    levelNumber === 2 ? LEVEL_2_COMBINATIONS :
    levelNumber === 3 ? LEVEL_3_SENTENCES :
    LEVEL_4_STORIES
  );

  const storageIndexKey = customWordList
    ? 'readbuddy_adaptive_practice_index'
    : `readbuddy_level_${levelNumber}_current_index`;

  // Restore current practice position from localStorage so refreshing doesn't lose progress
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(
        customWordList
          ? 'readbuddy_adaptive_practice_index'
          : `readbuddy_level_${levelNumber}_current_index`
      );
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < items.length) {
          return parsed;
        }
      }
    } catch {}
    return 0;
  });
  const [attemptCount, setAttemptCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecondsRemaining, setRecordingSecondsRemaining] = useState(5);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [lastResult, setLastResult] = useState<ReadAttemptResult | null>(null);
  const [lastIsolationResult, setLastIsolationResult] = useState<VoiceIsolationAttemptResult | null>(null);
  const [micPermissionError, setMicPermissionError] = useState(false);
  const [audioRetryPrompt, setAudioRetryPrompt] = useState<{ messageEn: string; messageHi: string } | null>(null);
  const [audioRetryCount, setAudioRetryCount] = useState(0);

  // Live microphone audio signal visualizer state
  const [activeAudioStream, setActiveAudioStream] = useState<MediaStream | null>(null);
  const [audioSignalLevel, setAudioSignalLevel] = useState<number>(0);
  const [visualizerBars, setVisualizerBars] = useState<number[]>([15, 25, 35, 25, 15]);

  // Session stats tracking
  const [sessionAttempted, setSessionAttempted] = useState(0);
  const [sessionMastered, setSessionMastered] = useState(0);

  const recognitionRef = useRef<any>(null);
  const autoAdvanceTimerRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);
  const isRecordingRef = useRef<boolean>(false);
  const currentAttemptCountRef = useRef<number>(0);
  const speechCapturedRef = useRef<boolean>(false);
  const latestTranscriptRef = useRef<string>('');
  const voiceDetectedDuringSessionRef = useRef<boolean>(false);
  const voiceFramesCountRef = useRef<number>(0);
  const peakVoiceLevelRef = useRef<number>(0);
  const lastVoiceActiveTimeRef = useRef<number>(0);

  // Web Audio API refs for real-time mic signal visualizer
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<any>(null);

  const currentItem: any = items[currentIndex] || items[0];

  const currentText = (
    levelNumber === 1 ? currentItem.word :
    levelNumber === 2 ? currentItem.phrase :
    levelNumber === 3 ? currentItem.sentence :
    currentItem.text
  );

  // Keep attemptCount ref in sync
  useEffect(() => {
    currentAttemptCountRef.current = attemptCount;
  }, [attemptCount]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudioVisualizer();
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  // Stop real-time audio visualizer
  const stopAudioVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioStreamRef.current) {
      stopMicrophoneStream(audioStreamRef.current);
      audioStreamRef.current = null;
    }
    setActiveAudioStream(null);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioSignalLevel(0);
    setVisualizerBars([15, 25, 35, 25, 15]);
  };

  // Start real-time audio visualizer analyzing microphone signals
  const startAudioVisualizer = async () => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass || !navigator.mediaDevices?.getUserMedia) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      audioStreamRef.current = stream;

      const audioCtx = new AudioCtxClass();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const renderSignal = () => {
        if (!isRecordingRef.current) return;
        analyser.getByteFrequencyData(dataArray);

        let total = 0;
        for (let i = 0; i < bufferLength; i++) {
          total += dataArray[i];
        }
        const avg = total / bufferLength;
        const normalized = Math.min(100, Math.round((avg / 120) * 100));
        setAudioSignalLevel(normalized);

        // Generate 5 dynamic equalizer bar heights based on frequency spectrum
        const b1 = Math.min(100, Math.max(12, Math.round((dataArray[1] || 0) / 2.2)));
        const b2 = Math.min(100, Math.max(18, Math.round((dataArray[3] || 0) / 1.8)));
        const b3 = Math.min(100, Math.max(25, Math.round((dataArray[5] || 0) / 1.5)));
        const b4 = Math.min(100, Math.max(18, Math.round((dataArray[7] || 0) / 1.8)));
        const b5 = Math.min(100, Math.max(12, Math.round((dataArray[9] || 0) / 2.2)));

        setVisualizerBars([b1, b2, b3, b4, b5]);

        animationFrameRef.current = requestAnimationFrame(renderSignal);
      };

      animationFrameRef.current = requestAnimationFrame(renderSignal);
    } catch (err) {
      console.warn('[ReadSessionView] Live visualizer fallback:', err);
    }
  };

  // Reset state when changing word
  const loadNextItem = (nextIdx: number) => {
    stopAudioVisualizer();
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }
    setIsRecording(false);
    isRecordingRef.current = false;
    speechCapturedRef.current = false;

    if (nextIdx >= items.length) {
      // Session finished: Clear saved level position so next run starts clean
      try {
        localStorage.removeItem(storageIndexKey);
      } catch {}
      recordReadSessionHistory({
        levelNumber,
        levelName: `Level ${levelNumber}`,
        itemsAttempted: Math.max(1, sessionAttempted),
        itemsMastered: sessionMastered,
        accuracyPercent: sessionAttempted > 0 ? Math.round((sessionMastered / sessionAttempted) * 100) : 100,
        wordsToPracticeAgain: [],
        audioRetryCount,
      });
      onSessionComplete();
      return;
    }

    // Persist current level progress index so page refresh resumes right here
    try {
      localStorage.setItem(storageIndexKey, nextIdx.toString());
    } catch {}

    setCurrentIndex(nextIdx);
    setAttemptCount(0);
    setRecordingSecondsRemaining(5);
    setSpeechTranscript('');
    setLastResult(null);
    setLastIsolationResult(null);
    setAudioRetryPrompt(null);
    latestTranscriptRef.current = '';
    voiceDetectedDuringSessionRef.current = false;
    voiceFramesCountRef.current = 0;
    peakVoiceLevelRef.current = 0;
    lastVoiceActiveTimeRef.current = 0;
  };

  // Restart Level from Beginning
  const handleRestartLevel = () => {
    try {
      localStorage.removeItem(storageIndexKey);
    } catch {}
    loadNextItem(0);
  };

  // Real-time voice energy tracker from AudioMeter
  const handleVoiceActivity = (metrics: {
    levelPercent: number;
    isVoiceActive: boolean;
    barHeights: number[];
  }) => {
    if (!isRecordingRef.current || speechCapturedRef.current) return;
    if (metrics.isVoiceActive || metrics.levelPercent > 8) {
      voiceDetectedDuringSessionRef.current = true;
      voiceFramesCountRef.current += 1;
      peakVoiceLevelRef.current = Math.max(peakVoiceLevelRef.current, metrics.levelPercent);
      lastVoiceActiveTimeRef.current = Date.now();
    }
  };

  // Play audio pronunciation
  const handlePlayAudio = (rate: 'normal' | 'slow' = 'normal') => {
    speakWord(currentText, 'en', rate);
  };

  // 5-Second Rule: Handle Timeout when 5 seconds elapse
  const handleRecordingTimeout = () => {
    stopAudioVisualizer();
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsRecording(false);
    isRecordingRef.current = false;

    // If speech was already captured and processed, return
    if (speechCapturedRef.current) {
      return;
    }

    // 1. If any transcript was captured during the 5s window, process it with strict scoring!
    const capturedText = latestTranscriptRef.current || speechTranscript;
    if (capturedText && capturedText.trim().length > 0) {
      speechCapturedRef.current = true;
      processSpokenAudio(capturedText.trim());
      return;
    }

    // 2. If voice activity / speech sound was detected on the microphone, but speech recognition returned no text:
    const wasVoiceActive =
      voiceDetectedDuringSessionRef.current ||
      voiceFramesCountRef.current >= 2 ||
      peakVoiceLevelRef.current >= 8;

    speechCapturedRef.current = true;
    const newAttemptCount = currentAttemptCountRef.current + 1;
    setAttemptCount(newAttemptCount);
    setSessionAttempted((prev) => prev + 1);
    recordItemResult(levelNumber, currentItem.id, false);

    if (wasVoiceActive) {
      // Voice was heard but words were indistinct / unclear (strict: NO fake green tick!)
      const voiceHeardResult: ReadAttemptResult = {
        isRecognized: false,
        clarityScore: 30, // Honest clarity score for muffled/unclear voice
        isSuccess: false, // Strict: Wrong/unclear speech NEVER gets green tick
        attemptNumber: newAttemptCount,
        expectedText: currentText,
        spokenText: language === 'en' ? '(Voice detected · Unclear pronunciation)' : '(आवाज़ दर्ज हुई · अस्पष्ट उच्चारण)',
        feedbackTextEn: newAttemptCount >= 3
          ? '3 attempts completed! Great effort! You can now proceed to Next.'
          : 'Voice heard! Try speaking more clearly into the mic. Listen and repeat!',
        feedbackTextHi: newAttemptCount >= 3
          ? '३ प्रयास पूरे हुए! बहुत अच्छा प्रयास! अब आप Next दबा सकते हैं।'
          : 'आवाज़ सुनाई दी! कृपया माइक में और स्पष्ट रूप से बोलें। सुनकर दोहराएं!',
        educationalTipEn: newAttemptCount >= 3
          ? 'Tap Next to continue reading practice.'
          : 'Tap Listen first, then speak the exact word while the microphone wave is moving.',
        educationalTipHi: newAttemptCount >= 3
          ? 'आगे बढ़ने के लिए Next दबाएं।'
          : "पहले 'उच्चारण सुनें' दबाएं, फिर माइक वेव के चलते समय सही शब्द बोलें।",
        needsMorePractice: true,
      };

      setLastResult(voiceHeardResult);
    } else {
      // 3. 0% Clarity Rule: Absolute silence / no voice captured
      const timedOutResult: ReadAttemptResult = {
        isRecognized: false,
        clarityScore: 0, // Explicitly 0% clarity
        isSuccess: false,
        attemptNumber: newAttemptCount,
        expectedText: currentText,
        spokenText: language === 'en' ? '(No voice detected - 0% clarity)' : '(कोई ध्वनि नहीं - ०% स्पष्टता)',
        feedbackTextEn: newAttemptCount >= 3
          ? '3 attempts completed! Great effort! You can now proceed to Next.'
          : '0% Clarity · 5s timer elapsed. Listen and try again!',
        feedbackTextHi: newAttemptCount >= 3
          ? '३ प्रयास पूरे हुए! बहुत अच्छा प्रयास! अब आप Next दबा सकते हैं।'
          : '०% स्पष्टता · ५ सेकंड पूरे हुए। उच्चारण सुनकर पुनः बोलें!',
        educationalTipEn: newAttemptCount >= 3
          ? 'Tap Next to continue reading practice.'
          : 'Tap Listen first, then tap Read Aloud and speak while the microphone wave is moving.',
        educationalTipHi: newAttemptCount >= 3
          ? 'आगे बढ़ने के लिए Next दबाएं।'
          : "पहले 'उच्चारण सुनें' दबाएं, फिर माइक वेव के चलते समय ५ सेकंड के अंदर बोलें।",
        needsMorePractice: true,
      };

      setLastResult(timedOutResult);
    }

    // Rule: Auto-advance after 3 attempts or allow tapping Next
    if (newAttemptCount >= 3) {
      autoAdvanceTimerRef.current = setTimeout(() => {
        loadNextItem(currentIndex + 1);
      }, 2800);
    }
  };

  // Start speech recognition with 5-second countdown timer and live microphone visualizer
  const handleStartRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    setMicPermissionError(false);
    setAudioRetryPrompt(null);
    speechCapturedRef.current = false;
    latestTranscriptRef.current = '';
    voiceDetectedDuringSessionRef.current = false;
    voiceFramesCountRef.current = 0;
    peakVoiceLevelRef.current = 0;
    lastVoiceActiveTimeRef.current = 0;

    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }

    // Immediately unlock AudioContext on user gesture
    unlockAudioContext();

    setIsRecording(true);
    isRecordingRef.current = true;
    setSpeechTranscript('');
    setRecordingSecondsRemaining(5);

    // 1. SYNCHRONOUSLY start SpeechRecognition in the direct user-gesture tick
    if (SpeechRecognition) {
      try {
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch {}
        }

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
        // For single words / combinations: continuous=false delivers instant results on mobile Chrome
        recognition.continuous = levelNumber >= 3;
        recognition.interimResults = true;
        recognition.maxAlternatives = 5;

        recognition.onstart = () => {
          console.log('[ReadSessionView] SpeechRecognition active');
        };

        recognition.onspeechstart = () => {
          voiceDetectedDuringSessionRef.current = true;
        };

        recognition.onresult = (event: any) => {
          voiceDetectedDuringSessionRef.current = true;
          let bestTranscript = '';
          let highestSimilarity = 0;
          const alternativesList: string[] = [];

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const res = event.results[i];
            if (!res) continue;
            for (let a = 0; a < res.length; a++) {
              const altText = res[a]?.transcript?.trim();
              if (altText) {
                alternativesList.push(altText);
              }
            }
            if (res[0]?.transcript) {
              bestTranscript = res[0].transcript.trim();
            }
          }

          const cleanTarget = normalizeForCompare(currentText, language).toLowerCase();

          // Evaluate all alternatives to find the most accurate match
          for (const alt of alternativesList) {
            const cleanAlt = normalizeForCompare(alt, language).toLowerCase();
            const sim = wordSimilarity(cleanTarget, cleanAlt);
            if (cleanAlt === cleanTarget) {
              bestTranscript = alt;
              highestSimilarity = 1.0;
              break;
            }
            if (sim > highestSimilarity) {
              highestSimilarity = sim;
              bestTranscript = alt;
            }
          }

          if (bestTranscript) {
            latestTranscriptRef.current = bestTranscript;
            setSpeechTranscript(bestTranscript);

            // If genuine exact match or high accuracy, process immediately!
            const cleanBest = normalizeForCompare(bestTranscript, language).toLowerCase();
            const isExact = cleanBest === cleanTarget;
            const isHighAccuracy = (cleanTarget.length >= 4 && highestSimilarity >= 0.85) || (levelNumber === 1 && highestSimilarity >= 0.80);

            if ((isExact || isHighAccuracy) && !speechCapturedRef.current) {
              speechCapturedRef.current = true;
              if (countdownTimerRef.current) {
                clearInterval(countdownTimerRef.current);
              }
              processSpokenAudio(bestTranscript);
            }
          }
        };

        recognition.onerror = (err: any) => {
          console.warn('[ReadSessionView] Speech recognition error event:', err.error);
          if (err.error === 'not-allowed') {
            setMicPermissionError(true);
          }
        };

        recognition.onend = () => {
          console.log('[ReadSessionView] SpeechRecognition onend');
          // If not captured yet and we have a transcript, process it now
          if (!speechCapturedRef.current && latestTranscriptRef.current) {
            speechCapturedRef.current = true;
            processSpokenAudio(latestTranscriptRef.current);
          }
        };

        recognition.start();
      } catch (e) {
        console.warn('[ReadSessionView] SpeechRecognition.start threw:', e);
      }
    }

    // 2. Start 5-second Countdown Interval
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    const startTime = Date.now();
    countdownTimerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, 5 - elapsed);
      setRecordingSecondsRemaining(remaining);

      // If speech finished and user was silent for >= 1.2s with captured transcript:
      if (
        voiceFramesCountRef.current >= 3 &&
        lastVoiceActiveTimeRef.current > 0 &&
        Date.now() - lastVoiceActiveTimeRef.current >= 1200 &&
        latestTranscriptRef.current &&
        !speechCapturedRef.current
      ) {
        clearInterval(countdownTimerRef.current);
        handleRecordingTimeout();
        return;
      }

      if (remaining <= 0) {
        clearInterval(countdownTimerRef.current);
        handleRecordingTimeout();
      }
    }, 250);
  };

  // Stop recording manually
  const handleStopRecording = () => {
    stopAudioVisualizer();
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    setIsRecording(false);
    isRecordingRef.current = false;
    handleRecordingTimeout();
  };

  // Fallback simulator for browsers without Web Speech API
  const simulateRecording = () => {
    setIsRecording(true);
    isRecordingRef.current = true;
    setRecordingSecondsRemaining(5);

    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    const startTime = Date.now();
    countdownTimerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, 5 - elapsed);
      setRecordingSecondsRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(countdownTimerRef.current);
      }
    }, 250);

    setTimeout(() => {
      stopAudioVisualizer();
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      setIsRecording(false);
      isRecordingRef.current = false;
      const spoken = currentText;
      setSpeechTranscript(spoken);
      processSpokenAudio(spoken);
    }, 1500);
  };

  // Process and analyze child reading (0% clarity rule strictly enforced)
  const processSpokenAudio = async (spoken: string) => {
    stopAudioVisualizer();
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    setIsRecording(false);
    isRecordingRef.current = false;

    // Increment attempt count on every attempt (even 0% clarity)
    const newAttemptCount = currentAttemptCountRef.current + 1;
    setAttemptCount(newAttemptCount);
    currentAttemptCountRef.current = newAttemptCount;
    setSessionAttempted((prev) => prev + 1);

    // Run Voice Isolation Pipeline
    const isolationResult = await evaluateChildReadingAttemptWithAudioIsolation({
      targetText: currentText,
      spokenTranscript: spoken,
      attemptNumber: newAttemptCount,
      levelNumber,
      hasMicPermission: true,
      language,
    });

    setLastIsolationResult(isolationResult);

    const result = analyzeReadingAttempt(
      currentText,
      isolationResult.deduplicatedTranscript || spoken,
      newAttemptCount,
      language
    );

    // If 3 attempts completed, show clear Next unlock message
    if (!result.isSuccess && newAttemptCount >= 3) {
      result.feedbackTextEn = '3 attempts completed! Great effort! You can proceed to the next word.';
      result.feedbackTextHi = '३ प्रयास पूरे हुए! बहुत अच्छा प्रयास! अब आप अगले शब्द पर जा सकते हैं।';
    }

    setLastResult(result);

    // Save result in progress engine
    recordItemResult(levelNumber, currentItem.id, result.isSuccess);

    // Call AI Adaptive Reading Engine to update child-specific word difficulty
    if (levelNumber === 1 && currentItem.word) {
      recordAdaptiveAttemptResult(currentItem, result.isSuccess, isolationResult.deduplicatedTranscript || spoken);
    }

    if (result.isSuccess) {
      // RULE: Green tick -> Mastered, confetti, auto advance
      setSessionMastered((prev) => prev + 1);
      triggerSuccessConfetti();

      autoAdvanceTimerRef.current = setTimeout(() => {
        loadNextItem(currentIndex + 1);
      }, 2000);
    } else {
      // RULE: 3 wrong attempts -> Unlock Next and auto advance after brief delay
      if (newAttemptCount >= 3) {
        autoAdvanceTimerRef.current = setTimeout(() => {
          loadNextItem(currentIndex + 1);
        }, 2800);
      }
    }
  };

  // Next is enabled if: Green tick (isSuccess) OR 3 attempts completed (0% or any clarity)
  const canGoNext = Boolean(lastResult?.isSuccess || attemptCount >= 3);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 select-none animate-in fade-in">
      {/* Top Header Bar */}
      <div className="max-w-md mx-auto w-full flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95 cursor-pointer"
            title="Exit Session"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-400/30">
                Level {levelNumber}
              </span>
              {levelNumber === 1 && currentItem.stageName && (
                <span className="text-[10px] font-bold text-slate-300">
                  {language === 'en' ? currentItem.stageName : currentItem.stageNameHi}
                </span>
              )}
            </div>
            <h2 className="text-xs font-bold text-slate-200">
              {language === 'en' ? 'Structured Reading Practice' : 'संरचित वाचन अभ्यास'}
            </h2>
          </div>
        </div>

        {/* Progress Counter & Restart */}
        <div className="flex items-center gap-1.5">
          {currentIndex > 0 && (
            <button
              onClick={handleRestartLevel}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-amber-300 transition cursor-pointer"
              title={language === 'en' ? 'Start Level from Beginning' : 'शुरुआत से पुनः शुरू करें'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-xs font-mono font-black text-amber-400 bg-white/10 px-2.5 py-1 rounded-xl">
            {currentIndex + 1} / {items.length}
          </span>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Reading Card (Distraction-Free & Large Font) */}
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center my-3">
        <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 flex flex-col items-center justify-center text-center relative overflow-hidden space-y-3.5">
          {/* Level 1: Single Word Display (Huge Typography) */}
          {levelNumber === 1 && (
            <div className="space-y-2.5 my-2">
              {currentItem.visualEmoji && (
                <span className="text-5xl block animate-bounce" role="img" aria-label="word illustration">
                  {currentItem.visualEmoji}
                </span>
              )}
              <h1 className="text-5xl sm:text-6xl font-black text-slate-900 tracking-wide break-words">
                {currentText}
              </h1>

              {currentItem.syllables && currentItem.syllables.length > 1 && (
                <div className="flex items-center justify-center gap-1 text-xs font-mono font-bold text-indigo-600">
                  {currentItem.syllables.map((syl: string, idx: number) => (
                    <span key={idx} className="bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      {syl}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-xs text-slate-500 font-medium">
                {language === 'en' ? currentItem.meaningEn : currentItem.meaningHi}
              </p>
            </div>
          )}

          {/* Level 2: Word Combination Display */}
          {levelNumber === 2 && (
            <div className="space-y-3 my-3">
              {currentItem.visualEmoji && (
                <span className="text-4xl block" role="img" aria-label="phrase illustration">
                  {currentItem.visualEmoji}
                </span>
              )}
              <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-normal leading-tight">
                {currentText}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {language === 'en' ? currentItem.meaningEn : currentItem.meaningHi}
              </p>
            </div>
          )}

          {/* Level 3: Short Sentence Display */}
          {levelNumber === 3 && (
            <div className="space-y-3 my-2 text-left w-full">
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-snug">
                  {currentText}
                </h1>
              </div>
              <p className="text-xs text-slate-500 font-medium text-center">
                {language === 'en' ? currentItem.meaningEn : currentItem.meaningHi}
              </p>
            </div>
          )}

          {/* Level 4: Paragraph & Story Display */}
          {levelNumber === 4 && (
            <div className="space-y-3 my-1 text-left w-full max-h-[42vh] overflow-y-auto pr-1">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900">
                  {language === 'en' ? currentItem.title : currentItem.titleHi}
                </h3>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {currentItem.wordCount} words
                </span>
              </div>
              <p className="text-sm sm:text-base font-medium text-slate-800 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {currentText}
              </p>
            </div>
          )}

          {/* Audio Listen Buttons */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              onClick={() => handlePlayAudio('normal')}
              className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-indigo-50 text-slate-800 hover:text-indigo-600 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <Volume2 className="w-4 h-4 text-indigo-600" />
              <span>{language === 'en' ? 'Listen' : 'उच्चारण सुनें'}</span>
            </button>

            <button
              onClick={() => handlePlayAudio('slow')}
              className="px-3 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
              title="Slow audio"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'Slow' : 'धीमा'}</span>
            </button>
          </div>

          {/* LIVE MICROPHONE AUDIO SIGNAL VISUALIZER (Real-time Web Audio AnalyserNode AudioMeter) */}
          {isRecording && (
            <div className="w-full space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-black text-indigo-700 flex items-center gap-1.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                  </span>
                  <span>{language === 'en' ? 'Recording Voice...' : 'आवाज़ रिकॉर्ड हो रही है...'}</span>
                </span>

                <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full text-xs font-mono font-extrabold text-indigo-800">
                  <Clock className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  <span>{recordingSecondsRemaining}s</span>
                </div>
              </div>

              <AudioMeter
                isRecording={isRecording}
                isVoiceActive={voiceDetectedDuringSessionRef.current}
                language={language}
                barCount={9}
                size="md"
                showLevelText={true}
                showActivityBadge={true}
                onVoiceActivity={handleVoiceActivity}
                onError={(err) => {
                  if (err?.name === 'NotAllowedError') {
                    setMicPermissionError(true);
                  }
                }}
              />

              {speechTranscript && (
                <div className="p-2.5 bg-indigo-50/95 rounded-xl border border-indigo-200 text-xs font-bold text-indigo-900 flex items-center justify-between animate-in fade-in">
                  <span className="flex items-center gap-1.5 truncate">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>{language === 'en' ? 'Hearing:' : 'पहचाना:'} <strong className="text-slate-900 font-extrabold">"{speechTranscript}"</strong></span>
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-extrabold shrink-0">
                    {language === 'en' ? 'Live Voice' : 'लाइव आवाज़'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Real-time Supportive Feedback Card (Shows 0% to 100% Clarity) */}
          {lastResult && !isRecording && (
            <div className={`w-full p-4 rounded-2xl border text-left space-y-2 animate-in fade-in ${
              lastResult.isSuccess
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-xs'
                : attemptCount >= 3
                ? 'bg-indigo-50 border-indigo-300 text-indigo-950 shadow-xs'
                : 'bg-amber-50 border-amber-200 text-amber-950 shadow-xs'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-black text-sm">
                  {lastResult.isSuccess ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : attemptCount >= 3 ? (
                    <Award className="w-5 h-5 text-indigo-600" />
                  ) : (
                    <Activity className="w-5 h-5 text-amber-600" />
                  )}
                  <span>
                    {language === 'en' ? lastResult.feedbackTextEn : lastResult.feedbackTextHi}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-mono font-black px-2.5 py-0.5 rounded-full shadow-2xs border ${
                    lastResult.isSuccess
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : lastResult.clarityScore === 0
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : 'bg-white text-slate-800 border-slate-200'
                  }`}>
                    {lastResult.clarityScore}% Clarity
                  </span>
                </div>
              </div>

              {/* Recognition Details & Attempt Confirmation */}
              <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span>Heard: <strong className="text-slate-900">{lastResult.spokenText}</strong></span>
                <span className="font-bold">
                  {lastResult.isSuccess
                    ? '✓ Green Tick (Next Available)'
                    : attemptCount >= 3
                    ? '3 Attempts Done (Next Unlocked)'
                    : `Attempt ${attemptCount} of 3 Registered`}
                </span>
              </div>

              {lastResult.educationalTipEn && (
                <p className="text-[11px] text-slate-700 italic pt-0.5">
                  💡 {language === 'en' ? lastResult.educationalTipEn : lastResult.educationalTipHi}
                </p>
              )}
            </div>
          )}

          {/* Microphone Permission Warning */}
          {micPermissionError && (
            <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-900 flex items-center justify-between gap-2.5 animate-in fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  {language === 'en'
                    ? 'Microphone access needs permission. Please allow mic in browser settings.'
                    : 'माइक की अनुमति आवश्यक है। कृपया ब्राउज़र में अनुमति दें।'}
                </span>
              </div>
              <button
                onClick={handleStartRecording}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shrink-0 transition active:scale-95 cursor-pointer shadow-xs"
              >
                {language === 'en' ? 'Retry Mic' : 'पुनः प्रयास'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Sticky Action Controls */}
      <div className="max-w-md mx-auto w-full space-y-3 shrink-0">
        {/* Attempt Indicators (3 Dots) */}
        <div className="flex items-center justify-between px-2 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 font-bold">
            <span>Attempt: {attemptCount} / 3</span>
            {attemptCount >= 3 && !lastResult?.isSuccess && (
              <span className="text-[10px] text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded font-bold">
                ✓ Rule: Next Unlocked
              </span>
            )}
            {lastResult?.isSuccess && (
              <span className="text-[10px] text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded font-bold">
                ✓ Green Tick
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((dot) => {
              const isAttempted = attemptCount >= dot;
              const isSuccessDot = isAttempted && lastResult?.isSuccess;
              return (
                <span
                  key={dot}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                    isAttempted
                      ? isSuccessDot
                        ? 'bg-emerald-400 ring-2 ring-emerald-300 shadow-md shadow-emerald-400/50 scale-110'
                        : 'bg-rose-500 ring-2 ring-rose-400 shadow-md shadow-rose-500/50 scale-110'
                      : 'bg-white/20'
                  }`}
                  title={`Attempt ${dot}`}
                />
              );
            })}
          </div>
        </div>

        {/* Big Mic Button & Next Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`flex-1 py-4 rounded-3xl font-black text-base text-white flex items-center justify-center gap-2 shadow-xl active:scale-95 transition cursor-pointer ${
              isRecording
                ? 'bg-rose-600 animate-pulse ring-4 ring-rose-400/50'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isRecording ? (
              <>
                <Square className="w-5 h-5 fill-white" />
                <span className="flex items-center gap-1.5">
                  <span>Stop</span>
                  <span className="bg-white/25 px-2 py-0.5 rounded-full text-xs font-mono font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3 animate-spin" />
                    {recordingSecondsRemaining}s
                  </span>
                </span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                <span>
                  {attemptCount === 0 ? 'Read Aloud (5s)' : 'Read Again (5s)'}
                </span>
              </>
            )}
          </button>

          {/* Next Word Button (Unlocks on Green Tick OR 3 Attempts with any clarity) */}
          <button
            onClick={() => loadNextItem(currentIndex + 1)}
            disabled={!canGoNext}
            className={`px-6 py-4 rounded-3xl font-black text-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
              canGoNext
                ? 'bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-xl shadow-emerald-500/30 ring-2 ring-emerald-400 animate-bounce'
                : 'bg-white/10 text-slate-500 cursor-not-allowed border border-white/5'
            }`}
          >
            <span>Next</span>
            {lastResult?.isSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-white" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
