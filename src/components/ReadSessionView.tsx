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
  AlertCircle
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
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [lastResult, setLastResult] = useState<ReadAttemptResult | null>(null);
  const [micPermissionError, setMicPermissionError] = useState(false);
  const [emptySpeechPrompt, setEmptySpeechPrompt] = useState(false);

  // Session stats tracking
  const [sessionAttempted, setSessionAttempted] = useState(0);
  const [sessionMastered, setSessionMastered] = useState(0);

  const recognitionRef = useRef<any>(null);
  const autoAdvanceTimerRef = useRef<any>(null);

  const currentItem: any = items[currentIndex] || items[0];

  const currentText = (
    levelNumber === 1 ? currentItem.word :
    levelNumber === 2 ? currentItem.phrase :
    levelNumber === 3 ? currentItem.sentence :
    currentItem.text
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
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
    if (nextIdx >= items.length) {
      // Session finished
      recordReadSessionHistory({
        levelNumber,
        levelName: `Level ${levelNumber}`,
        itemsAttempted: Math.max(1, sessionAttempted),
        itemsMastered: sessionMastered,
        accuracyPercent: sessionAttempted > 0 ? Math.round((sessionMastered / sessionAttempted) * 100) : 100,
        wordsToPracticeAgain: [],
      });
      onSessionComplete();
      return;
    }
    setCurrentIndex(nextIdx);
    setAttemptCount(0);
    setSpeechTranscript('');
    setLastResult(null);
    setEmptySpeechPrompt(false);
  };

  // Play audio pronunciation
  const handlePlayAudio = (rate: 'normal' | 'slow' = 'normal') => {
    speakWord(currentText, 'en', rate);
  };

  // Start speech recognition
  const handleStartRecording = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    setMicPermissionError(false);
    setEmptySpeechPrompt(false);

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
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;

      setIsRecording(true);
      setSpeechTranscript('');

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.trim();
        setSpeechTranscript(transcript);
        processSpokenAudio(transcript);
      };

      recognition.onerror = (err: any) => {
        setIsRecording(false);
        if (err.error === 'not-allowed') {
          setMicPermissionError(true);
        } else if (err.error === 'no-speech') {
          setEmptySpeechPrompt(true);
          handleAttemptFailure();
        } else {
          simulateRecording();
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (e) {
      setIsRecording(false);
      simulateRecording();
    }
  };

  // Stop recording manually
  const handleStopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    setIsRecording(false);
  };

  // Fallback simulator
  const simulateRecording = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      const spoken = currentText;
      setSpeechTranscript(spoken);
      processSpokenAudio(spoken);
    }, 1400);
  };

  // Process and analyze child reading
  const processSpokenAudio = (spoken: string) => {
    const newAttemptCount = attemptCount + 1;
    setAttemptCount(newAttemptCount);
    setSessionAttempted(prev => prev + 1);

    const result = analyzeReadingAttempt(currentText, spoken, newAttemptCount, language);
    setLastResult(result);

    // Save result to independent progress engine
    recordItemResult(levelNumber, currentItem.id, result.isSuccess);

    // Call AI Adaptive Reading Engine to update child-specific word difficulty & spaced revision
    if (levelNumber === 1 && currentItem.word) {
      recordAdaptiveAttemptResult(currentItem, result.isSuccess, spoken);
    }

    if (result.isSuccess) {
      setSessionMastered(prev => prev + 1);
      triggerSuccessConfetti();

      // Auto advance to next word after celebration delay
      autoAdvanceTimerRef.current = setTimeout(() => {
        loadNextItem(currentIndex + 1);
      }, 2000);
    } else {
      if (newAttemptCount >= 3) {
        // 3 failed attempts rule: allow proceeding or auto advance
        autoAdvanceTimerRef.current = setTimeout(() => {
          loadNextItem(currentIndex + 1);
        }, 2600);
      }
    }
  };

  const handleAttemptFailure = () => {
    const newAttemptCount = attemptCount + 1;
    setAttemptCount(newAttemptCount);
    setSessionAttempted(prev => prev + 1);
    recordItemResult(levelNumber, currentItem.id, false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 select-none animate-in fade-in">
      {/* Top Header Bar */}
      <div className="max-w-md mx-auto w-full flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
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
            className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
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

          {/* Real-time Supportive Feedback Card */}
          {lastResult && (
            <div className={`w-full p-4 rounded-2xl border text-left space-y-1.5 animate-in fade-in ${
              lastResult.isSuccess
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-indigo-50 border-indigo-200 text-indigo-950'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-black text-sm">
                  {lastResult.isSuccess ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Activity className="w-5 h-5 text-indigo-600" />
                  )}
                  <span>
                    {language === 'en' ? lastResult.feedbackTextEn : lastResult.feedbackTextHi}
                  </span>
                </div>

                <span className="text-xs font-mono font-black px-2 py-0.5 rounded-full bg-white shadow-2xs">
                  {lastResult.clarityScore}% Clarity
                </span>
              </div>

              {/* Recognition vs Clarity metrics */}
              <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span>Heard: <strong className="text-slate-900">{lastResult.spokenText}</strong></span>
                <span>
                  {lastResult.isRecognized ? '✓ Attempt Detected' : 'Try closer to mic'}
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
              We couldn't hear you clearly. Please tap Read and speak into your microphone!
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
        {/* Attempt Indicators */}
        <div className="flex items-center justify-between px-2 text-xs text-slate-300">
          <span>Attempt: {attemptCount} / 3</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((dot) => (
              <span
                key={dot}
                className={`w-2.5 h-2.5 rounded-full ${
                  attemptCount >= dot
                    ? lastResult?.isSuccess
                      ? 'bg-emerald-400'
                      : 'bg-amber-400'
                    : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Big Mic / Read Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`flex-1 py-4 rounded-3xl font-black text-base text-white flex items-center justify-center gap-2 shadow-xl active:scale-95 transition cursor-pointer ${
              isRecording
                ? 'bg-rose-600 animate-pulse ring-4 ring-rose-400/40'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isRecording ? (
              <>
                <Square className="w-5 h-5 fill-white" />
                <span>Stop Reading</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                <span>{attemptCount === 0 ? 'Read Aloud' : 'Read Again'}</span>
              </>
            )}
          </button>

          {/* Next Word Button (Available after green tick or 3 attempts) */}
          <button
            onClick={() => loadNextItem(currentIndex + 1)}
            disabled={!lastResult?.isSuccess && attemptCount < 3}
            className={`px-5 py-4 rounded-3xl font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
              lastResult?.isSuccess || attemptCount >= 3
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg'
                : 'bg-white/10 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>Next</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
