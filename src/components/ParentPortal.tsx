import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  X,
  AlertTriangle,
  Calendar,
  Clock,
  BookOpen,
  Volume2,
  TrendingUp,
  TrendingDown,
  Minus,
  Settings,
  ShieldCheck,
  Play,
  Pause,
  Save,
  Check,
  BarChart3,
  Sparkles
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';
import {
  AppLanguage,
  ChildProfile,
  SavedRecording,
  SoundSubstitutionLog,
  WeeklyStats
} from '../types';
import {
  getParentPin,
  setParentPin,
  getWeeklyStats,
  getSoundSubstitutions,
  getSavedRecordings,
  getChildProfile,
  saveChildProfile,
  getAppSettings,
  saveAppSettings
} from '../services/storage';

interface ParentPortalProps {
  language: AppLanguage;
  onClose: () => void;
  onProfileUpdated?: () => void;
}

export const ParentPortal: React.FC<ParentPortalProps> = ({
  language,
  onClose,
  onProfileUpdated,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Parent Dashboard states
  const [activeTab, setActiveTab] = useState<'report' | 'sounds' | 'recordings' | 'settings'>('report');
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [substitutions, setSubstitutions] = useState<SoundSubstitutionLog[]>([]);
  const [recordings, setRecordings] = useState<SavedRecording[]>([]);
  const [profile, setProfile] = useState<ChildProfile>(getChildProfile());

  // Settings form states
  const [childName, setChildName] = useState(profile.name);
  const [dailyCap, setDailyCap] = useState(profile.dailyCapMinutes);
  const [newPin, setNewPin] = useState('');
  const [animationsOn, setAnimationsOn] = useState(() => getAppSettings().animationsEnabled);
  const [settingsSavedMessage, setSettingsSavedMessage] = useState(false);

  // Audio playback state
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    async function loadData() {
      if (isAuthenticated) {
        const stats = await getWeeklyStats();
        setWeeklyStats(stats);
        const subs = await getSoundSubstitutions();
        setSubstitutions(subs);
        const recs = await getSavedRecordings();
        setRecordings(recs);
      }
    }
    loadData();
  }, [isAuthenticated]);

  const handlePinSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const correctPin = getParentPin();
    if (pinInput === correctPin) {
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput('');
    }
  };

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
        console.warn('Play error', err);
        setPlayingId(null);
      });
      audio.onended = () => setPlayingId(null);
    }
  };

  const handleSaveSettings = () => {
    const updated = {
      ...profile,
      name: childName.trim() || 'Aarav',
      dailyCapMinutes: Number(dailyCap) || 15,
    };
    saveChildProfile(updated);
    setProfile(updated);
    saveAppSettings({ animationsEnabled: animationsOn });

    if (newPin.trim().length === 4) {
      setParentPin(newPin.trim());
    }

    setSettingsSavedMessage(true);
    setTimeout(() => setSettingsSavedMessage(false), 2500);
    onProfileUpdated?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in zoom-in-95">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              {isAuthenticated ? <Unlock className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-amber-400" />}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                {language === 'en' ? 'Parent Progress Dashboard' : 'अभिभावक प्रगति पोर्टल'}
              </h2>
              <span className="text-[11px] text-slate-500">
                {language === 'en' ? 'Weekly oversight & clarity trends' : 'साप्ताहिक रिपोर्ट एवं आवाज़ विश्लेषण'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PIN Authentication Screen */}
        {!isAuthenticated ? (
          <div className="p-6 sm:p-8 text-center my-auto">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-700 mx-auto flex items-center justify-center mb-4">
              <Lock className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {language === 'en' ? 'Parent PIN Required' : 'अभिभावक पिन दर्ज करें'}
            </h3>
            <p className="text-xs text-slate-500 mb-6 max-w-xs mx-auto">
              {language === 'en'
                ? 'Enter your 4-digit parent PIN (Default PIN: 1234)'
                : 'अपना ४ अंकों का पिन दर्ज करें (डिफ़ॉल्ट पिन: 1234)'}
            </p>

            <form onSubmit={handlePinSubmit} className="max-w-xs mx-auto space-y-4">
              <input
                type="password"
                maxLength={4}
                autoFocus
                placeholder="• • • •"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                className="w-full text-center text-2xl font-mono tracking-widest py-3 px-4 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600"
              />

              {pinError && (
                <p className="text-xs font-semibold text-rose-600 animate-shake">
                  {language === 'en' ? 'Incorrect PIN. Try default: 1234' : 'ग़लत पिन। डिफ़ॉल्ट आज़माएँ: 1234'}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 active:scale-98 transition shadow-xs"
              >
                {language === 'en' ? 'Unlock Parent Portal' : 'पोर्टल खोलें'}
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Mandatory Medical Disclaimer */}
            <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/90 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-bold text-amber-900 block">
                  {language === 'en'
                    ? 'Practice suggestions, not a medical diagnosis'
                    : 'अभ्यास सुझाव, कोई चिकित्सीय निदान नहीं'}
                </span>
                <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                  {language === 'en'
                    ? 'ReadBuddy is an independent educational tool to build articulation clarity and reading confidence. Speech recognition is inherently lenient. For clinical speech concerns, consult a certified speech-language pathologist (SLP).'
                    : 'यह एक शैक्षणिक अभ्यास उपकरण है। यह कोई मेडिकल जांच नहीं है। विशेषज्ञ सलाह हेतु स्पीच थेरेपिस्ट से संपर्क करें।'}
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="grid grid-cols-4 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              <button
                onClick={() => setActiveTab('report')}
                className={`py-2 rounded-xl transition ${
                  activeTab === 'report' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                {language === 'en' ? 'Weekly' : 'साप्ताहिक'}
              </button>
              <button
                onClick={() => setActiveTab('sounds')}
                className={`py-2 rounded-xl transition ${
                  activeTab === 'sounds' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                {language === 'en' ? 'Sounds' : 'ध्वनियाँ'}
              </button>
              <button
                onClick={() => setActiveTab('recordings')}
                className={`py-2 rounded-xl transition ${
                  activeTab === 'recordings' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                {language === 'en' ? 'Audios' : 'आवाज़ें'}
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-2 rounded-xl transition ${
                  activeTab === 'settings' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                {language === 'en' ? 'Settings' : 'सेटिंग्स'}
              </button>
            </div>

            {/* TAB 1: WEEKLY REPORT */}
            {activeTab === 'report' && weeklyStats && (
              <div className="space-y-4">
                {/* 3 Metric Cards */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-center">
                    <Clock className="w-4 h-4 text-indigo-600 mx-auto mb-1" />
                    <span className="text-xl font-black text-slate-900 tabular-nums">
                      {weeklyStats.totalMinutes}m
                    </span>
                    <span className="block text-[10px] text-slate-500 font-bold">
                      {language === 'en' ? 'Time Practiced' : 'कुल अभ्यास'}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-center">
                    <BookOpen className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                    <span className="text-xl font-black text-slate-900 tabular-nums">
                      {weeklyStats.paragraphsCompleted}
                    </span>
                    <span className="block text-[10px] text-slate-500 font-bold">
                      {language === 'en' ? 'Stories Read' : 'पाठ पढ़े'}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-center">
                    <TrendingUp className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                    <span className="text-xl font-black text-slate-900 tabular-nums">
                      {weeklyStats.avgAccuracy}%
                    </span>
                    <span className="block text-[10px] text-slate-500 font-bold">
                      {language === 'en' ? 'Avg Clarity' : 'औसत स्पष्टता'}
                    </span>
                  </div>
                </div>

                {/* LAST ATTEMPT DETAILS (Diagnostic verification for parents) */}
                {recordings.length > 0 && (() => {
                  const latest = recordings[0];
                  const isHigh = latest.accuracy >= 90;
                  const isMedium = latest.accuracy >= 70 && latest.accuracy < 90;
                  const isPlayingLatest = playingId === latest.id;
                  return (
                    <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 shadow-2xs">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-indigo-100/80">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{language === 'en' ? 'Last Attempt Details' : 'अंतिम प्रयास का विवरण'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-medium">{latest.dateFormatted}</span>
                          <span
                            className={`text-xs font-black px-2 py-0.5 rounded-full border ${
                              isHigh
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : isMedium
                                ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                                : 'bg-rose-100 text-rose-800 border-rose-300'
                            }`}
                          >
                            {latest.accuracy}% Clarity
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                            {language === 'en' ? 'Expected Text:' : 'मूल पाठ:'}
                          </span>
                          <p className="font-semibold text-slate-900 bg-white p-2.5 rounded-xl border border-indigo-100/80">
                            "{latest.expectedText || latest.paragraphTitle}"
                          </p>
                        </div>

                        <div>
                          <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                            {language === 'en' ? 'What ReadBuddy Heard:' : 'ऐप ने क्या सुना:'}
                          </span>
                          <p className="font-semibold text-indigo-950 bg-white p-2.5 rounded-xl border border-indigo-100/80 italic">
                            "{latest.heardTranscript || (language === 'en' ? 'No clear speech detected' : 'कोई स्पष्ट आवाज़ नहीं मिली')}"
                          </p>
                        </div>

                        <div className="pt-1 flex items-center justify-between">
                          <span className="text-[10px] text-slate-500">
                            {latest.paragraphTitle} · {latest.durationSeconds}s
                          </span>
                          {latest.audioUrl && (
                            <button
                              onClick={() => handlePlayAudio(latest)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] flex items-center gap-1 active:scale-95 transition shadow-2xs"
                            >
                              {isPlayingLatest ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                              <span>{isPlayingLatest ? 'Pause' : 'Listen Audio'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Recharts Bar Chart: Last 7 Days Practice Activity */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                  <div className="flex items-center justify-between mb-2 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <BarChart3 className="w-4 h-4 text-indigo-600" />
                      <span>
                        {language === 'en'
                          ? 'Last 7 Days Practice Activity:'
                          : 'पिछले ७ दिनों का अभ्यास (मिनट):'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 text-[10px] text-slate-500 font-semibold">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded bg-indigo-600 inline-block" />
                        <span>Minutes</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded bg-emerald-500 inline-block" />
                        <span>Goal Met</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-0.5 bg-amber-500 inline-block" />
                        <span>15m Target</span>
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 mb-3">
                    {language === 'en'
                      ? 'Minutes spent per day practicing speech clarity vs recommended 15m goal'
                      : 'प्रतिदिन बोले गए मिनट बनाम अनुशंसित १५ मिनट का लक्ष्य'}
                  </p>

                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={weeklyStats.dailyActivity}
                        margin={{ top: 8, right: 10, left: -22, bottom: 0 }}
                      >
                        <XAxis
                          dataKey="dayShort"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: '#94A3B8' }}
                          domain={[0, 'dataMax + 4']}
                          allowDecimals={false}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload as any;
                              return (
                                <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-lg text-xs border border-slate-700">
                                  <p className="font-bold text-slate-200">
                                    {d.day} ({d.date}) {d.isToday ? '• Today' : ''}
                                  </p>
                                  <p className="text-amber-400 font-black mt-0.5">
                                    {d.minutes} minutes practiced
                                  </p>
                                  <p className="text-[10px] text-slate-400">
                                    Target: {d.targetMinutes} min daily goal
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <ReferenceLine
                          y={weeklyStats.dailyActivity[0]?.targetMinutes || 15}
                          stroke="#F59E0B"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                        />
                        <Bar dataKey="minutes" radius={[6, 6, 0, 0]}>
                          {weeklyStats.dailyActivity.map((entry, index) => (
                            <Cell
                              key={`bar-${index}`}
                              fill={
                                entry.minutes >= entry.targetMinutes
                                  ? '#10B981'
                                  : entry.isToday
                                  ? '#4F46E5'
                                  : '#6366F1'
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">
                      Weekly total: <strong className="text-slate-800 tabular-nums">{weeklyStats.totalMinutes} mins</strong>
                    </span>
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                      {weeklyStats.daysPracticed.filter(Boolean).length} / 7 Days Active
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: WEAK SOUNDS & TRENDS */}
            {activeTab === 'sounds' && (
              <div className="space-y-3">
                <div className="text-xs text-slate-500 flex items-center justify-between">
                  <span>{language === 'en' ? 'Identified Sound Substitutions:' : 'पहचानी गई ध्वनियाँ:'}</span>
                  <span className="text-[11px] text-indigo-600 font-semibold">
                    {substitutions.length} {language === 'en' ? 'patterns logged' : 'पैटर्न दर्ज'}
                  </span>
                </div>

                <div className="space-y-2">
                  {substitutions.map((sub) => {
                    const isImproving = sub.trend === 'improving';

                    return (
                      <div
                        key={sub.id}
                        className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                              /{sub.expectedSound}/ ➔ /{sub.spokenSound}/
                            </span>
                            <span className="text-[11px] font-bold text-slate-500">
                              ({sub.count} {language === 'en' ? 'times' : 'बार'})
                            </span>
                          </div>

                          <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-slate-500">
                            {sub.exampleWords.map((ex, i) => (
                              <span key={i} className="bg-slate-100 px-1.5 py-0.5 rounded">
                                {ex}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg ${
                              isImproving
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {isImproving ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                            <span>{isImproving ? 'Improving 📈' : 'Practicing'}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: RECORDINGS LISTENER */}
            {activeTab === 'recordings' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  {language === 'en'
                    ? 'All audio clips are stored locally on this phone/computer for privacy:'
                    : 'सभी ऑडियो रिकॉर्डिंग गोपनीयता हेतु केवल इस डिवाइस पर सुरक्षित हैं:'}
                </p>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {recordings.map((rec) => {
                    const isPlaying = playingId === rec.id;
                    return (
                      <div
                        key={rec.id}
                        className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            onClick={() => handlePlayAudio(rec)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition active:scale-95 ${
                              isPlaying
                                ? 'bg-amber-600 text-white'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                            }`}
                          >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                          </button>

                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {rec.paragraphTitle}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                              <span>{rec.dateFormatted}</span>
                              <span>·</span>
                              <span>{rec.durationSeconds}s</span>
                              <span>·</span>
                              <span
                                className={`font-bold ${
                                  rec.accuracy >= 90
                                    ? 'text-emerald-600'
                                    : rec.accuracy >= 70
                                    ? 'text-indigo-600'
                                    : 'text-rose-600'
                                }`}
                              >
                                {rec.accuracy}% Clarity
                              </span>
                            </div>
                            {rec.heardTranscript && (
                              <p className="text-[10px] text-slate-500 italic truncate mt-0.5">
                                "{rec.heardTranscript}"
                              </p>
                            )}
                          </div>
                        </div>

                        {rec.identifiedSubstitutions && rec.identifiedSubstitutions.length > 0 && (
                          <div className="shrink-0 flex gap-1">
                            {rec.identifiedSubstitutions.slice(0, 2).map((s, i) => (
                              <span key={i} className="text-[10px] font-semibold bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: PARENT SETTINGS */}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'en' ? "Child's First Name:" : 'बच्चे का नाम:'}
                  </label>
                  <input
                    type="text"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'en' ? 'Daily Session Cap (Recommended: 10-15 min):' : 'दैनिक अभ्यास सीमा (१०-१५ मिनट):'}
                  </label>
                  <select
                    value={dailyCap}
                    onChange={(e) => setDailyCap(Number(e.target.value))}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value={10}>10 Minutes (Gentle)</option>
                    <option value={15}>15 Minutes (Recommended CBSE pace)</option>
                    <option value={20}>20 Minutes (Extended)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'en' ? 'Change Parent 4-Digit PIN:' : 'अभिभावक पिन बदलें:'}
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="Leave blank to keep current"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-300 text-sm font-mono tracking-widest text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                {/* Mascot & App Animations Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <span className="block text-xs font-bold text-slate-800">
                      {language === 'en' ? 'Buddy Robot Animations' : 'बडी रोबोट एनिमेशन'}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      {language === 'en'
                        ? 'Floating, wave, and cheer motion (respects battery & motion sensitivity)'
                        : 'रोबोट का हाथ हिलाना और उत्साहजनक एनिमेशन'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAnimationsOn(!animationsOn)}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                      animationsOn ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                    title={animationsOn ? 'Turn animations off' : 'Turn animations on'}
                  >
                    <span
                      className={`block w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                        animationsOn ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {settingsSavedMessage && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-1.5 border border-emerald-200">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>{language === 'en' ? 'Settings saved successfully!' : 'सेटिंग्स सफलतापूर्वक सहेजी गईं!'}</span>
                  </div>
                )}

                <button
                  onClick={handleSaveSettings}
                  className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 active:scale-98 transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>{language === 'en' ? 'Save Settings' : 'सेटिंग्स सहेजें'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
