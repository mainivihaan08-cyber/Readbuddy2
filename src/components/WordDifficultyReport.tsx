import React, { useState, useEffect } from 'react';
import {
  Target,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  BookOpen,
  Volume2,
  Mic,
  ArrowRight,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  Calendar,
  Layers,
  Star,
  Info
} from 'lucide-react';
import {
  AppLanguage,
  ChildProfile,
  ChildWordProfile,
  DailyWordProgress,
  WeeklyWordProgress
} from '../types';
import {
  getChildWordProfiles,
  getTopDifficultWords,
  getSoundPatternAnalysis,
  getDailyWordProgress,
  getWeeklyWordProgress
} from '../services/wordDifficultyEngine';
import { speakWord } from '../services/speech';
import { WordDetailModal } from './WordDetailModal';

interface WordDifficultyReportProps {
  language: AppLanguage;
  profile?: ChildProfile;
  onStartReading?: () => void;
}

type FilterCategory = 'all' | 'needs-practice' | 'improving' | 'mastered' | 'declining';

export const WordDifficultyReport: React.FC<WordDifficultyReportProps> = ({
  language,
  profile,
  onStartReading,
}) => {
  const [profiles, setProfiles] = useState<ChildWordProfile[]>([]);
  const [topDifficult, setTopDifficult] = useState<ChildWordProfile[]>([]);
  const [dailyProgress, setDailyProgress] = useState<DailyWordProgress | null>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyWordProgress | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('needs-practice');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWordProfile, setSelectedWordProfile] = useState<ChildWordProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const childId = profile?.childId;
    const all = await getChildWordProfiles(language, childId);
    const top = await getTopDifficultWords(language, childId, 5);
    const daily = await getDailyWordProgress(language, childId);
    const weekly = await getWeeklyWordProgress(language, childId);

    setProfiles(all);
    setTopDifficult(top);
    setDailyProgress(daily);
    setWeeklyProgress(weekly);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('readbuddy_word_difficulty_updated', handleUpdate);
    return () => {
      window.removeEventListener('readbuddy_word_difficulty_updated', handleUpdate);
    };
  }, [language, profile?.childId]);

  const soundAnalysis = getSoundPatternAnalysis(profiles, language);

  // Filter & Search
  const filteredProfiles = profiles.filter((p) => {
    // Filter by Category
    if (activeFilter === 'needs-practice' && p.currentStatus !== 'needs-practice' && p.currentStatus !== 'insufficient-data') {
      return false;
    }
    if (activeFilter === 'improving' && p.currentStatus !== 'improving') {
      return false;
    }
    if (activeFilter === 'mastered' && p.currentStatus !== 'mastered') {
      return false;
    }
    if (activeFilter === 'declining' && p.currentStatus !== 'declining') {
      return false;
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return p.word.toLowerCase().includes(q) || (p.primarySound && p.primarySound.toLowerCase().includes(q));
    }
    return true;
  });

  const getStatusBadge = (p: ChildWordProfile) => {
    switch (p.currentStatus) {
      case 'mastered':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
            <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
            <span>{language === 'en' ? 'Mastered' : 'कंठस्थ'}</span>
          </span>
        );
      case 'improving':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
            <TrendingUp className="w-3 h-3 text-emerald-600" />
            <span>{language === 'en' ? 'Improving 📈' : 'सुधार हो रहा है'}</span>
          </span>
        );
      case 'declining':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-300">
            <TrendingDown className="w-3 h-3 text-rose-600" />
            <span>{language === 'en' ? 'Keep an Eye On' : 'ध्यान दें'}</span>
          </span>
        );
      case 'needs-practice':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-300">
            <RotateCcw className="w-3 h-3 text-rose-600" />
            <span>{language === 'en' ? 'Needs Practice' : 'अभ्यास आवश्यक'}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            <span>{language === 'en' ? 'Learning' : 'सीख रहे हैं'}</span>
          </span>
        );
    }
  };

  const getResultDot = (res: 'correct' | 'incorrect' | 'uncertain') => {
    if (res === 'correct') {
      return (
        <span
          className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-black border border-emerald-300"
          title="Correct"
        >
          ✓
        </span>
      );
    }
    if (res === 'incorrect') {
      return (
        <span
          className="w-4 h-4 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center text-[10px] font-black border border-rose-300"
          title="Incorrect"
        >
          ✕
        </span>
      );
    }
    return (
      <span
        className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-black border border-amber-300"
        title="Uncertain"
      >
        ?
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. Header & Sound Pattern Analysis Spotlight Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-5 text-white shadow-md space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-indigo-700/80">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-300" />
            <h3 className="text-sm font-extrabold text-white">
              {language === 'en'
                ? `${profile?.name || 'Child'}'s Word Difficulty Report`
                : `${profile?.name || 'बच्चे'} की शब्द कठिनाई रिपोर्ट`}
            </h3>
          </div>
          <span className="text-[10px] font-bold bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30">
            {profiles.length} {language === 'en' ? 'Words Tracked' : 'शब्द दर्ज'}
          </span>
        </div>

        {/* Pattern Spotlight Card */}
        {soundAnalysis.topProblemSound ? (
          <div className="bg-indigo-950/80 p-3.5 rounded-2xl border border-indigo-700/80 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {language === 'en' ? 'Identified Sound Pattern:' : 'पहचाना गया ध्वनि पैटर्न:'}
              </span>
              <span className="bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded-lg border border-amber-400/40 font-mono text-xs">
                /{soundAnalysis.topProblemSound}/
              </span>
            </div>

            <p className="text-xs text-indigo-100 leading-relaxed font-medium">
              {soundAnalysis.explanation}
            </p>

            <div className="pt-1 flex items-center justify-between text-[11px] text-indigo-200 border-t border-indigo-800/80">
              <span>
                <strong>Suggested Action:</strong> {soundAnalysis.suggestedFocus}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-indigo-950/60 p-3 rounded-2xl border border-indigo-800 text-xs text-indigo-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {language === 'en'
                ? 'No persistent sound pattern difficulties detected. All practiced words are on track!'
                : 'कोई लगातार ध्वनि कठिनाई नहीं मिली है। सभी अभ्यास सही चल रहे हैं!'}
            </span>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-[10px] text-indigo-300/80 italic text-center">
          "Practice insights are educational and are not a medical diagnosis."
        </p>
      </div>

      {/* 2. Today's & Weekly Word Progress Summary Cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Today's Progress */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              {language === 'en' ? "Today's Word Progress" : 'आज की शब्द प्रगति'}
            </span>
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-center pt-1">
            <div className="bg-slate-50 p-2 rounded-xl">
              <span className="block text-[9px] text-slate-500 font-bold uppercase">Practiced</span>
              <span className="text-sm font-black text-slate-900">
                {dailyProgress?.wordsPracticed || 0}
              </span>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl">
              <span className="block text-[9px] text-slate-500 font-bold uppercase">Correct</span>
              <span className="text-sm font-black text-emerald-600">
                {dailyProgress?.correctCount || 0}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-600 font-medium pt-1 space-y-1">
            {dailyProgress && dailyProgress.improvedToday.length > 0 && (
              <p className="text-emerald-700 flex items-center gap-1 font-bold">
                <span>📈 Improved today:</span>
                <span className="truncate">{dailyProgress.improvedToday.slice(0, 2).join(', ')}</span>
              </p>
            )}
            {dailyProgress && dailyProgress.needsAttentionWords.length > 0 && (
              <p className="text-amber-800 flex items-center gap-1 font-semibold">
                <span>🎯 Needs practice:</span>
                <span className="truncate">{dailyProgress.needsAttentionWords.slice(0, 2).join(', ')}</span>
              </p>
            )}
            {(!dailyProgress || dailyProgress.wordsPracticed === 0) && (
              <p className="text-slate-400 italic text-[10px]">
                {language === 'en' ? 'No words practiced today yet' : 'आज अभी तक कोई शब्द अभ्यास नहीं'}
              </p>
            )}
          </div>
        </div>

        {/* Weekly Progress */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              {language === 'en' ? 'Weekly Word Progress' : 'साप्ताहिक शब्द प्रगति'}
            </span>
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-center pt-1">
            <div className="bg-slate-50 p-2 rounded-xl">
              <span className="block text-[9px] text-slate-500 font-bold uppercase">Improved</span>
              <span className="text-sm font-black text-emerald-600">
                {weeklyProgress?.wordsImproved || 0}
              </span>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl">
              <span className="block text-[9px] text-slate-500 font-bold uppercase">Mastered</span>
              <span className="text-sm font-black text-amber-600">
                {weeklyProgress?.wordsMastered || 0}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-600 font-medium pt-1 space-y-1">
            <p className="text-slate-700">
              {language === 'en'
                ? `${weeklyProgress?.wordsPracticed || 0} unique words practiced this week.`
                : `इस सप्ताह ${weeklyProgress?.wordsPracticed || 0} विशिष्ट शब्दों का अभ्यास।`}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setActiveFilter('needs-practice')}
          className={`px-3 py-1.5 rounded-xl font-extrabold shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
            activeFilter === 'needs-practice'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>{language === 'en' ? 'Words I\'m Practicing' : 'अभ्यास योग्य शब्द'}</span>
          <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
            {profiles.filter((p) => p.currentStatus === 'needs-practice' || p.currentStatus === 'insufficient-data').length}
          </span>
        </button>

        <button
          onClick={() => setActiveFilter('improving')}
          className={`px-3 py-1.5 rounded-xl font-extrabold shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
            activeFilter === 'improving'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{language === 'en' ? 'Getting Better' : 'सुधर रहे शब्द'}</span>
          <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
            {profiles.filter((p) => p.currentStatus === 'improving').length}
          </span>
        </button>

        <button
          onClick={() => setActiveFilter('mastered')}
          className={`px-3 py-1.5 rounded-xl font-extrabold shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
            activeFilter === 'mastered'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          <span>{language === 'en' ? 'Mastered' : 'कंठस्थ'}</span>
          <span className="text-[10px] bg-black/15 px-1.5 py-0.2 rounded-full">
            {profiles.filter((p) => p.currentStatus === 'mastered').length}
          </span>
        </button>

        <button
          onClick={() => setActiveFilter('declining')}
          className={`px-3 py-1.5 rounded-xl font-extrabold shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
            activeFilter === 'declining'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{language === 'en' ? 'Keep an Eye On' : 'पुनरावलोकन'}</span>
          <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
            {profiles.filter((p) => p.currentStatus === 'declining').length}
          </span>
        </button>

        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-xl font-extrabold shrink-0 transition flex items-center gap-1.5 cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span>{language === 'en' ? 'All Words' : 'सभी शब्द'}</span>
          <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
            {profiles.length}
          </span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={language === 'en' ? 'Search word or sound (e.g. rabbit, /r/)...' : 'शब्द या ध्वनि खोजें...'}
          className="w-full pl-10 pr-4 py-2.5 bg-white rounded-2xl border border-slate-200 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* 4. Words List */}
      {filteredProfiles.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs text-center space-y-3">
          <div className="w-14 h-14 rounded-3xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              {language === 'en' ? 'No words in this category yet' : 'इस श्रेणी में अभी कोई शब्द नहीं है'}
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              {language === 'en'
                ? 'Start your first practice session to see your progress.'
                : 'अपनी प्रगति देखने के लिए अपना पहला अभ्यास सत्र शुरू करें।'}
            </p>
          </div>
          {onStartReading && (
            <button
              onClick={onStartReading}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'Start Reading Now' : 'पढ़ना शुरू करें'}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProfiles.map((p) => {
            return (
              <div
                key={p.id}
                className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-3 hover:border-indigo-200 transition"
              >
                {/* Word Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-slate-900 capitalize">
                      "{p.word}"
                    </span>
                    {p.primarySound && (
                      <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg border border-indigo-100">
                        /{p.primarySound}/
                      </span>
                    )}
                    {getStatusBadge(p)}
                  </div>

                  <button
                    onClick={() => speakWord(p.word, p.language)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 transition"
                    title="Listen"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Metrics & Recent Attempt Dots */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="block text-[9px] text-slate-400 font-bold uppercase">Accuracy</span>
                    <span className="text-xs font-black text-slate-900">{p.accuracy}%</span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="block text-[9px] text-slate-400 font-bold uppercase">Attempts</span>
                    <span className="text-xs font-black text-slate-900">
                      {p.totalAttempts} <span className="text-[10px] text-slate-400 font-medium">({p.retryCount} retries)</span>
                    </span>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="block text-[9px] text-slate-400 font-bold uppercase">Recent (Last 8)</span>
                    <span className="text-xs font-black text-emerald-600">{p.recentAccuracy}%</span>
                  </div>
                </div>

                {/* Visual Attempt Dot Sequence */}
                <div className="flex items-center justify-between text-[11px] bg-slate-50/70 px-3 py-2 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    {language === 'en' ? 'Recent Attempts:' : 'हाल के प्रयास:'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {p.recentAttempts.map((res, i) => (
                      <React.Fragment key={i}>
                        {getResultDot(res)}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Recommended Action */}
                <div className="text-xs text-slate-600 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="text-[11px] font-semibold truncate text-indigo-950">
                      {p.recommendedAction}
                    </span>
                  </div>

                  <button
                    onClick={() => setSelectedWordProfile(p)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shrink-0 shadow-xs active:scale-95 transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>{language === 'en' ? 'Practice' : 'अभ्यास'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Word Practice & History Modal */}
      {selectedWordProfile && (
        <WordDetailModal
          wordProfile={selectedWordProfile}
          language={language}
          childId={profile?.childId}
          onClose={() => setSelectedWordProfile(null)}
          onWordUpdated={loadData}
        />
      )}
    </div>
  );
};
