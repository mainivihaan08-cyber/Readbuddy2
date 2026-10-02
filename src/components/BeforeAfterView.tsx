import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  History,
  TrendingUp,
  Volume2,
  Calendar,
  Sparkles,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { AppLanguage, ChildProfile, SavedRecording } from '../types';
import { getSavedRecordings } from '../services/storage';

interface BeforeAfterViewProps {
  language: AppLanguage;
  profile?: ChildProfile;
  onStartReading?: () => void;
}

export const BeforeAfterView: React.FC<BeforeAfterViewProps> = ({
  language,
  profile,
  onStartReading,
}) => {
  const [recordings, setRecordings] = useState<SavedRecording[]>([]);
  const [beforeRec, setBeforeRec] = useState<SavedRecording | null>(null);
  const [afterRec, setAfterRec] = useState<SavedRecording | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    async function load() {
      const recs = await getSavedRecordings(profile?.childId);
      setRecordings(recs);

      // Default before is oldest recording, after is newest recording
      if (recs.length >= 2) {
        setBeforeRec(recs[recs.length - 1]); // oldest
        setAfterRec(recs[0]); // newest
      } else if (recs.length === 1) {
        setBeforeRec(recs[0]);
        setAfterRec(recs[0]);
      } else {
        setBeforeRec(null);
        setAfterRec(null);
      }
    }
    load();
  }, [profile?.childId]);

  const handlePlayAudio = (rec: SavedRecording) => {
    if (playingId === rec.id) {
      audioElement?.pause();
      setPlayingId(null);
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    if (rec.audioUrl) {
      const audio = new Audio(rec.audioUrl);
      setAudioElement(audio);
      setPlayingId(rec.id);

      audio.play().catch((err) => {
        console.warn('Playback error', err);
        setPlayingId(null);
      });

      audio.onended = () => {
        setPlayingId(null);
      };
    }
  };

  const accuracyDiff = beforeRec && afterRec && beforeRec.id !== afterRec.id
    ? afterRec.accuracy - beforeRec.accuracy
    : 0;

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-28">
      {/* Header */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 leading-tight">
              {language === 'en' ? 'Before vs After' : 'प्रगति की तुलना (पहले और अब)'}
            </h2>
            <p className="text-[11px] text-slate-500">
              {language === 'en'
                ? 'Listen to your earlier and newer voice side-by-side'
                : 'अपनी पुरानी और नई रिकॉर्डिंग सुनकर अपनी प्रगति महसूस करें'}
            </p>
          </div>
        </div>

        {/* Growth Banner (when 2+ recordings exist) */}
        {recordings.length >= 2 && beforeRec && afterRec && beforeRec.id !== afterRec.id && (
          <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-emerald-500/10 border border-emerald-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <div>
                <span className="text-xs font-bold text-slate-900">
                  {accuracyDiff >= 0
                    ? language === 'en' ? `+${accuracyDiff}% Clarity Improvement!` : `+${accuracyDiff}% अधिक स्पष्ट उच्चारण!`
                    : language === 'en' ? 'Keep Practicing!' : 'नियमित अभ्यास करते रहें!'}
                </span>
                <p className="text-[10px] text-slate-500">
                  {language === 'en' ? 'Consistency builds smooth, clear speech' : 'नियमित अभ्यास से आत्मविश्वास बढ़ता है'}
                </p>
              </div>
            </div>
            <Sparkles className="w-5 h-5 text-amber-500 animate-bounce" />
          </div>
        )}
      </div>

      {/* EMPTY STATE: 0 RECORDINGS */}
      {recordings.length === 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs text-center space-y-4 mb-4">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center shadow-inner">
            <Volume2 className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {language === 'en'
                ? `No recordings yet for ${profile?.name || 'this profile'}`
                : `${profile?.name || 'इस प्रोफ़ाइल'} के लिए कोई रिकॉर्डिंग नहीं`}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
              {language === 'en'
                ? 'Start your first practice session to see your progress and listen to your voice improvement over time.'
                : 'अपनी पहली पठन गतिविधि शुरू करें और समय के साथ अपनी आवाज़ की प्रगति सुनें।'}
            </p>
          </div>

          {onStartReading && (
            <button
              onClick={onStartReading}
              className="py-3 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 mx-auto shadow-md shadow-indigo-600/20 active:scale-98 transition cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>{language === 'en' ? 'Start Reading Now' : 'पढ़ना शुरू करें'}</span>
            </button>
          )}
        </div>
      )}

      {/* SINGLE RECORDING STATE: 1 RECORDING */}
      {recordings.length === 1 && beforeRec && (
        <div className="space-y-4 mb-4">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {language === 'en'
                ? '1 session recorded! Complete 1 more reading practice to compare your earlier and newer voice side-by-side.'
                : '1 अभ्यास पूरा हुआ! तुलना करने के लिए एक और अभ्यास पूरा करें।'}
            </span>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span className="text-xs font-extrabold text-slate-700">
                {language === 'en' ? 'First Recording' : 'पहला अभ्यास'}
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-md">
                {beforeRec.dateFormatted}
              </span>
            </div>

            <p className="font-bold text-sm text-slate-900 mb-1">
              {beforeRec.paragraphTitle}
            </p>

            <div className="my-2">
              <span className="text-3xl font-black text-indigo-600">
                {beforeRec.accuracy}%
              </span>
              <span className="block text-[10px] text-slate-400 font-semibold">
                {language === 'en' ? 'Clarity score' : 'स्पष्टता'}
              </span>
            </div>

            {beforeRec.audioUrl && (
              <button
                onClick={() => handlePlayAudio(beforeRec)}
                className={`mt-2 w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  playingId === beforeRec.id
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                }`}
              >
                {playingId === beforeRec.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{playingId === beforeRec.id ? 'Pause' : 'Listen to Recording'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Side-by-side Comparison Cards (when 2+ recordings exist) */}
      {recordings.length >= 2 && beforeRec && afterRec && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* BEFORE CARD */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <span className="text-[11px] font-extrabold text-slate-500">
                    {language === 'en' ? 'Earlier Voice' : 'पहले की आवाज़'}
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.5 rounded-md">
                    {beforeRec.dateFormatted}
                  </span>
                </div>

                <p className="font-bold text-xs text-slate-900 line-clamp-1 mb-1">
                  {beforeRec.paragraphTitle}
                </p>

                <div className="my-2">
                  <span className="text-2xl font-black text-slate-700">
                    {beforeRec.accuracy}%
                  </span>
                  <span className="block text-[10px] text-slate-400 font-semibold">
                    {language === 'en' ? 'Clarity score' : 'स्पष्टता'}
                  </span>
                </div>
              </div>

              {beforeRec.audioUrl && (
                <button
                  onClick={() => handlePlayAudio(beforeRec)}
                  className={`mt-2 w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    playingId === beforeRec.id
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {playingId === beforeRec.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{playingId === beforeRec.id ? 'Pause' : 'Listen'}</span>
                </button>
              )}
            </div>

            {/* AFTER CARD */}
            <div className="bg-white rounded-3xl p-4 border border-indigo-200/90 shadow-xs bg-indigo-50/20 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-indigo-100">
                  <span className="text-[11px] font-extrabold text-indigo-700">
                    {language === 'en' ? 'Latest Voice' : 'हाल की आवाज़'}
                  </span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 font-semibold px-1.5 py-0.5 rounded-md">
                    {afterRec.dateFormatted}
                  </span>
                </div>

                <p className="font-bold text-xs text-slate-900 line-clamp-1 mb-1">
                  {afterRec.paragraphTitle}
                </p>

                <div className="my-2">
                  <span className="text-2xl font-black text-indigo-600">
                    {afterRec.accuracy}%
                  </span>
                  <span className="block text-[10px] text-indigo-500 font-semibold">
                    {language === 'en' ? 'Clarity score' : 'स्पष्टता'}
                  </span>
                </div>
              </div>

              {afterRec.audioUrl && (
                <button
                  onClick={() => handlePlayAudio(afterRec)}
                  className={`mt-2 w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    playingId === afterRec.id
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                  }`}
                >
                  {playingId === afterRec.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{playingId === afterRec.id ? 'Pause' : 'Listen'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Select Different Sessions to Compare */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
            <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>{language === 'en' ? 'All Practice Recordings:' : 'सभी पठन रिकॉर्डिंग:'}</span>
            </h3>

            <div className="space-y-2">
              {recordings.map((rec) => {
                const isPlayingThis = playingId === rec.id;
                const isBefore = beforeRec?.id === rec.id;
                const isAfter = afterRec?.id === rec.id;

                return (
                  <div
                    key={rec.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                      isAfter
                        ? 'bg-indigo-50/60 border-indigo-200'
                        : isBefore
                        ? 'bg-amber-50/60 border-amber-200'
                        : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {rec.audioUrl ? (
                        <button
                          onClick={() => handlePlayAudio(rec)}
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition active:scale-95 ${
                            isPlayingThis
                              ? 'bg-amber-600 text-white'
                              : 'bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-50'
                          }`}
                        >
                          {isPlayingThis ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                        </button>
                      ) : (
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-slate-100 text-slate-400">
                          <Volume2 className="w-4 h-4" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {rec.paragraphTitle}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span>{rec.dateFormatted}</span>
                          <span>·</span>
                          <span>{rec.durationSeconds}s</span>
                          <span>·</span>
                          <span className="font-semibold text-emerald-600">{rec.accuracy}% clarity</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setBeforeRec(rec)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                          isBefore
                            ? 'bg-amber-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Set Before
                      </button>
                      <button
                        onClick={() => setAfterRec(rec)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                          isAfter
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Set After
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
