import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Target,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Star,
  Layers,
  Activity
} from 'lucide-react';
import { AppLanguage, ChildProfile, ChildPhonemeProfile } from '../types';
import { getChildPhonemeProfiles } from '../services/deepPronunciationEngine';
import { speakWord } from '../services/speech';

interface SoundProgressReportProps {
  language: AppLanguage;
  profile?: ChildProfile;
  onStartDrill?: () => void;
  onStartReading?: () => void;
}

export const SoundProgressReport: React.FC<SoundProgressReportProps> = ({
  language,
  profile,
  onStartDrill,
  onStartReading,
}) => {
  const [phonemeProfiles, setPhonemeProfiles] = useState<ChildPhonemeProfile[]>([]);
  const [selectedPhoneme, setSelectedPhoneme] = useState<ChildPhonemeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const list = await getChildPhonemeProfiles(language, profile?.childId);
    setPhonemeProfiles(list);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('readbuddy_phoneme_attempts_updated', handleUpdate);
    return () => {
      window.removeEventListener('readbuddy_phoneme_attempts_updated', handleUpdate);
    };
  }, [language, profile?.childId]);

  const strongSounds = phonemeProfiles.filter((p) => p.overallAccuracy >= 85);
  const practiceSounds = phonemeProfiles.filter((p) => p.overallAccuracy < 70);
  const improvingSounds = phonemeProfiles.filter((p) => p.trend === 'improving');

  const getTrendBadge = (trend: string) => {
    switch (trend) {
      case 'improving':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
            <TrendingUp className="w-3 h-3 text-emerald-600" />
            <span>{language === 'en' ? 'Improving 📈' : 'सुधार'}</span>
          </span>
        );
      case 'needs_attention':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-300">
            <RotateCcw className="w-3 h-3 text-rose-600" />
            <span>{language === 'en' ? 'Needs Practice' : 'अभ्यास आवश्यक'}</span>
          </span>
        );
      case 'mastered':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
            <Star className="w-3 h-3 text-amber-500 fill-amber-400" />
            <span>{language === 'en' ? 'Mastered' : 'कंठस्थ'}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            <span>{language === 'en' ? 'Stable' : 'स्थिर'}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Banner & Child Pronunciation Profile Summary (Requirement 41) */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-5 text-white shadow-md space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-indigo-700/80">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-300" />
            <div>
              <h3 className="text-sm font-extrabold text-white">
                {language === 'en'
                  ? `${profile?.name || 'Child'}'s Pronunciation Profile`
                  : `${profile?.name || 'बच्चे'} का उच्चारण प्रोफ़ाइल`}
              </h3>
              <span className="text-[10px] text-indigo-200">
                {language === 'en'
                  ? 'Evidence-based phoneme & positional accuracy analysis'
                  : 'ध्वनि एवं शब्दांश स्थिति आधारित शुद्धता विश्लेषण'}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/30">
            {phonemeProfiles.length} {language === 'en' ? 'Sounds Tracked' : 'ध्वनियाँ'}
          </span>
        </div>

        {/* 3 Summary Badges */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-indigo-950/70 p-2.5 rounded-2xl border border-indigo-800/80">
            <span className="block text-[9px] text-emerald-300 font-bold uppercase">Strong Sounds</span>
            <span className="text-sm font-black text-white">{strongSounds.length}</span>
            <span className="text-[9px] text-indigo-300 block truncate mt-0.5">
              {strongSounds.map((s) => s.ipaSymbol).join(' ') || 'None yet'}
            </span>
          </div>

          <div className="bg-indigo-950/70 p-2.5 rounded-2xl border border-indigo-800/80">
            <span className="block text-[9px] text-amber-300 font-bold uppercase">To Practice</span>
            <span className="text-sm font-black text-amber-300">{practiceSounds.length}</span>
            <span className="text-[9px] text-indigo-300 block truncate mt-0.5">
              {practiceSounds.map((s) => s.ipaSymbol).join(' ') || 'All clear'}
            </span>
          </div>

          <div className="bg-indigo-950/70 p-2.5 rounded-2xl border border-indigo-800/80">
            <span className="block text-[9px] text-cyan-300 font-bold uppercase">Improving</span>
            <span className="text-sm font-black text-cyan-300">{improvingSounds.length}</span>
            <span className="text-[9px] text-indigo-300 block truncate mt-0.5">
              {improvingSounds.map((s) => s.ipaSymbol).join(' ') || '0'}
            </span>
          </div>
        </div>

        <p className="text-[10px] text-indigo-300/80 italic text-center">
          "Practice insights are educational and are not a medical diagnosis."
        </p>
      </div>

      {/* 2. Phoneme Positional Accuracy Cards (Requirement 23 & 40) */}
      {phonemeProfiles.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs text-center space-y-3">
          <div className="w-14 h-14 rounded-3xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
            <Volume2 className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              {language === 'en' ? 'No pronunciation data yet.' : 'कोई उच्चारण डेटा अभी उपलब्ध नहीं है।'}
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
          {phonemeProfiles.map((p) => {
            return (
              <div
                key={p.id}
                className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3.5 hover:border-indigo-200 transition"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl font-black text-indigo-900 bg-indigo-50 px-3 py-1 rounded-2xl border border-indigo-100 font-mono">
                      {p.ipaSymbol}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900">
                          {p.overallAccuracy}% {language === 'en' ? 'Overall Clarity' : 'समग्र शुद्धता'}
                        </span>
                        {getTrendBadge(p.trend)}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {p.totalAttempts} {language === 'en' ? 'attempts across words' : 'कुल प्रयास'}
                      </span>
                    </div>
                  </div>

                  {onStartDrill && (
                    <button
                      onClick={onStartDrill}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs active:scale-95 transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>{language === 'en' ? 'Practice' : 'अभ्यास'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Positional Breakdown Bar (Initial, Medial, Final) - Requirement 23 & 40 */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/70 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    {language === 'en' ? 'Positional Clarity Breakdown:' : 'स्थिति अनुसार शुद्धता (आरंभिक/मध्य/अंतिम):'}
                  </span>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    {/* Initial Position */}
                    <div className="bg-white p-2 rounded-xl border border-slate-100 space-y-1">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">
                        {language === 'en' ? 'Initial (Start)' : 'आरंभिक'}
                      </span>
                      <span
                        className={`text-sm font-black ${
                          p.initialAccuracy >= 80
                            ? 'text-emerald-600'
                            : p.initialAccuracy >= 60
                            ? 'text-indigo-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {p.initialAttempts > 0 ? `${p.initialAccuracy}%` : '—'}
                      </span>
                      <span className="block text-[8px] text-slate-400">
                        {p.initialAttempts} tries
                      </span>
                    </div>

                    {/* Medial Position */}
                    <div className="bg-white p-2 rounded-xl border border-slate-100 space-y-1">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">
                        {language === 'en' ? 'Medial (Middle)' : 'मध्य'}
                      </span>
                      <span
                        className={`text-sm font-black ${
                          p.medialAccuracy >= 80
                            ? 'text-emerald-600'
                            : p.medialAccuracy >= 60
                            ? 'text-indigo-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {p.medialAttempts > 0 ? `${p.medialAccuracy}%` : '—'}
                      </span>
                      <span className="block text-[8px] text-slate-400">
                        {p.medialAttempts} tries
                      </span>
                    </div>

                    {/* Final Position */}
                    <div className="bg-white p-2 rounded-xl border border-slate-100 space-y-1">
                      <span className="block text-[9px] text-slate-400 font-bold uppercase">
                        {language === 'en' ? 'Final (End)' : 'अंतिम'}
                      </span>
                      <span
                        className={`text-sm font-black ${
                          p.finalAccuracy >= 80
                            ? 'text-emerald-600'
                            : p.finalAccuracy >= 60
                            ? 'text-indigo-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {p.finalAttempts > 0 ? `${p.finalAccuracy}%` : '—'}
                      </span>
                      <span className="block text-[8px] text-slate-400">
                        {p.finalAttempts} tries
                      </span>
                    </div>
                  </div>
                </div>

                {/* Affected Words & Observed Substitutions */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 pt-1">
                  {p.affectedWords.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-slate-500">
                        {language === 'en' ? 'Words:' : 'शब्द:'}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {p.affectedWords.map((w, idx) => (
                          <span key={idx} className="bg-indigo-50 text-indigo-800 px-1.5 py-0.5 rounded font-bold text-[10px]">
                            "{w}"
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {p.lastObservedSubstitutions.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      <span>Pattern:</span>
                      <span className="font-mono font-bold">{p.lastObservedSubstitutions.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
