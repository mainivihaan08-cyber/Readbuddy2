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
  Clock
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

  const [currentIndex, setCurrentIndex] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSecondsRemaining, setRecordingSecondsRemaining] = useState(5);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [lastResult, setLastResult] = useState<ReadAttemptResult | null>(null);
  const [lastIsolationResult, setLastIsolationResult] = useState<VoiceIsolationAttemptResult | null>(null);
  const [micPermissionError, setMicPermissionError] = useState(false);
  const [emptySpeechPrompt, setEmptySpeechPrompt] = useState(false);
  const [audioRetryPrompt, setAudioRetryPrompt] = useState<{ messageEn: string; messageHi: string } | null>(null);
  const [audioRetryCount, setAudioRetryCount] = useState(0);

  // Session stats tracking
  const [sessionAttempted, setSessionAttempted] = useState(0);
  const [sessionMastered, setSessionMastered] = useState(0);

  const recognitionRef = useRef<any>(null);
  const autoAdvanceTimerRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);
  const isRecordingRef = useRef<boolean>(false);
  const currentAttemptCountRef = useRef<number>(0);
  const speechCapturedRef = useRef<boolean>(false);

  const currentItem: any = items[currentIndex] || items[0];

  const currentText = (
    levelNumber === 1 ? currentItem.word :
    levelNumber === 2 ? currentItem.phrase :
    levelNumber === 3 ? currentItem.sentence :
    currentItem.text
  );

  // Keep refs in sync
  useEffect(() => {
    currentAttemptCountRef.current = attemptCount;
  }, [attemptCount]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
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

  // Reset state when changing word
  const loadNextItem = (nextIdx: number) => {
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
      // Session finished
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
    setCurrentIndex(nextIdx);
    setAttemptCount(0);
    setRecordingSecondsRemaining(5);
    setSpeechTranscript('');
    setLastResult(null);
    setLastIsolationResult(null);
    setEmptySpeechPrompt(false);
    setAudioRetryPrompt(null);
  };

  // Play audio pronunciation
  const handlePlayAudio = (rate: 'normal' | 'slow' = 'normal') => {
    speakWord(currentText, 'en', rate);
  };

  // 5-Second Rule: Handle Timeout when 5 seconds elapse with no speech
  const handleRecordingTimeout = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsRecording(false);
    isRecordingRef.current = false;

    // If speech was already captured, let onresult handle it
    if (speechCapturedRef.current) {
      return;
    }

    // Otherwise record as timed attempt (5 second rule)
    const newAttemptCount = currentAttemptCountRef.current + 1;
    setAttemptCount(newAttemptCount);
    setSessionAttempted(prev => prev + 1);
    recordItemResult(levelNumber, currentItem.id, false);

    const timedOutResult: ReadAttemptResult = {
      isRecognized: false,
      clarityScore: 0,
      isSuccess: false,
      attemptNumber: newAttemptCount,
      expectedText: currentText,
      spokenText: language === 'en' ? '(5s timer completed)' : '(५ सेकंड पूरे हुए)',
      feedbackTextEn: newAttemptCount >= 3
        ? '3 attempts completed! Great effort! You can proceed to the next word.'
        : "5s timer elapsed! Listen to the audio and try again.",
      feedbackTextHi: newAttemptCount >= 3
        ? '३ प्रयास पूरे हुए! बहुत अच्छा प्रयास! अब आप अगले शब्द पर जा सकते हैं।'
        : '५ सेकंड पूरे हुए! उच्चारण सुनें और पुनः बोलें।',
      educationalTipEn: newAttemptCount >= 3
        ? 'Tap Next to continue reading practice.'
        : 'Tap Listen first, then tap Read Aloud and speak within 5 seconds.',
      educationalTipHi: newAttemptCount >= 3
        ? 'आगे बढ़ने के लिए Next दबाएं।'
        : "पहले 'उच्चारण सुनें' दबाएं, फिर ५ सेकंड के अंदर बोलें।",
      needsMorePractice: true,
    };

    setLastResult(timedOutResult);

    // Rule: Auto-advance after 3 attempts or allow tapping Next
    if (newAttemptCount >= 3) {
      autoAdvanceTimerRef.current = setTimeout(() => {
        loadNextItem(currentIndex + 1);
      }, 2800);
    }
  };

  // Start speech recognition with 5-second countdown timer
  const handleStartRecording = async () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    setMicPermissionError(false);
    setEmptySpeechPrompt(false);
    setAudioRetryPrompt(null);
    speechCapturedRef.current = false;

    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }

    // Probe microphone capabilities non-blockingly
    await detectAudioCapabilities().catch(() => {});

    if (!SpeechRecognition) {
      simulateRecording();
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'en-US';

      // Level 2, 3, 4 allow continuous speech capture
      recognition.continuous = levelNumber > 1;
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;

      setIsRecording(true);
      isRecordingRef.current = true;
      setSpeechTranscript('');
      setRecordingSecondsRemaining(5);

      // Start 5-second Countdown Interval
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
          handleRecordingTimeout();
        }
      }, 250);

      recognition.onresult = (event: any) => {
        speechCapturedRef.current = true;
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
        }
        const transcript = event.results[0][0].transcript.trim();
        setSpeechTranscript(transcript);
        processSpokenAudio(transcript);
      };

      recognition.onerror = (err: any) => {
        setIsRecording(false);
        isRecordingRef.current = false;
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
        }

        if (err.error === 'not-allowed') {
          setMicPermissionError(true);
        } else if (err.error === 'no-speech') {
          // If no speech, trigger timed out attempt
          handleRecordingTimeout();
        } else {
          simulateRecording();
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
        isRecordingRef.current = false;
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
        }
      };

      recognition.start();
    } catch (e) {
      setIsRecording(false);
      isRecordingRef.current = false;
      simulateRecording();
    }
  };

  // Stop recording manually
  const handleStopRecording = () => {
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

  // Process and analyze child reading
  const processSpokenAudio = async (spoken: string) => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    setIsRecording(false);
    isRecordingRef.current = false;

    // Increment attempt count on every attempt
    const newAttemptCount = attemptCount + 1;
    setAttemptCount(newAttemptCount);
    setSessionAttempted(prev => prev + 1);

    // Run Smart Voice Isolation Pipeline
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

    // If 3 attempts completed and still not correct, provide positive completion message
    if (!result.isSuccess && newAttemptCount >= 3) {
      result.feedbackTextEn = '3 attempts completed! Great effort! You can proceed to the next word.';
      result.feedbackTextHi = '३ प्रयास पूरे हुए! बहुत अच्छा प्रयास! अब आप अगले शब्द पर जा सकते हैं।';
    }

    setLastResult(result);

    // Save result to independent progress engine
    recordItemResult(levelNumber, currentItem.id, result.isSuccess);

    // Call AI Adaptive Reading Engine to update child-specific word difficulty
    if (levelNumber === 1 && currentItem.word) {
      recordAdaptiveAttemptResult(currentItem, result.isSuccess, isolationResult.deduplicatedTranscript || spoken);
    }

    if (result.isSuccess) {
      // RULE: Green tick -> Mastered, confetti, auto advance
      setSessionMastered(prev => prev + 1);
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

  // Next is enabled if: Green tick (isSuccess) OR 3 attempts completed
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

        {/* Progress Counter */}
        <div className="flex items-center gap-2">
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
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center my-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 flex flex-col items-center justify-center text-center relative overflow-hidden space-y-4">
          {/* Level 1: Single Word Display (Huge Typography) */}
          {levelNumber === 1 && (
            <div className="space-y-3 my-4">
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
            <div className="space-y-3 my-4">
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
            <div className="space-y-4 my-2 text-left w-full">
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
            <div className="space-y-3 my-1 text-left w-full max-h-[45vh] overflow-y-auto pr-1">
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
          <div className="flex items-center justify-center gap-2 pt-2">
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

          {/* Audio Retry Prompt Banner */}
          {audioRetryPrompt && (
            <div className="w-full p-3 bg-amber-50 rounded-2xl border border-amber-300 text-left space-y-1 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                <Radio className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                <span>{language === 'en' ? 'Voice Notice' : 'ध्वनि सूचना'}</span>
              </div>
              <p className="text-xs text-amber-900 font-medium">
                {language === 'en' ? audioRetryPrompt.messageEn : audioRetryPrompt.messageHi}
              </p>
            </div>
          )}

          {/* Real-time Supportive Feedback Card */}
          {lastResult && (
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
                  <span className={`text-xs font-mono font-black px-2 py-0.5 rounded-full shadow-2xs border ${
                    lastResult.isSuccess
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-800 border-slate-200'
                  }`}>
                    {lastResult.clarityScore}% Clarity
                  </span>
                </div>
              </div>

              {/* Recognition Details */}
              <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span>Heard: <strong className="text-slate-900">{lastResult.spokenText}</strong></span>
                <span>
                  {lastResult.isSuccess
                    ? '✓ Green Tick (Go Next)'
                    : attemptCount >= 3
                    ? '3 Attempts (Next Unlocked)'
                    : `Attempt ${attemptCount} of 3`}
                </span>
              </div>

              {lastResult.educationalTipEn && (
                <p className="text-[11px] text-slate-700 italic pt-0.5">
                  💡 {language === 'en' ? lastResult.educationalTipEn : lastResult.educationalTipHi}
                </p>
              )}
            </div>
          )}

          {/* Empty Speech Prompt */}
          {emptySpeechPrompt && !lastResult && (
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 font-medium">
              We couldn't hear you clearly. Please tap Read Aloud and speak into your microphone within 5 seconds!
            </div>
          )}

          {/* Microphone Permission Warning */}
          {micPermissionError && (
            <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Microphone access was blocked. Please enable mic permissions in your browser settings.</span>
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
              <span className="text-[10px] text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded font-normal">
                (Rule: Next Unlocked)
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
                        : 'bg-amber-400 ring-2 ring-amber-300 shadow-md shadow-amber-400/50 scale-110'
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

          {/* Next Word Button (Unlocks on Green Tick OR 3 Attempts) */}
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
