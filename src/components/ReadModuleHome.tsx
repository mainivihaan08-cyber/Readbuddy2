import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Sparkles,
  Lock,
  Unlock,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  History,
  Activity,
  Award,
  Layers,
  BarChart3,
  KeyRound,
  X,
  Play
} from 'lucide-react';
import { AppLanguage, ChildProfile } from '../types';
import {
  READ_LEVELS_CONFIG,
  ReadLevelConfig,
  LEVEL_1_SINGLE_WORDS
} from '../data/readModuleData';
import {
  getReadOverallDashboard,
  toggleParentLevelUnlock,
  ReadOverallDashboard,
  ReadSessionHistoryItem
} from '../services/readProgressEngine';
import {
  generateDailyAdaptivePracticeSet,
  simulateTestChildPerformance,
  DailyAdaptivePracticeSet
} from '../services/aiAdaptiveReadingEngine';
import { ReadSessionView } from './ReadSessionView';

interface ReadModuleHomeProps {
  language: AppLanguage;
  profile?: ChildProfile;
  onOpenParentPortal?: () => void;
}

export const ReadModuleHome: React.FC<ReadModuleHomeProps> = ({
  language,
  profile,
  onOpenParentPortal,
}) => {
  const [dashboard, setDashboard] = useState<ReadOverallDashboard>(getReadOverallDashboard);
  const [activeSessionLevel, setActiveSessionLevel] = useState<1 | 2 | 3 | 4 | null>(null);
  const [isAdaptivePracticeActive, setIsAdaptivePracticeActive] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showParentOverrideModal, setShowParentOverrideModal] = useState(false);
  const [simulationResult, setSimulationResult] = useState<DailyAdaptivePracticeSet | null>(null);

  const dailyAdaptiveSet = generateDailyAdaptivePracticeSet(1, 10, profile?.childId);

  const refreshData = () => {
    setDashboard(getReadOverallDashboard());
  };

  useEffect(() => {
    refreshData();
    const handleUpdate = () => refreshData();
    window.addEventListener('readbuddy_reading_progress_updated', handleUpdate);
    return () => {
      window.removeEventListener('readbuddy_reading_progress_updated', handleUpdate);
    };
  }, []);

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-28 space-y-4">
      {/* 1. Main READ Screen Hero Header */}
      <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-800 rounded-3xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-200 uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5 text-amber-300" />
            <span>{language === 'en' ? 'Structured Reading Module' : 'संरचित वाचन मंच'}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowHistoryModal(true)}
              className="px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-xs font-bold backdrop-blur-xs flex items-center gap-1 transition cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-amber-300" />
              <span>{language === 'en' ? 'History' : 'इतिहास'}</span>
            </button>

            <button
              onClick={() => setShowParentOverrideModal(true)}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
              title="Parent Level Unlock Settings"
            >
              <KeyRound className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-black tracking-tight">READ</h1>
          <p className="text-xs text-indigo-100 font-medium mt-0.5">
            {language === 'en'
              ? 'Build reading skills step by step'
              : 'कदम दर कदम वाचन कौशल का विकास'}
          </p>
        </div>

        {/* Quick Read Progress Summary Card */}
        <div className="pt-3 mt-3 border-t border-white/15 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-white/10 rounded-2xl p-2.5">
            <span className="text-[10px] text-indigo-200 block uppercase">Practiced</span>
            <span className="font-extrabold text-white text-sm font-mono">
              {dashboard.totalWordsPracticed}
            </span>
          </div>
          <div className="bg-white/10 rounded-2xl p-2.5">
            <span className="text-[10px] text-indigo-200 block uppercase">Mastered ⭐</span>
            <span className="font-extrabold text-amber-300 text-sm font-mono">
              {dashboard.totalWordsMastered}
            </span>
          </div>
          <div className="bg-white/10 rounded-2xl p-2.5">
            <span className="text-[10px] text-indigo-200 block uppercase">Accuracy</span>
            <span className="font-extrabold text-emerald-300 text-sm font-mono">
              {dashboard.overallAccuracy}%
            </span>
          </div>
        </div>
      </div>

      {/* 2. AI Personalized Daily Reading Set Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white shadow-md space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
            <Sparkles className="w-4 h-4" />
            <span>{language === 'en' ? "Today's Personalized Reading" : 'आज का व्यक्तिगत वाचन सेट'}</span>
          </div>
          <span className="text-[10px] font-mono font-bold bg-white/15 px-2 py-0.5 rounded-full text-indigo-200">
            {dailyAdaptiveSet.totalItemsCount} Words Pool
          </span>
        </div>

        <div className="space-y-1">
          <h3 className="text-lg font-black tracking-tight">
            {language === 'en' ? 'AI Adaptive Reading Engine' : 'एआई अनुकूलित वाचन इंजन'}
          </h3>
          <p className="text-xs text-indigo-100 font-medium leading-relaxed">
            💡 {language === 'en' ? dailyAdaptiveSet.detectedLearningFocusEn : dailyAdaptiveSet.detectedLearningFocusHi}
          </p>
        </div>

        {/* Set Composition Pills */}
        <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-bold">
          {dailyAdaptiveSet.weakCount > 0 && (
            <span className="bg-rose-500/30 text-rose-200 px-2.5 py-1 rounded-xl border border-rose-400/30 flex items-center gap-1">
              <span>🔴</span> {dailyAdaptiveSet.weakCount} Weak
            </span>
          )}
          <span className="bg-amber-500/30 text-amber-200 px-2.5 py-1 rounded-xl border border-amber-400/30 flex items-center gap-1">
            <span>🟡</span> {dailyAdaptiveSet.reviewCount} Review
          </span>
          <span className="bg-cyan-500/30 text-cyan-200 px-2.5 py-1 rounded-xl border border-cyan-400/30 flex items-center gap-1">
            <span>🔵</span> {dailyAdaptiveSet.newCount} New
          </span>
          {dailyAdaptiveSet.masteredCount > 0 && (
            <span className="bg-emerald-500/30 text-emerald-200 px-2.5 py-1 rounded-xl border border-emerald-400/30 flex items-center gap-1">
              <span>🟢</span> {dailyAdaptiveSet.masteredCount} Mastered
            </span>
          )}
        </div>

        <button
          onClick={() => {
            setIsAdaptivePracticeActive(true);
            setActiveSessionLevel(1);
          }}
          className="w-full py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black text-xs rounded-2xl shadow-md active:scale-98 transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-slate-950" />
          <span>{language === 'en' ? "Start Today's Personalized Session ➔" : 'आज का वाचन अभ्यास शुरू करें ➔'}</span>
        </button>
      </div>

      {/* 3. Four Main Level Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>{language === 'en' ? 'Reading Progression Ladder' : 'वाचन सोपान (४ मुख्य स्तर)'}</span>
          </h2>
          <span className="text-[11px] font-bold text-slate-500">
            {language === 'en' ? 'Single words ➔ Stories' : 'शब्द ➔ कहानियाँ'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {READ_LEVELS_CONFIG.map((lvl) => {
            const progress = dashboard.levels[lvl.levelNumber];
            const isUnlocked = progress.isUnlocked;

            return (
              <div
                key={lvl.levelNumber}
                onClick={() => {
                  if (isUnlocked) {
                    setIsAdaptivePracticeActive(false);
                    setActiveSessionLevel(lvl.levelNumber);
                  }
                }}
                className={`p-5 rounded-3xl border transition flex flex-col justify-between space-y-3 relative overflow-hidden ${
                  isUnlocked
                    ? 'bg-white border-slate-200/90 shadow-xs hover:border-indigo-300 hover:shadow-md cursor-pointer group'
                    : 'bg-slate-50 border-slate-200/60 opacity-80 cursor-not-allowed'
                }`}
              >
                {/* Card Top Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black shadow-xs shrink-0 ${
                        isUnlocked
                          ? `bg-gradient-to-br ${lvl.gradient} text-white group-hover:scale-105 transition`
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {lvl.icon}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isUnlocked
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          LEVEL {lvl.levelNumber}
                        </span>

                        {isUnlocked ? (
                          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Available</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-0.5">
                            <Lock className="w-3 h-3" />
                            <span>Locked</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-extrabold text-slate-900 mt-0.5 group-hover:text-indigo-600 transition">
                        {language === 'en' ? lvl.name : lvl.nameHi}
                      </h3>
                    </div>
                  </div>

                  {isUnlocked && (
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition shrink-0">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {language === 'en' ? lvl.description : lvl.descriptionHi}
                </p>

                {/* Progress Bar & Stats */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span>
                      {language === 'en' ? 'Mastered' : 'कंठस्थ'}:{' '}
                      <strong className="text-slate-800">
                        {progress.masteredCount} / {progress.totalAvailable}
                      </strong>
                    </span>
                    <span>
                      {language === 'en' ? 'Accuracy' : 'सटीकता'}:{' '}
                      <strong className="text-indigo-600 font-mono">
                        {progress.accuracyPercent}%
                      </strong>
                    </span>
                  </div>

                  {/* Visual Progress Track */}
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((progress.masteredCount / Math.max(1, progress.totalAvailable)) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Active Reading Session View Modal */}
      {activeSessionLevel && (
        <ReadSessionView
          language={language}
          levelNumber={activeSessionLevel}
          customWordList={isAdaptivePracticeActive ? dashboard.adaptivePracticeQueue : undefined}
          onClose={() => {
            setActiveSessionLevel(null);
            setIsAdaptivePracticeActive(false);
            refreshData();
          }}
          onSessionComplete={() => {
            setActiveSessionLevel(null);
            setIsAdaptivePracticeActive(false);
            refreshData();
          }}
        />
      )}

      {/* 5. Reading History Log Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-extrabold">
                  {language === 'en' ? 'Reading Session History' : 'वाचन सत्र इतिहास'}
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              {dashboard.recentSessions.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  {language === 'en'
                    ? 'No reading sessions completed yet. Start Level 1 practice!'
                    : 'कोई सत्र अभी दर्ज नहीं है। लेवल १ शुरू करें!'}
                </div>
              ) : (
                dashboard.recentSessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-indigo-900 font-extrabold">{sess.levelName}</span>
                      <span className="text-slate-400 text-[10px]">{sess.dateFormatted}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span>Items Practiced: <strong>{sess.itemsAttempted}</strong></span>
                      <span>Mastered: <strong className="text-emerald-700">{sess.itemsMastered}</strong></span>
                      <span className="font-mono font-black text-indigo-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {sess.accuracyPercent}%
                      </span>
                    </div>

                    {sess.audioRetryCount && sess.audioRetryCount > 0 ? (
                      <div className="text-[10px] text-amber-800 bg-amber-50 p-1.5 rounded-lg border border-amber-200 font-medium">
                        💡 {language === 'en'
                          ? `${sess.audioRetryCount} practice attempt(s) repeated due to background noise (not counted as reading mistakes).`
                          : `${sess.audioRetryCount} अभ्यास प्रयास पर्यावरणीय शोर के कारण दोहराए गए (त्रुटि नहीं माने गए)।`}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Parent Level Manual Unlock Override Modal */}
      {showParentOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl border border-slate-100 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  {language === 'en' ? 'Parent Level Unlock Override' : 'अभिभावक स्तर अनलॉक नियंत्रण'}
                </h3>
              </div>
              <button
                onClick={() => setShowParentOverrideModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {language === 'en'
                ? 'Parents and teachers can manually unlock any reading level below so the child is never blocked.'
                : 'माता-पिता या शिक्षक आवश्यकतानुसार किसी भी स्तर को अनलॉक कर सकते हैं।'}
            </p>

            <div className="space-y-2">
              {([2, 3, 4] as const).map((lvlNum) => {
                const isUnlocked = dashboard.levels[lvlNum].isUnlocked;
                return (
                  <div
                    key={lvlNum}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-bold"
                  >
                    <span>Level {lvlNum}: {READ_LEVELS_CONFIG[lvlNum - 1].name}</span>
                    <button
                      onClick={() => {
                        toggleParentLevelUnlock(lvlNum, !isUnlocked);
                        refreshData();
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-black transition ${
                        isUnlocked
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-indigo-600 text-white'
                      }`}
                    >
                      {isUnlocked ? 'Unlocked ✓' : 'Unlock Now'}
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowParentOverrideModal(false)}
              className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
