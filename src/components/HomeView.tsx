import React, { useState, useEffect } from 'react';
import {
  Flame,
  Star,
  BookOpen,
  Target,
  Trophy,
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  Lock,
  PartyPopper,
  Volume2,
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import { AppLanguage, ChildProfile, BadgeItem, ChildWordProfile } from '../types';
import { triggerDailySessionCompleteConfetti } from '../utils/confetti';
import { BuddyMascot } from './BuddyMascot';
import { getTopDifficultWords } from '../services/wordDifficultyEngine';
import { WordDetailModal } from './WordDetailModal';
import { speakWord } from '../services/speech';

interface HomeViewProps {
  language: AppLanguage;
  profile: ChildProfile;
  badges: BadgeItem[];
  onStartReading: () => void;
  onStartDrill: () => void;
  onStartCoach?: () => void;
  onClaimDailyChallenge: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  language,
  profile,
  badges,
  onStartReading,
  onStartDrill,
  onStartCoach,
  onClaimDailyChallenge,
}) => {
  const [topWords, setTopWords] = useState<ChildWordProfile[]>([]);
  const [selectedWord, setSelectedWord] = useState<ChildWordProfile | null>(null);

  const loadTopWords = async () => {
    const list = await getTopDifficultWords(language, profile.childId, 4);
    setTopWords(list);
  };

  useEffect(() => {
    loadTopWords();

    const handleUpdate = () => {
      loadTopWords();
    };

    window.addEventListener('readbuddy_word_difficulty_updated', handleUpdate);
    return () => {
      window.removeEventListener('readbuddy_word_difficulty_updated', handleUpdate);
    };
  }, [language, profile.childId]);

  // Session cap progress
  const practicedMinutes = Math.floor(profile.todaySessionSeconds / 60);
  const capMinutes = profile.dailyCapMinutes || 15;
  const timerPercent = Math.min(100, Math.round((practicedMinutes / capMinutes) * 100));

  // Level progress
  const xpThresholds = [0, 20, 50, 100, 180, 300];
  const currentThreshold = xpThresholds[profile.level - 1] || 0;
  const nextThreshold = xpThresholds[profile.level] || (currentThreshold + 50);
  const starsInLevel = Math.max(0, profile.stars - currentThreshold);
  const starsNeeded = nextThreshold - currentThreshold;
  const levelPercent = Math.min(100, Math.round((starsInLevel / starsNeeded) * 100));

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-28 space-y-4">
      {/* Friendly Greeting Card */}
      <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-800 rounded-3xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-cyan-400/20 blur-lg pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold tracking-wider uppercase text-indigo-200">
              {language === 'en' ? 'CBSE Class 6 Reading' : 'कक्षा ६ वाचन मंच'}
            </span>
            <span className="text-xs font-bold bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>{language === 'en' ? 'Buddy Companion' : 'मित्र रोबोट'}</span>
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex-1">
              <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${language === 'hi' ? 'font-hindi' : ''}`}>
                {language === 'en'
                  ? `Hello, ${profile.name}! 👋`
                  : `नमस्ते, ${profile.name}! 👋`}
              </h1>

              <p className="mt-1 text-xs text-indigo-100 font-medium">
                {language === 'en'
                  ? 'Ready to make your voice clearer and more confident today?'
                  : 'आज अपनी आवाज़ को और अधिक स्पष्ट और आत्मविश्वास से भरने के लिए तैयार?'}
              </p>
            </div>

            {/* Buddy Robot Mascot Greeting */}
            <div className="shrink-0 -mr-1">
              <BuddyMascot
                mood={practicedMinutes >= capMinutes ? 'cheering' : 'greeting'}
                size="md"
                showSpeechBubble={false}
              />
            </div>
          </div>

          {/* Buddy Greeting Speech Bubble */}
          <div className="mb-4 px-3 py-2 rounded-2xl bg-white/15 backdrop-blur-xs border border-white/20 text-xs font-bold text-white flex items-center gap-2">
            <span className="text-sm">🤖</span>
            <span>
              {practicedMinutes >= capMinutes
                ? language === 'en'
                  ? `Goal achieved, ${profile.name}! You're shining! ⭐`
                  : `दैनिक लक्ष्य पूरा हुआ, ${profile.name}! शानदार! ⭐`
                : language === 'en'
                ? `Ready to read, ${profile.name}?`
                : `पढ़ने के लिए तैयार, ${profile.name}?`}
            </span>
          </div>

          {/* Level Bar */}
          <div className="mt-4 pt-3 border-t border-white/15">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-amber-300 flex items-center gap-1">
                <Trophy className="w-3.5 h-3.5" />
                <span>Level {profile.level}: {profile.levelTitle}</span>
              </span>
              <span className="text-indigo-200 font-mono text-[11px]">
                {starsInLevel} / {starsNeeded} ⭐
              </span>
            </div>

            <div className="w-full h-2.5 bg-black/25 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full transition-all duration-500"
                style={{ width: `${levelPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Daily Session Goal with Circular Progress Ring */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4 sm:gap-5 transition-all">
        {/* Circular Progress Ring */}
        <div className="relative shrink-0 flex items-center justify-center">
          <svg className="w-22 h-22 sm:w-24 sm:h-24 -rotate-90 transform" viewBox="0 0 100 100">
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4F46E5" />
                <stop offset="100%" stopColor="#06B6D4" />
              </linearGradient>
              <linearGradient id="ringSuccessGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>

            {/* Background Track */}
            <circle
              cx="50"
              cy="50"
              r="40"
              className="text-slate-100"
              strokeWidth="8"
              stroke="currentColor"
              fill="transparent"
            />

            {/* Animated Progress Ring */}
            <circle
              cx="50"
              cy="50"
              r="40"
              strokeWidth="8"
              strokeDasharray={2 * Math.PI * 40}
              strokeDashoffset={2 * Math.PI * 40 * (1 - Math.min(1, practicedMinutes / capMinutes))}
              strokeLinecap="round"
              stroke={practicedMinutes >= capMinutes ? 'url(#ringSuccessGrad)' : 'url(#ringGrad)'}
              fill="transparent"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Center Metric */}
          <button
            onClick={() => {
              if (practicedMinutes >= capMinutes) {
                triggerDailySessionCompleteConfetti();
              }
            }}
            className="absolute inset-0 flex flex-col items-center justify-center text-center cursor-pointer active:scale-95 transition"
            title={practicedMinutes >= capMinutes ? 'Goal Achieved! Tap for celebration!' : `${practicedMinutes} of ${capMinutes} min completed`}
          >
            {practicedMinutes >= capMinutes ? (
              <span className="text-xl animate-bounce">🌟</span>
            ) : (
              <>
                <span className="text-lg sm:text-xl font-black text-slate-900 leading-none tabular-nums font-mono">
                  {practicedMinutes}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">
                  / {capMinutes}m
                </span>
              </>
            )}
          </button>
        </div>

        {/* Goal Description & Status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span className="text-xs font-extrabold text-slate-900 truncate">
              {language === 'en' ? 'Daily 15-Min Voice Goal' : 'दैनिक १५ मिनट लक्ष्य'}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                practicedMinutes >= capMinutes
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-indigo-50 text-indigo-700'
              }`}
            >
              {practicedMinutes >= capMinutes
                ? '100% Done'
                : `${timerPercent}%`}
            </span>
          </div>

          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            {practicedMinutes >= capMinutes
              ? language === 'en'
                ? 'Awesome job! Daily speech stamina goal complete! 👏'
                : 'शानदार! आज का १५ मिनट अभ्यास लक्ष्य पूरा हुआ! 👏'
              : language === 'en'
              ? `${Math.max(1, capMinutes - practicedMinutes)} min remaining to protect voice & hit peak clarity.`
              : `लक्ष्य पूरा करने और स्पष्टता बढ़ाने के लिए केवल ${Math.max(1, capMinutes - practicedMinutes)} मिनट शेष।`}
          </p>

          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1 font-semibold text-indigo-600">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{language === 'en' ? '+15 Stars on finish' : '+१५ बोनस सितारे'}</span>
            </span>

            {practicedMinutes >= capMinutes && (
              <button
                onClick={triggerDailySessionCompleteConfetti}
                className="flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200"
              >
                <PartyPopper className="w-3.5 h-3.5 text-amber-600" />
                <span>{language === 'en' ? 'Celebrate!' : 'उत्सव मनाएँ!'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Primary Action Buttons: Start Reading & 5-Min Drill */}
      <div className="grid grid-cols-2 gap-3">
        {/* BUTTON 1: Start Reading */}
        <button
          onClick={onStartReading}
          className="p-4 rounded-3xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 active:scale-98 transition flex flex-col justify-between text-left min-h-[140px]"
        >
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mb-2">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xs font-bold text-indigo-200 uppercase tracking-wide block">
              {language === 'en' ? 'Words, Lines & Stories' : 'शब्द, पंक्तियाँ और पाठ'}
            </span>
            <h3 className="text-base font-extrabold text-white leading-tight">
              {language === 'en' ? 'Start Reading Now' : 'पढ़ना शुरू करें'}
            </h3>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-indigo-100 font-semibold">
            <span>{language === 'en' ? 'Live speech mic' : 'माइक वाचन'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>

        {/* BUTTON 2: 5-Minute Sound Drill */}
        <button
          onClick={onStartDrill}
          className="p-4 rounded-3xl bg-amber-500 text-white shadow-md shadow-amber-500/20 hover:bg-amber-600 active:scale-98 transition flex flex-col justify-between text-left min-h-[140px]"
        >
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center mb-2">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xs font-bold text-amber-100 uppercase tracking-wide block">
              {language === 'en' ? 'Tongue Twisters' : 'ध्वनि अभ्यास'}
            </span>
            <h3 className="text-base font-extrabold text-white leading-tight">
              {language === 'en' ? '5-Minute Sound Drill' : '५ मिनट ध्वनि अभ्यास'}
            </h3>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[11px] text-amber-100 font-semibold">
            <span>{language === 'en' ? 'Top 3 sounds' : 'शीर्ष ध्वनियाँ'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>

      {/* FEATURED: AI Speech Coach & Live Voice Buddy Card */}
      {onStartCoach && (
        <button
          onClick={onStartCoach}
          className="w-full text-left p-4 rounded-3xl bg-gradient-to-r from-cyan-600 via-indigo-600 to-indigo-700 text-white shadow-md hover:opacity-95 active:scale-98 transition flex items-center justify-between gap-3 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-cyan-200" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-200 block">
                {language === 'en' ? 'New: Live Audio Intelligence' : 'नवीन: लाइव ऑडियो इंटेलिजेंस'}
              </span>
              <h4 className="text-sm font-extrabold text-white leading-tight">
                {language === 'en' ? 'AI Speech & Voice Coach' : 'एआई वाक एवं स्वर कोच'}
              </h4>
              <p className="text-[11px] text-indigo-100 mt-0.5 line-clamp-1">
                {language === 'en'
                  ? '31-step diagnostic report & real-time Live API voice chat'
                  : '31-चरणीय डायग्नोस्टिक रिपोर्ट और रीयल-टाइम वॉइस चैट'}
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <ArrowRight className="w-4 h-4 text-white" />
          </div>
        </button>
      )}

      {/* Words I'm Practicing Section (Requirement 25) */}
      {topWords.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
              <Target className="w-4 h-4 text-indigo-600" />
              <span>{language === 'en' ? "Words I'm Practicing" : 'अभ्यास योग्य शब्द'}</span>
            </div>
            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
              {topWords.length} {language === 'en' ? 'Words' : 'शब्द'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {topWords.map((w) => (
              <div
                key={w.id}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 hover:border-indigo-300 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-slate-900 text-sm truncate">
                      "{w.word}"
                    </span>
                    {w.primarySound && (
                      <span className="text-[9px] font-mono font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">
                        /{w.primarySound}/
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                    <span>Accuracy: <strong className="text-slate-800">{w.accuracy}%</strong></span>
                    <span>{w.totalAttempts} tries</span>
                  </div>

                  <div className="flex items-center gap-1 pt-1.5">
                    {w.recentAttempts.slice(-5).map((r, i) => (
                      <span
                        key={i}
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                          r === 'correct'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r === 'incorrect'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {r === 'correct' ? '✓' : r === 'incorrect' ? '✕' : '?'}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedWord(w)}
                  className="w-full mt-2 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs active:scale-95 transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>{language === 'en' ? 'Practice Word' : 'अभ्यास करें'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's Bonus Challenge Card */}
      <div className="bg-gradient-to-r from-amber-50 via-amber-100/50 to-amber-50 rounded-3xl p-4 sm:p-5 border border-amber-200/90 shadow-xs">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-200/60">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-900">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>{language === 'en' ? "Today's Speech Challenge" : 'आज की ध्वनि चुनौती'}</span>
          </div>
          <span className="text-xs font-extrabold text-amber-700 bg-white/80 px-2.5 py-0.5 rounded-full border border-amber-300">
            +15 Stars ⭐
          </span>
        </div>

        <p className="text-xs font-semibold text-slate-800 leading-relaxed">
          {language === 'en'
            ? 'Read any story with gentle speed and master the rolling "R" and "SH" sound cards!'
            : 'कोई भी पाठ शांत गति से पढ़ें और "र" व "श" ध्वनि का अभ्यास पूरा करें!'}
        </p>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            {profile.todayChallengeCompleted
              ? language === 'en' ? 'Completed today! 🎉' : 'आज पूरा हो गया! 🎉'
              : language === 'en' ? 'Ready to claim' : 'तैयार'}
          </span>

          <button
            onClick={onClaimDailyChallenge}
            disabled={profile.todayChallengeCompleted}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              profile.todayChallengeCompleted
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1'
                : 'bg-amber-600 text-white hover:bg-amber-700 active:scale-95 shadow-xs'
            }`}
          >
            {profile.todayChallengeCompleted ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{language === 'en' ? 'Completed' : 'सम्पन्न'}</span>
              </>
            ) : (
              <span>{language === 'en' ? 'Do Challenge' : 'चुनौती शुरू करें'}</span>
            )}
          </button>
        </div>
      </div>

      {/* Reading Badges Showcase */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              {language === 'en' ? 'Speech & Reading Badges' : 'पठन एवं वाचन पदक'}
            </h3>
            <span className="text-[11px] text-slate-500">
              {language === 'en' ? 'Earn stars to unlock badges' : 'सितारे जीतकर बैज अनलॉक करें'}
            </span>
          </div>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
            {badges.filter((b) => b.unlocked).length} / {badges.length}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {badges.map((badge) => {
            return (
              <div
                key={badge.id}
                className={`p-3 rounded-2xl border transition-all ${
                  badge.unlocked
                    ? 'bg-indigo-50/50 border-indigo-200 text-slate-900'
                    : 'bg-slate-50/60 border-slate-200/70 text-slate-400 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xl">{badge.icon}</span>
                  {badge.unlocked ? (
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                      Unlocked
                    </span>
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>

                <h4 className="text-xs font-bold text-slate-800 truncate">
                  {language === 'en' ? badge.name : badge.nameHi}
                </h4>
                <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                  {language === 'en' ? badge.description : badge.descriptionHi}
                </p>

                {/* Micro progress */}
                <div className="mt-2 w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      badge.unlocked ? 'bg-indigo-600' : 'bg-slate-400'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.round((badge.progress / badge.target) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Word Detail & Practice Modal */}
      {selectedWord && (
        <WordDetailModal
          wordProfile={selectedWord}
          language={language}
          childId={profile.childId}
          onClose={() => setSelectedWord(null)}
          onWordUpdated={loadTopWords}
        />
      )}
    </div>
  );
};
