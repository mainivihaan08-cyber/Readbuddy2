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
  Clock,
  Star,
  Info,
  Activity
} from 'lucide-react';
import {
  AppLanguage,
  PhonicsSound,
  ChildPhonicsProfile,
  PhonicsAttemptRecord
} from '../types';
import {
  getPhonicsAttemptsForChild,
  getChildPhonicsProfiles,
  getPhonicsDifficultWordConnection
} from '../services/phonicsEngine';
import { speakWord } from '../services/speech';
import { PhonicsPracticeModal } from './PhonicsPracticeModal';

interface PhonicsSoundDetailModalProps {
  sound: PhonicsSound;
  language: AppLanguage;
  childId?: string;
  onClose: () => void;
  onProfileUpdated?: () => void;
}

export const PhonicsSoundDetailModal: React.FC<PhonicsSoundDetailModalProps> = ({
  sound,
  language,
  childId,
  onClose,
  onProfileUpdated,
}) => {
  const [profile, setProfile] = useState<ChildPhonicsProfile | null>(null);
  const [attempts, setAttempts] = useState<PhonicsAttemptRecord[]>([]);
  const [difficultWordConnection, setDifficultWordConnection] = useState<{
    difficultWords: string[];
    explanation: string;
    hasPatternEvidence: boolean;
  } | null>(null);
  const [showPracticeModal, setShowPracticeModal] = useState(false);
  const [practiceMode, setPracticeMode] = useState<'sound_only' | 'stages' | 'position' | 'contrast'>('sound_only');
  const [practicePosition, setPracticePosition] = useState<'initial' | 'medial' | 'final'>('initial');

  const loadData = async () => {
    const allProfiles = await getChildPhonicsProfiles(language, childId);
    const soundProfile = allProfiles.find((p) => p.soundId === sound.soundId) || null;
    setProfile(soundProfile);

    const attList = await getPhonicsAttemptsForChild(childId, sound.soundId);
    setAttempts(attList);

    const conn = await getPhonicsDifficultWordConnection(sound.soundId, language, childId);
    setDifficultWordConnection(conn);
  };

  useEffect(() => {
    loadData();
  }, [sound, language, childId]);

  const handlePlayAudio = (slow = false) => {
    speakWord(sound.phonicsLabel, language, slow ? 'slow' : 'normal');
  };

  const getStatusBadge = (p: ChildPhonicsProfile | null) => {
    if (!p || p.validAttempts === 0) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
          {language === 'en' ? 'Not Started' : 'प्रारंभ नहीं'}
        </span>
      );
    }
    if (p.status === 'mastered') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
          <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
          <span>{language === 'en' ? 'Mastered ⭐' : 'कंठस्थ ⭐'}</span>
        </span>
      );
    }
    if (p.status === 'needs_review') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-300">
          <RotateCcw className="w-3 h-3 text-purple-600" />
          <span>{language === 'en' ? 'Needs Review' : 'पुनरावृत्ति'}</span>
        </span>
      );
    }
    if (p.status === 'improving') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
          <TrendingUp className="w-3 h-3 text-emerald-600" />
          <span>{language === 'en' ? 'Improving 📈' : 'सुधार हो रहा है'}</span>
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
        {language === 'en' ? 'Practicing' : 'अभ्यास जारी'}
      </span>
    );
  };

  const progressionLevels = [
    { level: 1, title: 'Sound Recognition', desc: 'Hear and distinguish the sound' },
    { level: 2, title: 'Sound Production', desc: 'Produce isolated sound clearly' },
    { level: 3, title: 'Sound + Simple Word', desc: 'Short baseline single-syllable word' },
    { level: 4, title: 'Initial Position', desc: 'Sound at start (e.g. red, rabbit)' },
    { level: 5, title: 'Medial Position', desc: 'Sound in middle (e.g. carrot)' },
    { level: 6, title: 'Final Position', desc: 'Sound at end (e.g. star, car)' },
    { level: 7, title: 'Phrases', desc: '2-3 word smooth combination' },
    { level: 8, title: 'Sentences', desc: 'Full sentence flow and rhythm' },
    { level: 9, title: 'Connected Reading', desc: 'Fluency in general stories' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-black text-2xl shadow-sm">
              {sound.phonicsLabel}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">{sound.displayName}</h2>
                <span className="text-xs font-mono font-bold bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded-md">
                  {sound.ipaSymbol}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {getStatusBadge(profile)}
                <span className="text-[10px] text-slate-400 capitalize font-medium">
                  {sound.category} · {sound.difficultyLevel}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audio Reference Speaker & Tip */}
        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePlayAudio(false)}
                className="px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-indigo-900 font-bold text-xs flex items-center gap-1.5 shadow-2xs hover:bg-indigo-50 transition"
              >
                <Volume2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>{language === 'en' ? 'Listen Sound' : 'ध्वनि सुनें'}</span>
              </button>
              <button
                onClick={() => handlePlayAudio(true)}
                className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 font-semibold text-xs flex items-center gap-1 shadow-2xs hover:bg-slate-50 transition"
              >
                <span>{language === 'en' ? 'Slow' : 'धीमा'}</span>
              </button>
            </div>

            <span className="text-[11px] font-mono text-indigo-700 font-bold">
              Locale: {sound.locale}
            </span>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed pt-1">
            💡 {language === 'hi' && sound.articulatoryTipHi ? sound.articulatoryTipHi : sound.articulatoryTip}
          </p>
        </div>

        {/* Accuracy & Position Stats (Requirements 59 & 64) */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Overall</span>
            <span className="text-lg font-black text-slate-900">
              {profile ? `${profile.overallAccuracy}%` : '0%'}
            </span>
            <span className="text-[10px] text-slate-500 block">
              {profile?.totalAttempts || 0} attempts
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Recent (Last 5)</span>
            <span className="text-lg font-black text-indigo-700">
              {profile ? `${profile.recentAccuracy}%` : '0%'}
            </span>
            <span className="text-[10px] text-slate-500 block">
              {profile?.correctAttempts || 0} correct
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Sound-Only</span>
            <span className="text-lg font-black text-emerald-700">
              {profile ? `${profile.soundOnlyAccuracy}%` : '0%'}
            </span>
            <span className="text-[10px] text-slate-500 block">
              {profile?.soundOnlyAttempts || 0} tries
            </span>
          </div>
        </div>

        {/* Position Breakdown (Initial, Medial, Final) */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 text-xs font-bold text-slate-800">
            <span>{language === 'en' ? 'Position Breakdown' : 'स्थान अनुसार सटीकता'}</span>
            <span className="text-[10px] text-slate-400">Targeting {sound.ipaSymbol}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {/* INITIAL */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-500 block">Initial</span>
              <span className="text-base font-extrabold text-slate-900">
                {profile ? `${profile.initialAccuracy}%` : '0%'}
              </span>
              <span className="text-[9px] text-slate-400 block truncate">
                {sound.positionExamples.initial.slice(0, 2).join(', ')}
              </span>
            </div>

            {/* MEDIAL */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-500 block">Medial</span>
              <span className="text-base font-extrabold text-slate-900">
                {profile ? `${profile.medialAccuracy}%` : '0%'}
              </span>
              <span className="text-[9px] text-slate-400 block truncate">
                {sound.positionExamples.medial.slice(0, 2).join(', ')}
              </span>
            </div>

            {/* FINAL */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-500 block">Final</span>
              <span className="text-base font-extrabold text-slate-900">
                {profile ? `${profile.finalAccuracy}%` : '0%'}
              </span>
              <span className="text-[9px] text-slate-400 block truncate">
                {sound.positionExamples.final.slice(0, 2).join(', ')}
              </span>
            </div>
          </div>
        </div>

        {/* Connected Reading Words (Requirements 65 & 66) */}
        {difficultWordConnection && (
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <BookOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{language === 'en' ? 'Reading Connection & Difficult Words' : 'वाचन संबंध एवं शब्द'}</span>
            </div>

            <p className="text-xs text-amber-950 leading-relaxed">
              {difficultWordConnection.explanation}
            </p>

            {difficultWordConnection.difficultWords.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {difficultWordConnection.difficultWords.map((w, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-white border border-amber-300 text-amber-900 font-bold text-xs shadow-2xs"
                  >
                    "{w}"
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 9-Level Progression Ladder (Requirement 58) */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800">
              {language === 'en' ? 'Phonics Progression Ladder' : 'ध्वनि प्रगति सीढ़ी'}
            </span>
            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
              Level {profile?.currentProgressionLevel || 1} of 9
            </span>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {progressionLevels.map((lvl) => {
              const currentLvl = profile?.currentProgressionLevel || 1;
              const isUnlocked = currentLvl >= lvl.level;
              const isCurrent = currentLvl === lvl.level;

              return (
                <div
                  key={lvl.level}
                  className={`p-2 rounded-xl border flex items-center justify-between text-xs transition ${
                    isCurrent
                      ? 'bg-indigo-50 border-indigo-300 font-bold text-indigo-900'
                      : isUnlocked
                      ? 'bg-slate-50 border-slate-200 text-slate-700'
                      : 'bg-slate-50/50 border-slate-100 text-slate-400 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                      isCurrent
                        ? 'bg-indigo-600 text-white'
                        : isUnlocked
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}>
                      {isUnlocked && !isCurrent ? '✓' : lvl.level}
                    </span>
                    <div>
                      <span className="block">{lvl.title}</span>
                      <span className="text-[10px] font-normal opacity-80">{lvl.desc}</span>
                    </div>
                  </div>

                  {isCurrent && (
                    <span className="text-[9px] uppercase font-bold bg-indigo-200 text-indigo-900 px-1.5 py-0.5 rounded">
                      Current
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Practice Launch CTA Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            onClick={() => {
              setPracticeMode('sound_only');
              setShowPracticeModal(true);
            }}
            className="py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 transition cursor-pointer"
          >
            <Mic className="w-4 h-4" />
            <span>{language === 'en' ? 'Practice Sound Alone' : 'केवल ध्वनि अभ्यास'}</span>
          </button>

          <button
            onClick={() => {
              setPracticeMode('stages');
              setShowPracticeModal(true);
            }}
            className="py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 transition cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            <span>{language === 'en' ? '5-Stage Progression' : '५-चरण अभ्यास'}</span>
          </button>
        </div>

        {/* Contrast Practice Launch if available */}
        {sound.contrastingPairs && sound.contrastingPairs.length > 0 && (
          <button
            onClick={() => {
              setPracticeMode('contrast');
              setShowPracticeModal(true);
            }}
            className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-600" />
            <span>
              {language === 'en'
                ? `Contrast Practice (${sound.contrastingPairs[0].target} vs ${sound.contrastingPairs[0].contrast})`
                : `तुलनात्मक अभ्यास (${sound.contrastingPairs[0].target} बनाम ${sound.contrastingPairs[0].contrast})`}
            </span>
          </button>
        )}
      </div>

      {/* Interactive Practice Modal */}
      {showPracticeModal && (
        <PhonicsPracticeModal
          sound={sound}
          language={language}
          childId={childId}
          initialMode={practiceMode}
          initialPosition={practicePosition}
          onClose={() => {
            setShowPracticeModal(false);
            loadData();
            onProfileUpdated?.();
          }}
          onPracticeComplete={() => {
            loadData();
            onProfileUpdated?.();
          }}
        />
      )}
    </div>
  );
};
