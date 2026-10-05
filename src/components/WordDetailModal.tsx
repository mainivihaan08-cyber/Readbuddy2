import React, { useState, useEffect } from 'react';
import {
  X,
  Volume2,
  Mic,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertCircle,
  Award,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Layers,
  ChevronRight,
  HelpCircle,
  Calendar,
  Clock
} from 'lucide-react';
import {
  AppLanguage,
  ChildWordProfile,
  WordAttemptRecord,
  AdaptiveWordPracticeSet
} from '../types';
import {
  getWordAttemptsForChild,
  generateAdaptivePracticeSet
} from '../services/wordDifficultyEngine';
import { speakWord, speakSyllables, SpeechRecognizer } from '../services/speech';
import { wordSimilarity, cleanWord } from '../services/soundAnalysis';
import { recordWordAttempts } from '../services/wordDifficultyEngine';
import { playSuccessChime, playEncouragingTone } from '../utils/soundEffects';
import { triggerDailySessionCompleteConfetti } from '../utils/confetti';
import { ensureMicrophoneGranted } from '../utils/permissionManager';

interface WordDetailModalProps {
  wordProfile: ChildWordProfile;
  language: AppLanguage;
  childId?: string;
  onClose: () => void;
  onWordUpdated?: () => void;
}

export const WordDetailModal: React.FC<WordDetailModalProps> = ({
  wordProfile,
  language,
  childId,
  onClose,
  onWordUpdated,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'practice' | 'history'>('practice');
  const [attempts, setAttempts] = useState<WordAttemptRecord[]>([]);
  const [practiceSet, setPracticeSet] = useState<AdaptiveWordPracticeSet | null>(null);
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [isListening, setIsListening] = useState(false);
  const [spokenAttempt, setSpokenAttempt] = useState('');
  const [levelResult, setLevelResult] = useState<'success' | 'try-again' | null>(null);
  const [speechRecognizer] = useState(() => new SpeechRecognizer(language));

  useEffect(() => {
    async function loadData() {
      const records = await getWordAttemptsForChild(childId || wordProfile.childId, wordProfile.word);
      setAttempts(records);
      const set = generateAdaptivePracticeSet(wordProfile.word, language, wordProfile.primarySound);
      setPracticeSet(set);
    }
    loadData();
  }, [wordProfile, language, childId]);

  const handlePlayAudio = (text: string, speed: 'normal' | 'slow' = 'normal') => {
    speakWord(text, language, speed);
  };

  const handlePlaySyllables = (syllables: string) => {
    speakSyllables(syllables, language);
  };

  const handleStartMic = async (targetText: string) => {
    if (isListening) {
      speechRecognizer.stop();
      setIsListening(false);
      return;
    }

    const granted = await ensureMicrophoneGranted(language);
    if (!granted) {
      return;
    }

    setLevelResult(null);
    setSpokenAttempt('');
    setIsListening(true);

    speechRecognizer.setLanguage(language);
    speechRecognizer.start(
      async (transcript) => {
        const cleanedSpoken = cleanWord(transcript, language);
        const cleanedTarget = cleanWord(targetText, language);
        setSpokenAttempt(cleanedSpoken);

        const sim = wordSimilarity(cleanedTarget, cleanedSpoken);
        const isSuccess = sim >= 0.65;

        if (isSuccess) {
          setLevelResult('success');
          playSuccessChime();
          if (currentLevel === 5) {
            triggerDailySessionCompleteConfetti();
          }
        } else {
          setLevelResult('try-again');
          playEncouragingTone();
        }

        // Record attempt permanently into word difficulty engine
        await recordWordAttempts(
          [
            {
              expected: targetText,
              cleaned: cleanedTarget,
              status: isSuccess ? 'correct' : 'needs-practice',
              spoken: cleanedSpoken,
              similarity: sim,
            },
          ],
          `drill_level_${currentLevel}_${Date.now()}`,
          undefined,
          language,
          childId || wordProfile.childId
        );

        // Reload history
        const updated = await getWordAttemptsForChild(childId || wordProfile.childId, wordProfile.word);
        setAttempts(updated);
        onWordUpdated?.();

        speechRecognizer.stop();
        setIsListening(false);
      },
      (err) => {
        console.warn('Drill mic error', err);
        setIsListening(false);
      },
      (active) => setIsListening(active)
    );
  };

  const getResultBadge = (res: 'correct' | 'incorrect' | 'uncertain') => {
    if (res === 'correct') {
      return (
        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black shadow-2xs">
          ✓
        </span>
      );
    }
    if (res === 'incorrect') {
      return (
        <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-black shadow-2xs">
          ✕
        </span>
      );
    }
    return (
      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-black shadow-2xs">
        ?
      </span>
    );
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-emerald-600" />;
      case 'declining':
      case 'needs-attention':
        return <TrendingDown className="w-4 h-4 text-rose-600" />;
      case 'mastered':
        return <Award className="w-4 h-4 text-amber-500" />;
      default:
        return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-slate-100 max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-5 shrink-0 relative">
          <div className="flex items-center justify-between pb-2 border-b border-indigo-700/80">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                {language === 'en' ? 'Word Difficulty Profile' : 'शब्द उच्चारण प्रोफ़ाइल'}
              </span>
              {wordProfile.primarySound && (
                <span className="text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
                  /{wordProfile.primarySound}/
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-indigo-300 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white capitalize">
                "{wordProfile.word}"
              </h2>
              {wordProfile.syllables && (
                <span className="text-xs font-semibold text-indigo-200 block mt-0.5">
                  Syllables: <strong className="text-white">{wordProfile.syllables}</strong>
                </span>
              )}
            </div>

            <button
              onClick={() => handlePlayAudio(wordProfile.word)}
              className="p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md active:scale-95 transition flex items-center gap-1.5"
              title="Listen to word"
            >
              <Volume2 className="w-5 h-5" />
              <span className="text-xs font-bold">{language === 'en' ? 'Listen' : 'सुनें'}</span>
            </button>
          </div>

          {/* Core Metrics Bar */}
          <div className="grid grid-cols-4 gap-2 mt-4 text-center">
            <div className="bg-indigo-950/70 p-2 rounded-xl border border-indigo-700/60">
              <span className="block text-[9px] text-indigo-300 font-bold uppercase">Accuracy</span>
              <span className="text-sm font-black text-amber-300">{wordProfile.accuracy}%</span>
            </div>
            <div className="bg-indigo-950/70 p-2 rounded-xl border border-indigo-700/60">
              <span className="block text-[9px] text-indigo-300 font-bold uppercase">Attempts</span>
              <span className="text-sm font-black text-white">{wordProfile.totalAttempts}</span>
            </div>
            <div className="bg-indigo-950/70 p-2 rounded-xl border border-indigo-700/60">
              <span className="block text-[9px] text-indigo-300 font-bold uppercase">Recent (Last 8)</span>
              <span className="text-sm font-black text-emerald-300">{wordProfile.recentAccuracy}%</span>
            </div>
            <div className="bg-indigo-950/70 p-2 rounded-xl border border-indigo-700/60">
              <span className="block text-[9px] text-indigo-300 font-bold uppercase">Status</span>
              <span className="text-[11px] font-extrabold text-indigo-100 capitalize truncate block">
                {wordProfile.currentStatus.replace('-', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Sub-Tabs: 5-Step Adaptive Practice vs Long-Term History */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 shrink-0">
          <button
            onClick={() => setActiveSubTab('practice')}
            className={`py-2 px-4 text-xs font-extrabold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'practice'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{language === 'en' ? '5-Level Adaptive Drill' : '५-चरणीय अनुकूली अभ्यास'}</span>
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`py-2 px-4 text-xs font-extrabold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'history'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>{language === 'en' ? 'Attempt History' : 'अभ्यास इतिहास'}</span>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full">
              {attempts.length}
            </span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* ==================================================== */}
          {/* SUB-TAB 1: 5-LEVEL ADAPTIVE PRACTICE LADDER          */}
          {/* ==================================================== */}
          {activeSubTab === 'practice' && practiceSet && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold block">
                    {language === 'en' ? 'Adaptive 5-Level Mastery Ladder' : '५-स्तरीय क्रमिक अभ्यास'}
                  </span>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    {language === 'en'
                      ? 'Progress step-by-step from isolated sound to full sentence context.'
                      : 'ध्वनि से शुरू करके शब्दांश और पूरे वाक्य तक धीरे-धीरे अभ्यास करें।'}
                  </p>
                </div>
              </div>

              {/* Level Step Selector */}
              <div className="grid grid-cols-5 gap-1.5 text-center">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => {
                      setCurrentLevel(lvl);
                      setLevelResult(null);
                      setSpokenAttempt('');
                    }}
                    className={`p-2 rounded-xl border text-xs font-extrabold transition cursor-pointer ${
                      currentLevel === lvl
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block text-[9px] uppercase opacity-75">Lvl {lvl}</span>
                    <span className="text-xs">
                      {lvl === 1 ? 'Sound' : lvl === 2 ? 'Blend' : lvl === 3 ? 'Simple' : lvl === 4 ? 'Target' : 'Context'}
                    </span>
                  </button>
                ))}
              </div>

              {/* Active Step Practice Card */}
              <div className="bg-white border-2 border-indigo-100 rounded-3xl p-5 shadow-sm space-y-4 text-center">
                {/* Level Title */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                  <span className="font-bold text-indigo-700 uppercase tracking-wider text-[11px]">
                    {currentLevel === 1 && (language === 'en' ? 'Level 1: Sound Alone' : 'स्तर १: मूल ध्वनि')}
                    {currentLevel === 2 && (language === 'en' ? 'Level 2: Sound + Vowel Blend' : 'स्तर २: ध्वनि व मात्रा का मेल')}
                    {currentLevel === 3 && (language === 'en' ? 'Level 3: Simple Root Word' : 'स्तर ३: सरल मूल शब्द')}
                    {currentLevel === 4 && (language === 'en' ? 'Level 4: Target Word Syllables' : 'स्तर ४: मुख्य शब्द व शब्दांश')}
                    {currentLevel === 5 && (language === 'en' ? 'Level 5: Word in Sentence Context' : 'स्तर ५: वाक्य में प्रयोग')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Step {currentLevel} of 5</span>
                </div>

                {/* Level Display Target Content */}
                <div className="py-2 space-y-2">
                  {currentLevel === 1 && (
                    <div className="space-y-2">
                      <span className="text-4xl font-black text-indigo-900 tracking-wider">
                        {practiceSet.level1Sound.sound}
                      </span>
                      <p className="text-xs text-slate-600 font-medium max-w-xs mx-auto leading-relaxed">
                        {practiceSet.level1Sound.description}
                      </p>
                    </div>
                  )}

                  {currentLevel === 2 && (
                    <div className="space-y-2">
                      <span className="text-3xl font-black text-indigo-900 tracking-widest">
                        {practiceSet.level2SoundVowel.text}
                      </span>
                      <p className="text-xs text-slate-600 font-medium">
                        {practiceSet.level2SoundVowel.audioHelp}
                      </p>
                    </div>
                  )}

                  {currentLevel === 3 && (
                    <div className="space-y-2">
                      <span className="text-3xl font-black text-indigo-900">
                        "{practiceSet.level3SimpleWord.text}"
                      </span>
                      <p className="text-xs text-slate-600 font-medium">
                        {practiceSet.level3SimpleWord.meaning}
                      </p>
                    </div>
                  )}

                  {currentLevel === 4 && (
                    <div className="space-y-2">
                      <span className="text-3xl font-black text-indigo-900">
                        {practiceSet.level4TargetWord.syllables}
                      </span>
                      <p className="text-xs text-slate-600 font-medium">
                        {practiceSet.level4TargetWord.slowAudioTip}
                      </p>
                    </div>
                  )}

                  {currentLevel === 5 && (
                    <div className="space-y-2">
                      <p className="text-base font-bold text-slate-900 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 leading-relaxed">
                        "{practiceSet.level5Sentence.text}"
                      </p>
                      <p className="text-xs text-indigo-600 font-semibold">
                        {language === 'en' ? 'Read the whole sentence smoothly!' : 'पूरा वाक्य एक प्रवाह में पढ़ें!'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Audio Buttons */}
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      const textToPlay =
                        currentLevel === 1
                          ? practiceSet.level1Sound.sound
                          : currentLevel === 2
                          ? practiceSet.level2SoundVowel.text
                          : currentLevel === 3
                          ? practiceSet.level3SimpleWord.text
                          : currentLevel === 4
                          ? practiceSet.level4TargetWord.text
                          : practiceSet.level5Sentence.text;
                      handlePlayAudio(textToPlay, 'normal');
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4 text-indigo-600" />
                    <span>{language === 'en' ? 'Listen Normal' : 'सामान्य गति'}</span>
                  </button>

                  <button
                    onClick={() => {
                      const textToPlay =
                        currentLevel === 4
                          ? practiceSet.level4TargetWord.text
                          : currentLevel === 5
                          ? practiceSet.level5Sentence.text
                          : practiceSet.word;
                      handlePlayAudio(textToPlay, 'slow');
                    }}
                    className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer border border-amber-200/60"
                  >
                    <Volume2 className="w-4 h-4 text-amber-600" />
                    <span>{language === 'en' ? 'Listen Slow' : 'धीमी गति'}</span>
                  </button>
                </div>

                {/* Microphone Practice Button */}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      const target =
                        currentLevel === 1
                          ? practiceSet.primarySound
                          : currentLevel === 2
                          ? practiceSet.level2SoundVowel.text.split('·')[0].trim()
                          : currentLevel === 3
                          ? practiceSet.level3SimpleWord.text
                          : currentLevel === 4
                          ? practiceSet.level4TargetWord.text
                          : practiceSet.level5Sentence.text;
                      handleStartMic(target);
                    }}
                    className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-98 cursor-pointer ${
                      isListening
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                    }`}
                  >
                    <Mic className="w-5 h-5" />
                    <span>
                      {isListening
                        ? (language === 'en' ? 'Listening... Speak now!' : 'सुन रहे हैं... बोलिए!')
                        : (language === 'en' ? 'Tap & Say It Into Mic' : 'माइक दबाकर बोलें')}
                    </span>
                  </button>
                </div>

                {/* Practice Feedback Result */}
                {levelResult === 'success' && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center justify-between animate-in zoom-in-95">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        {language === 'en' ? 'Wonderful clarity! Excellent attempt!' : 'शानदार उच्चारण! बहुत बढ़िया!'}
                      </span>
                    </div>
                    {currentLevel < 5 && (
                      <button
                        onClick={() => {
                          setCurrentLevel((l) => Math.min(5, l + 1));
                          setLevelResult(null);
                          setSpokenAttempt('');
                        }}
                        className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-black hover:bg-emerald-700 flex items-center gap-1"
                      >
                        <span>Next Step</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {levelResult === 'try-again' && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 text-xs font-semibold text-left space-y-1 animate-in zoom-in-95">
                    <div className="flex items-center gap-1.5 font-bold text-amber-800">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>{language === 'en' ? 'You are getting closer!' : 'आप बहुत करीब हैं!'}</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      {language === 'en'
                        ? `We heard "${spokenAttempt || '...' }". Try once more slowly with gentle breath.`
                        : `हमने सुना "${spokenAttempt || '...'}". एक बार धीमी गति से पुनः प्रयास करें।`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* SUB-TAB 2: RAW CHRONOLOGICAL ATTEMPT HISTORY TABLE  */}
          {/* ==================================================== */}
          {activeSubTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 text-xs text-slate-500">
                <span>
                  {language === 'en' ? 'All Lifetime Word Attempts:' : 'सभी अभ्यास प्रयास:'}
                </span>
                <span className="font-bold text-indigo-700">
                  {attempts.length} {attempts.length === 1 ? 'Attempt' : 'Attempts'}
                </span>
              </div>

              {/* Recent Attempt Timeline Dots */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  {language === 'en' ? 'Recent Performance Streak:' : 'हाल के प्रयास:'}
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                  {attempts.slice(-12).map((a, idx) => (
                    <div key={a.id || idx} className="flex flex-col items-center gap-0.5 shrink-0">
                      {getResultBadge(a.result)}
                      <span className="text-[8px] text-slate-400 font-mono">#{idx + 1}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chronological Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                <div className="bg-slate-100 p-2.5 font-bold text-slate-700 grid grid-cols-12 text-[11px]">
                  <span className="col-span-2">Time</span>
                  <span className="col-span-3">Result</span>
                  <span className="col-span-4">What Was Heard</span>
                  <span className="col-span-3 text-right">Confidence</span>
                </div>

                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {attempts.map((rec, i) => (
                    <div key={rec.id || i} className="p-2.5 grid grid-cols-12 items-center text-[11px] bg-white hover:bg-slate-50">
                      <span className="col-span-2 text-[10px] text-slate-500 font-medium">
                        {rec.dateStr.slice(5)}
                      </span>
                      <div className="col-span-3 flex items-center gap-1.5">
                        {getResultBadge(rec.result)}
                        <span className="font-bold capitalize text-slate-800 text-[10px]">
                          {rec.result}
                        </span>
                      </div>
                      <span className="col-span-4 italic text-slate-600 truncate">
                        "{rec.observedText || rec.targetWord}"
                      </span>
                      <span className="col-span-3 text-right font-mono font-bold text-slate-500 text-[10px]">
                        {Math.round(rec.confidence * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Educational Disclaimer */}
              <p className="text-[10px] text-slate-400 italic text-center pt-2 border-t border-slate-100">
                "Practice insights are educational and are not a medical diagnosis."
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
