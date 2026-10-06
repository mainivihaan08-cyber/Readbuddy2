import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Mic,
  Sparkles,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Star,
  CheckCircle2,
  RotateCcw,
  BookOpen,
  ArrowRight,
  Layers,
  Activity,
  Award,
  Info,
  ChevronRight,
  Smile
} from 'lucide-react';
import {
  AppLanguage,
  ChildProfile,
  PhonicsSound,
  ChildPhonicsProfile,
  PhonicsDashboardSummary
} from '../types';
import { getPhonicsSounds, getPhonicsSoundById } from '../data/phonicsLibrary';
import {
  getChildPhonicsProfiles,
  getPhonicsDashboardSummary
} from '../services/phonicsEngine';
import { speakWord } from '../services/speech';
import { PhonicsSoundDetailModal } from './PhonicsSoundDetailModal';
import { PhonicsPracticeModal } from './PhonicsPracticeModal';
import { PhonicsCurriculumHub } from './PhonicsCurriculumHub';

interface PhonicsSoundsViewProps {
  language: AppLanguage;
  profile?: ChildProfile;
  onStartReading?: () => void;
  onProfileUpdated?: () => void;
}

type FilterTab = 'all' | 'vowels' | 'consonants' | 'practicing' | 'mastered' | 'review';
type PhonicsViewMode = 'curriculum' | 'cards';

export const PhonicsSoundsView: React.FC<PhonicsSoundsViewProps> = ({
  language,
  profile,
  onStartReading,
  onProfileUpdated,
}) => {
  const [viewMode, setViewMode] = useState<PhonicsViewMode>('curriculum');
  const [sounds, setSounds] = useState<PhonicsSound[]>([]);
  const [profiles, setProfiles] = useState<ChildPhonicsProfile[]>([]);
  const [summary, setSummary] = useState<PhonicsDashboardSummary | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSound, setSelectedSound] = useState<PhonicsSound | null>(null);
  const [practiceSound, setPracticeSound] = useState<PhonicsSound | null>(null);
  const [showChildReportModal, setShowChildReportModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const childId = profile?.childId;
    const soundList = getPhonicsSounds(language);
    const profList = await getChildPhonicsProfiles(language, childId);
    const sum = await getPhonicsDashboardSummary(language, childId);

    setSounds(soundList);
    setProfiles(profList);
    setSummary(sum);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();

    const handlePhonicsUpdate = () => {
      loadData();
    };

    window.addEventListener('readbuddy_phonics_updated', handlePhonicsUpdate);
    return () => {
      window.removeEventListener('readbuddy_phonics_updated', handlePhonicsUpdate);
    };
  }, [language, profile?.childId]);

  // Quick Sound Audio Play
  const handlePlaySoundAudio = (e: React.MouseEvent, sound: PhonicsSound) => {
    e.stopPropagation();
    speakWord(sound.phonicsLabel, language, 'normal');
  };

  // Filter & Search
  const filteredSounds = sounds.filter((s) => {
    const prof = profiles.find((p) => p.soundId === s.soundId);

    if (activeFilter === 'vowels' && s.category !== 'vowel' && s.category !== 'swar') return false;
    if (activeFilter === 'consonants' && s.category !== 'consonant' && s.category !== 'vyanjan') return false;
    if (activeFilter === 'practicing' && (!prof || prof.validAttempts === 0 || prof.status === 'mastered')) return false;
    if (activeFilter === 'mastered' && (!prof || prof.status !== 'mastered')) return false;
    if (activeFilter === 'review' && (!prof || prof.status !== 'needs_review')) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchLabel = s.phonicsLabel.toLowerCase().includes(q);
      const matchName = s.displayName.toLowerCase().includes(q);
      const matchIpa = s.ipaSymbol.toLowerCase().includes(q);
      const matchWords = s.exampleWords.some((w) => w.toLowerCase().includes(q));
      return matchLabel || matchName || matchIpa || matchWords;
    }

    return true;
  });

  const getStatusBadge = (prof?: ChildPhonicsProfile) => {
    if (!prof || prof.validAttempts === 0) {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
          {language === 'en' ? 'Not Started' : 'नया'}
        </span>
      );
    }
    if (prof.status === 'mastered') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
          <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-400" />
          <span>{language === 'en' ? 'Mastered ⭐' : 'कंठस्थ'}</span>
        </span>
      );
    }
    if (prof.status === 'needs_review') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-300">
          <RotateCcw className="w-2.5 h-2.5 text-purple-600" />
          <span>{language === 'en' ? 'Review' : 'दोहराएं'}</span>
        </span>
      );
    }
    if (prof.status === 'improving') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
          <TrendingUp className="w-2.5 h-2.5 text-emerald-600" />
          <span>{language === 'en' ? 'Improving' : 'सुधार'}</span>
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200">
        {language === 'en' ? 'Practicing' : 'अभ्यास'}
      </span>
    );
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-28 space-y-4">
      {/* Top Mode Segmented Switch */}
      <div className="p-1 bg-slate-200/80 rounded-2xl flex items-center gap-1 shadow-inner">
        <button
          onClick={() => setViewMode('curriculum')}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            viewMode === 'curriculum'
              ? 'bg-white text-indigo-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>{language === 'en' ? '10-Level Curriculum' : '१०-स्तरीय पाठ्यक्रम'}</span>
        </button>

        <button
          onClick={() => setViewMode('cards')}
          className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
            viewMode === 'cards'
              ? 'bg-white text-indigo-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-indigo-600" />
          <span>{language === 'en' ? 'Sound Cards Library' : 'ध्वनि लाइब्रेरी'}</span>
        </button>
      </div>

      {viewMode === 'curriculum' ? (
        <PhonicsCurriculumHub
          language={language}
          profile={profile}
          onStartReading={onStartReading}
          onProfileUpdated={() => {
            loadData();
            onProfileUpdated?.();
          }}
        />
      ) : (
        <>
          {/* Header Banner */}
          <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-800 rounded-3xl p-5 text-white shadow-md space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-200 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{language === 'en' ? 'Dedicated Phonics Module' : 'ध्वनि उच्चारण मंच'}</span>
              </div>

              <button
                onClick={() => setShowChildReportModal(true)}
                className="px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-xs font-bold backdrop-blur-xs flex items-center gap-1 transition"
              >
                <Smile className="w-3.5 h-3.5 text-amber-300" />
                <span>{language === 'en' ? 'My Sound Star' : 'मेरा ध्वनि कार्ड'}</span>
              </button>
            </div>

            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                {language === 'en' ? 'Phonics Sounds' : 'ध्वनि अभ्यास'}
              </h1>
              <p className="text-xs text-indigo-100 font-medium mt-0.5">
                {language === 'en'
                  ? 'Master individual sounds, position clarity, and speech flow.'
                  : 'व्यक्तिगत ध्वनियों, स्थान शुद्धता एवं स्पष्ट उच्चारण का अभ्यास करें।'}
              </p>
            </div>

            {/* Quick summary strip */}
            <div className="pt-2 border-t border-white/15 flex items-center justify-between text-xs font-bold text-indigo-100">
              <span>{sounds.length} {language === 'en' ? 'Library Sounds' : 'कुल ध्वनियाँ'}</span>
              <span className="text-amber-300">
                {summary?.masteredSounds.length || 0} {language === 'en' ? 'Mastered ⭐' : 'कंठस्थ ⭐'}
              </span>
            </div>
          </div>

      {/* MY PHONICS PROGRESS DASHBOARD (Requirement 63) */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
            <Activity className="w-4 h-4 text-indigo-600" />
            <span>{language === 'en' ? 'My Phonics Progress' : 'मेरी ध्वनि प्रगति'}</span>
          </div>
          <span className="text-[10px] font-bold text-slate-500 font-mono">
            {summary?.totalPracticedSoundsCount || 0} Active
          </span>
        </div>

        {summary && summary.totalPracticedSoundsCount === 0 ? (
          <div className="py-4 text-center space-y-1">
            <p className="text-xs font-bold text-slate-700">
              {language === 'en' ? 'No phonics practice data yet' : 'कोई ध्वनि अभ्यास डेटा अभी नहीं है'}
            </p>
            <p className="text-[11px] text-slate-500">
              {language === 'en'
                ? 'Select any sound card below to start your first acoustic practice!'
                : 'पहला अभ्यास शुरू करने के लिए नीचे दिए गए किसी भी कार्ड को चुनें!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Strong Sounds */}
            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">Strong Sounds</span>
              <div className="flex items-center gap-1 flex-wrap">
                {summary?.strongSounds.slice(0, 4).map((p) => (
                  <span key={p.id} className="text-xs font-black text-emerald-900 bg-white px-1.5 py-0.5 rounded shadow-2xs">
                    ✓ {p.ipaSymbol}
                  </span>
                ))}
                {summary && summary.strongSounds.length === 0 && (
                  <span className="text-[11px] text-emerald-700 italic">Starting up...</span>
                )}
              </div>
            </div>

            {/* Practicing Sounds */}
            <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-1">
              <span className="text-[10px] font-bold text-indigo-800 uppercase block">Practicing</span>
              <div className="flex items-center gap-1 flex-wrap">
                {summary?.practicingSounds.slice(0, 4).map((p) => (
                  <span key={p.id} className="text-xs font-bold text-indigo-900 bg-white px-1.5 py-0.5 rounded shadow-2xs">
                    {p.ipaSymbol}
                  </span>
                ))}
                {summary && summary.practicingSounds.length === 0 && (
                  <span className="text-[11px] text-indigo-700 italic">None yet</span>
                )}
              </div>
            </div>

            {/* Needs Review */}
            {summary && summary.needsReviewSounds.length > 0 && (
              <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200/80 space-y-1 col-span-2">
                <span className="text-[10px] font-bold text-purple-800 uppercase block">Needs Review</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {summary.needsReviewSounds.map((p) => (
                    <span key={p.id} className="text-xs font-bold text-purple-900 bg-white px-2 py-0.5 rounded-md shadow-2xs border border-purple-200">
                      🔄 {p.ipaSymbol}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* TODAY'S RECOMMENDED SOUND PRACTICE (Requirement 68) */}
      {summary?.topRecommendedSound && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-black text-2xl">
              {summary.topRecommendedSound.phonicsLabel}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200 block">
                {language === 'en' ? "Today's Recommended Sound" : 'आज का अनुशंसित अभ्यास'}
              </span>
              <h4 className="text-sm font-extrabold leading-tight">
                {summary.topRecommendedSound.displayName} ({summary.topRecommendedSound.ipaSymbol})
              </h4>
              <p className="text-[11px] text-amber-100 line-clamp-1">
                "{summary.topRecommendedSound.exampleWords.slice(0, 3).join(', ')}"
              </p>
            </div>
          </div>

          <button
            onClick={() => setPracticeSound(summary.topRecommendedSound!)}
            className="px-4 py-2.5 bg-white hover:bg-amber-50 text-amber-900 rounded-2xl text-xs font-black shadow-sm active:scale-95 transition shrink-0 cursor-pointer"
          >
            {language === 'en' ? 'Practice' : 'शुरू करें'}
          </button>
        </div>
      )}

      {/* Search & Filter Tabs */}
      <div className="space-y-2">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'en' ? 'Search phonics sound, letter, or word...' : 'ध्वनि या शब्द खोजें...'}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold">
          {(
            [
              { id: 'all', label: language === 'en' ? 'All' : 'सभी' },
              { id: 'vowels', label: language === 'en' ? 'Vowels' : 'स्वर' },
              { id: 'consonants', label: language === 'en' ? 'Consonants' : 'व्यंजन' },
              { id: 'practicing', label: language === 'en' ? 'Practicing' : 'अभ्यास' },
              { id: 'mastered', label: language === 'en' ? 'Mastered ⭐' : 'कंठस्थ' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as FilterTab)}
              className={`px-3 py-1.5 rounded-full whitespace-nowrap transition ${
                activeFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Phonics Sound Cards Grid (Requirements 55, 59, 64) */}
      <div className="grid grid-cols-2 gap-3">
        {filteredSounds.map((sound) => {
          const prof = profiles.find((p) => p.soundId === sound.soundId);
          const accuracy = prof ? prof.overallAccuracy : 0;
          const totalAtts = prof ? prof.totalAttempts : 0;

          return (
            <div
              key={sound.soundId}
              onClick={() => setSelectedSound(sound)}
              className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:shadow-sm transition cursor-pointer flex flex-col justify-between space-y-3"
            >
              {/* Top Row: Symbol, IPA, Audio Play */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-2xl font-black text-slate-900">
                      {sound.phonicsLabel}
                    </span>
                    <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                      {sound.ipaSymbol}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium block truncate mt-0.5">
                    "{sound.exampleWords[0]}"
                  </span>
                </div>

                <button
                  onClick={(e) => handlePlaySoundAudio(e, sound)}
                  className="p-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 transition"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {/* Middle Row: Progress & Status */}
              <div className="space-y-1 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Progress: <strong className="text-slate-800">{accuracy}%</strong></span>
                  <span>{totalAtts} {totalAtts === 1 ? 'try' : 'tries'}</span>
                </div>

                <div className="flex items-center justify-between">
                  {getStatusBadge(prof)}
                  {prof && prof.recentAttempts.length > 0 && (
                    <div className="flex items-center gap-0.5">
                      {prof.recentAttempts.slice(-4).map((r, i) => (
                        <span
                          key={i}
                          className={`w-2.5 h-2.5 rounded-full ${
                            r === 'correct' || r === 'likely_correct'
                              ? 'bg-emerald-500'
                              : r === 'uncertain'
                              ? 'bg-amber-400'
                              : 'bg-rose-500'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPracticeSound(sound);
                }}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-1 shadow-2xs active:scale-95 transition"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{language === 'en' ? 'Practice' : 'अभ्यास'}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Sound Detail Modal */}
      {selectedSound && (
        <PhonicsSoundDetailModal
          sound={selectedSound}
          language={language}
          childId={profile?.childId}
          onClose={() => setSelectedSound(null)}
          onProfileUpdated={() => {
            loadData();
            onProfileUpdated?.();
          }}
        />
      )}

      {/* Sound Practice Modal */}
      {practiceSound && (
        <PhonicsPracticeModal
          sound={practiceSound}
          language={language}
          childId={profile?.childId}
          onClose={() => {
            setPracticeSound(null);
            loadData();
            onProfileUpdated?.();
          }}
          onPracticeComplete={() => {
            loadData();
            onProfileUpdated?.();
          }}
        />
      )}

      {/* Child Phonics Star Card Report (Requirement 73) */}
      {showChildReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 to-amber-500 text-white mx-auto flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Star className="w-8 h-8 fill-white" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900">
                {language === 'en' ? '🌟 Great Work, Learner!' : '🌟 शानदार प्रयास!'}
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                {language === 'en'
                  ? 'Your phonics practice is making your speech clearer every day.'
                  : 'आपका ध्वनि अभ्यास आपकी आवाज़ को प्रतिदिन अधिक स्पष्ट बना रहा है।'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-indigo-950">
                <span>Practiced Sounds:</span>
                <span className="font-mono text-sm">{summary?.totalPracticedSoundsCount || 0}</span>
              </div>
              <div className="flex items-center justify-between font-bold text-emerald-900">
                <span>Mastered Sounds:</span>
                <span className="font-mono text-sm">{summary?.masteredSounds.length || 0} ⭐</span>
              </div>
            </div>

            <button
              onClick={() => setShowChildReportModal(false)}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition"
            >
              {language === 'en' ? 'Awesome! Keep Going' : 'शानदार! जारी रखें'}
            </button>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
