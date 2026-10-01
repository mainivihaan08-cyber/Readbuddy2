import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Mic,
  Sparkles,
  Timer,
  CheckCircle2,
  Award,
  RotateCcw,
  Zap
} from 'lucide-react';
import { AppLanguage, SoundDrillConfig } from '../types';
import { DRILLS_DATABASE } from '../data/drills';
import { getTopWeakSounds, addStars, updateBadgeProgress } from '../services/storage';
import { speakWord, SpeechRecognizer } from '../services/speech';
import { wordSimilarity, cleanWord } from '../services/soundAnalysis';
import { triggerDrillMasteryConfetti } from '../utils/confetti';

interface SoundDrillViewProps {
  language: AppLanguage;
  onDrillComplete?: () => void;
}

export const SoundDrillView: React.FC<SoundDrillViewProps> = ({
  language,
  onDrillComplete,
}) => {
  const [topSounds, setTopSounds] = useState<string[]>([]);
  const [activeSoundIndex, setActiveSoundIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes (300s)
  const [timerRunning, setTimerRunning] = useState(false);
  const [isListeningWord, setIsListeningWord] = useState<string | null>(null);
  const [completedWords, setCompletedWords] = useState<string[]>([]);
  const [twisterCompleted, setTwisterCompleted] = useState(false);
  const [showDrillCelebration, setShowDrillCelebration] = useState(false);

  const [speechRecognizer] = useState(() => new SpeechRecognizer(language));

  // Load top weak sounds
  useEffect(() => {
    async function loadSounds() {
      const sounds = await getTopWeakSounds(language);
      setTopSounds(sounds);
      setActiveSoundIndex(0);
    }
    loadSounds();
  }, [language]);

  // 5-minute timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerRunning) {
      setTimerRunning(false);
      finishDrill();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, timeLeft]);

  // Get current drill config from database
  const currentSoundChar = topSounds[activeSoundIndex] || (language === 'en' ? 'r' : 'र');
  const drillConfig: SoundDrillConfig =
    DRILLS_DATABASE.find(
      (d) => d.language === language && d.sound.toLowerCase() === currentSoundChar.toLowerCase()
    ) ||
    DRILLS_DATABASE.find((d) => d.language === language) ||
    DRILLS_DATABASE[0];

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleListenWord = (word: string) => {
    speakWord(word, language, 'normal');
  };

  const handleListenSlow = (word: string) => {
    speakWord(word, language, 'slow');
  };

  const handlePracticeWordMic = (targetWord: string) => {
    if (isListeningWord === targetWord) {
      speechRecognizer.stop();
      setIsListeningWord(null);
      return;
    }

    setIsListeningWord(targetWord);
    speechRecognizer.setLanguage(language);
    speechRecognizer.start(
      (transcript) => {
        const cleanedTarget = cleanWord(targetWord, language);
        const cleanedSpoken = cleanWord(transcript, language);

        if (wordSimilarity(cleanedTarget, cleanedSpoken) >= 0.6) {
          if (!completedWords.includes(targetWord)) {
            setCompletedWords((prev) => [...prev, targetWord]);
          }
          speechRecognizer.stop();
          setIsListeningWord(null);
        }
      },
      () => setIsListeningWord(null)
    );
  };

  const handleTwisterMic = () => {
    if (isListeningWord === 'twister') {
      speechRecognizer.stop();
      setIsListeningWord(null);
      return;
    }

    setIsListeningWord('twister');
    speechRecognizer.setLanguage(language);
    speechRecognizer.start(
      (transcript) => {
        if (transcript.length > 10) {
          setTwisterCompleted(true);
          updateBadgeProgress('drill-master', 1);
          speechRecognizer.stop();
          setIsListeningWord(null);
        }
      },
      () => setIsListeningWord(null)
    );
  };

  const finishDrill = () => {
    addStars(15);
    updateBadgeProgress('sound-explorer', 1);
    setShowDrillCelebration(true);
    triggerDrillMasteryConfetti();
    onDrillComplete?.();
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-28">
      {/* 5-Min Timer Header */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5 fill-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                {language === 'en' ? '5-Minute Sound Drill' : '५ मिनट ध्वनि अभ्यास'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {language === 'en'
                  ? 'Personalized for your top 3 practice sounds'
                  : 'आपके शीर्ष ३ अभ्यास ध्वनियों पर आधारित'}
              </p>
            </div>
          </div>

          {/* Timer Display & Start/Pause */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl font-mono text-sm font-bold text-slate-800 tabular-nums">
              <Timer className="w-4 h-4 text-indigo-600" />
              <span>{formatTimer(timeLeft)}</span>
            </div>
            <button
              onClick={() => setTimerRunning((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                timerRunning
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-indigo-600 text-white shadow-xs hover:bg-indigo-700'
              }`}
            >
              {timerRunning
                ? language === 'en' ? 'Pause' : 'रोकें'
                : language === 'en' ? 'Start' : 'शुरू करें'}
            </button>
          </div>
        </div>

        {/* Top 3 Weak Sound Selectors */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">
            {language === 'en' ? 'Focus Sounds:' : 'अभ्यास ध्वनियाँ:'}
          </span>
          {topSounds.map((snd, index) => {
            const isActive = activeSoundIndex === index;
            return (
              <button
                key={index}
                onClick={() => setActiveSoundIndex(index)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs scale-102'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>Sound /{snd}/</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sound Spotlight Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs mb-4">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div>
            <h3 className={`text-lg font-black text-slate-900 ${language === 'hi' ? 'font-hindi' : ''}`}>
              {drillConfig.title}
            </h3>
            <span className="text-[11px] text-indigo-600 font-semibold">
              {language === 'en' ? 'Sound Drill Spotlight' : 'विशेष ध्वनि अभ्यास'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-black">
            /{drillConfig.sound}/
          </div>
        </div>

        {/* Articulation Tip */}
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 mb-5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>{language === 'en' ? 'Gentle Tongue & Voice Tip:' : 'सरल आवाज़ सुझाव:'}</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed font-medium">
            {drillConfig.tip}
          </p>
        </div>

        {/* Word Practice Grid */}
        <div>
          <h4 className="text-xs font-bold text-slate-700 mb-3 flex items-center justify-between">
            <span>{language === 'en' ? 'Practice Words (Tap to listen & speak):' : 'अभ्यास शब्द:'}</span>
            <span className="text-[11px] font-semibold text-emerald-600">
              {completedWords.length} / {drillConfig.words.length} {language === 'en' ? 'Done' : 'पूरे हुए'}
            </span>
          </h4>

          <div className="grid grid-cols-2 gap-2">
            {drillConfig.words.map((word, idx) => {
              const isDone = completedWords.includes(word);
              const isListeningThis = isListeningWord === word;

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border transition-all ${
                    isDone
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                      : 'bg-slate-50/60 border-slate-200/80 text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-bold text-sm truncate ${language === 'hi' ? 'font-hindi text-base' : ''}`}>
                      {word}
                    </span>
                    {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Normal voice */}
                    <button
                      onClick={() => handleListenWord(word)}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 text-xs active:scale-95"
                      title="Listen"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    {/* Slow voice */}
                    <button
                      onClick={() => handleListenSlow(word)}
                      className="px-1.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 text-[10px] active:scale-95"
                      title="Slow"
                    >
                      🐢
                    </button>
                    {/* Mic button */}
                    <button
                      onClick={() => handlePracticeWordMic(word)}
                      className={`flex-1 py-1 px-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition ${
                        isListeningThis
                          ? 'bg-amber-600 text-white mic-active'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      <Mic className="w-3 h-3" />
                      <span>{isListeningThis ? '...' : 'Try'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fun Tongue Twister Challenge */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
              <span>🎯</span>
              <span>{language === 'en' ? 'Tongue Twister Challenge:' : 'टंग ट्विस्टर चुनौती:'}</span>
            </span>
            <button
              onClick={() => speakWord(drillConfig.tongueTwister, language, 'slow')}
              className="text-[11px] text-indigo-600 font-semibold hover:underline flex items-center gap-1"
            >
              <Volume2 className="w-3 h-3" />
              <span>{language === 'en' ? 'Hear slow' : 'धीमी आवाज़'}</span>
            </button>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 mb-3">
            <p className={`text-sm font-bold text-indigo-950 leading-relaxed ${language === 'hi' ? 'font-hindi text-base' : ''}`}>
              "{drillConfig.tongueTwister}"
            </p>
            {drillConfig.tongueTwisterSyllables && (
              <p className="mt-1.5 text-[11px] text-indigo-700/80 font-mono">
                {drillConfig.tongueTwisterSyllables}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTwisterMic}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
                isListeningWord === 'twister'
                  ? 'bg-amber-600 text-white mic-active'
                  : twisterCompleted
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>
                {isListeningWord === 'twister'
                  ? language === 'en' ? 'Listening to Twister...' : 'सुन रहे हैं...'
                  : twisterCompleted
                  ? language === 'en' ? 'Mastered! Try Again' : 'पूरा हुआ! दोबारा करें'
                  : language === 'en' ? 'Say Tongue Twister (+10 ⭐)' : 'टंग ट्विस्टर बोलें'}
              </span>
            </button>
          </div>
        </div>

        {/* Finish Early Button */}
        <button
          onClick={finishDrill}
          className="mt-5 w-full py-3 rounded-2xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 active:scale-98 transition flex items-center justify-center gap-2"
        >
          <Award className="w-4 h-4 text-amber-400" />
          <span>{language === 'en' ? 'Complete 5-Min Drill (+15 ⭐)' : 'ड्रिल पूरी करें (+१५ ⭐)'}</span>
        </button>
      </div>

      {/* Drill Celebration Modal */}
      {showDrillCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center border border-slate-100">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center mb-3">
              <Zap className="w-8 h-8 fill-amber-500" />
            </div>

            <h3 className="text-xl font-black text-slate-900">
              {language === 'en' ? 'Super Speech Drill!' : 'शानदार ध्वनि अभ्यास!'}
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              {language === 'en'
                ? 'Your speech clarity muscles are getting stronger every day!'
                : 'आपकी आवाज़ और जीभ का नियंत्रण प्रतिदिन बेहतर हो रहा है!'}
            </p>

            <div className="my-5 p-4 bg-amber-50 rounded-2xl border border-amber-200">
              <span className="text-3xl font-black text-amber-600">+15</span>
              <span className="block text-xs font-bold text-amber-800 mt-0.5">
                {language === 'en' ? 'Bonus Stars Earned ⭐' : 'बोनस सितारे मिले ⭐'}
              </span>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setShowDrillCelebration(false);
                  setTimeLeft(300);
                  setActiveSoundIndex((prev) => (prev + 1) % Math.max(1, topSounds.length));
                }}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 active:scale-98 transition shadow-xs"
              >
                {language === 'en' ? 'Practice Another Sound' : 'दूसरी ध्वनि का अभ्यास करें'}
              </button>
              <button
                onClick={() => setShowDrillCelebration(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 active:scale-98 transition"
              >
                {language === 'en' ? 'Back to Drills' : 'वापस जाएँ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
