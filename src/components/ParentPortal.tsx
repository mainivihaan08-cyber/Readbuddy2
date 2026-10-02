import React, { useState, useEffect, useRef } from 'react';
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
  Sparkles,
  Mic,
  Terminal,
  RotateCcw,
  Radio,
  Share2,
  Download,
  Copy,
  FileText,
  RefreshCw,
  Award
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
  WeeklyStats,
  SpeechProfile
} from '../types';
import { analyzeSpokenText } from '../services/soundAnalysis';
import {
  getParentPin,
  setParentPin,
  getWeeklyStats,
  getSoundSubstitutions,
  getSavedRecordings,
  getChildProfile,
  saveChildProfile,
  getAppSettings,
  saveAppSettings,
  maskMobileNumber,
  getAllChildProfiles,
  switchChildProfile
} from '../services/storage';
import {
  getSpeechProfile,
  resetSpeechProfile,
  getTopWeakSoundsFromProfile,
  getTopWeakWordsFromProfile,
  generateTherapistReportText,
  exportReportToCanvas
} from '../services/speechProfile';
import {
  SpeechRecognizer,
  getFriendlySpeechErrorMessage,
  SpeechDiagnosticEvent
} from '../services/speech';

interface ParentPortalProps {
  language: AppLanguage;
  onClose: () => void;
  onProfileUpdated?: () => void;
}

const AudioRecordPlayer: React.FC<{ blob?: Blob }> = ({ blob }) => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob || blob.size === 0) {
      setAudioUrl(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    setAudioUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [blob]);

  if (!blob || blob.size === 0 || !audioUrl) {
    return (
      <span className="text-[11px] text-slate-400 font-medium italic block my-1">
        No audio saved for this attempt
      </span>
    );
  }

  return (
    <div className="my-1">
      <audio controls src={audioUrl} className="h-8 max-w-[220px] rounded-lg" />
    </div>
  );
};

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
  const [saveVoiceRecording, setSaveVoiceRecording] = useState(() => getAppSettings().saveVoiceRecording);
  const [settingsSavedMessage, setSettingsSavedMessage] = useState(false);

  // 4. Test Microphone Diagnostic Console state (default en-IN)
  const [testMicLang, setTestMicLang] = useState<AppLanguage>('en');
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [testTranscript, setTestTranscript] = useState('');
  const [testConfidence, setTestConfidence] = useState<number | null>(null);
  const [testAlternatives, setTestAlternatives] = useState<string[]>([]);
  const [testLogs, setTestLogs] = useState<
    Array<{ id: string; time: string; eventType: string; summary: string; detail?: string }>
  >([]);
  const testRecognizerRef = useRef<SpeechRecognizer | null>(null);

  // Audio playback state
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Speech Profile Engine states
  const [speechProfile, setSpeechProfile] = useState<SpeechProfile>(() => getSpeechProfile());
  const [showShareReportModal, setShowShareReportModal] = useState(false);
  const [copiedReportNotice, setCopiedReportNotice] = useState(false);
  const [showResetProfileModal, setShowResetProfileModal] = useState(false);
  const reportCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const handleProfileChange = () => {
      setSpeechProfile(getSpeechProfile());
    };
    window.addEventListener('readbuddy_speech_profile_changed', handleProfileChange);
    return () => {
      window.removeEventListener('readbuddy_speech_profile_changed', handleProfileChange);
    };
  }, []);

  const handleDownloadPNGReport = () => {
    if (!reportCanvasRef.current) return;
    exportReportToCanvas(speechProfile, language, reportCanvasRef.current);
    const dataUrl = reportCanvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `ReadBuddy_Speech_Report_${speechProfile.childName.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyReportText = () => {
    const text = generateTherapistReportText(speechProfile, language);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setCopiedReportNotice(true);
    setTimeout(() => setCopiedReportNotice(false), 2500);
  };

  const handleConfirmResetProfile = () => {
    const fresh = resetSpeechProfile();
    setSpeechProfile(fresh);
    setShowResetProfileModal(false);
  };

  useEffect(() => {
    return () => {
      if (testRecognizerRef.current) {
        testRecognizerRef.current.abort();
        testRecognizerRef.current = null;
      }
    };
  }, []);

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

  const startMicDiagnosticTest = () => {
    if (testRecognizerRef.current) {
      testRecognizerRef.current.abort();
      testRecognizerRef.current = null;
    }

    setIsTestingMic(true);
    setTestTranscript('');
    setTestConfidence(null);
    setTestAlternatives([]);

    const addLog = (eventType: string, summary: string, detail?: string) => {
      const now = new Date();
      const timeStr = `${now.toTimeString().split(' ')[0]}.${String(now.getMilliseconds()).padStart(3, '0')}`;
      setTestLogs((prev) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          time: timeStr,
          eventType,
          summary,
          detail,
        },
        ...prev.slice(0, 49),
      ]);
    };

    addLog('init', `SpeechRecognizer started (${testMicLang === 'hi' ? 'hi-IN' : 'en-IN'})`);

    // Use single shared SpeechRecognizer from speech.ts
    const recognizer = new SpeechRecognizer(testMicLang, 'test');
    testRecognizerRef.current = recognizer;

    recognizer.start({
      mode: 'test',
      onTranscript: (transcript) => {
        setTestTranscript(transcript);
      },
      onError: (err) => {
        addLog('onerror', `Error: ${err}`, getFriendlySpeechErrorMessage(err, testMicLang));
      },
      onStateChange: (_state, active) => {
        if (!active && isTestingMic) {
          addLog('state', 'State: inactive');
        }
      },
      onDiagnostic: (diagEvent: SpeechDiagnosticEvent) => {
        switch (diagEvent.type) {
          case 'onstart':
            addLog('onstart', 'SpeechRecognition service started');
            break;
          case 'onaudiostart':
            addLog('onaudiostart', 'Microphone audio capture started');
            break;
          case 'onspeechstart':
            addLog('onspeechstart', 'Speech sound detected by engine');
            break;
          case 'onresult': {
            const d = diagEvent.details;
            if (d) {
              if (d.confidence !== undefined) setTestConfidence(d.confidence);
              if (d.alternatives && d.alternatives.length > 0) setTestAlternatives(d.alternatives);
              const summary = d.isFinal
                ? `FINAL: "${d.finalText}" (conf: ${d.confidence || 0}%)`
                : `INTERIM: "${d.interimText}"`;
              const altText =
                d.alternatives && d.alternatives.length > 1
                  ? `Alternatives: [${d.alternatives.join(', ')}]`
                  : undefined;
              addLog('onresult', summary, altText);
            }
            break;
          }
          case 'onspeechend':
            addLog('onspeechend', 'Speech sound paused or ended');
            break;
          case 'onaudioend':
            addLog('onaudioend', 'Audio capture stream stopped');
            break;
          case 'onend':
            addLog('onend', 'Recognition session ended');
            break;
          case 'onerror':
            addLog(
              'onerror',
              `Error: ${diagEvent.details?.errorCode || 'unknown'}`,
              diagEvent.details?.errorMessage
            );
            break;
        }
      }
    });
  };

  const stopMicDiagnosticTest = () => {
    if (testRecognizerRef.current) {
      testRecognizerRef.current.abort();
      testRecognizerRef.current = null;
    }
    setIsTestingMic(false);
  };

  const clearDiagnosticLogs = () => {
    setTestLogs([]);
    setTestTranscript('');
    setTestConfidence(null);
    setTestAlternatives([]);
  };

  const handleSaveSettings = () => {
    const updated = {
      ...profile,
      name: childName.trim() || 'Aarav',
      dailyCapMinutes: Number(dailyCap) || 15,
    };
    saveChildProfile(updated);
    setProfile(updated);
    saveAppSettings({
      animationsEnabled: animationsOn,
      saveVoiceRecording,
    });

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
                {/* Speech Profile Summary Card (Requirements 1, 4, 5, 6) */}
                <div className="p-4 rounded-2xl bg-indigo-900 text-white shadow-md space-y-3">
                  <div className="flex items-center justify-between border-b border-indigo-700/80 pb-2">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-300" />
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          {language === 'en' ? `${speechProfile.childName}'s Speech Profile` : `${speechProfile.childName} का वाक् प्रोफ़ाइल`}
                        </h3>
                        <span className="text-[10px] text-indigo-200">
                          {language === 'en' ? 'Grows continuously with child practice' : 'अभ्यास के साथ निरंतर प्रगति'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowShareReportModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>{language === 'en' ? 'Share Report' : 'रिपोर्ट शेयर करें'}</span>
                    </button>
                  </div>

                  {/* Plain-Language Weekly Summary Highlights (Requirement 5) */}
                  <div className="bg-indigo-950/70 p-3 rounded-xl border border-indigo-800/80 space-y-1.5 text-xs">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                      {language === 'en' ? 'Plain-Language Weekly Insights:' : 'साप्ताहिक प्रगति सारांश:'}
                    </span>
                    {(() => {
                      const topWeakSnds = getTopWeakSoundsFromProfile(language);
                      const topSnd = topWeakSnds[0];
                      return (
                        <ul className="space-y-1 text-indigo-100 font-medium leading-relaxed">
                          {topSnd && (
                            <li className="flex items-start gap-1.5">
                              <span className="text-amber-300 font-bold">✓</span>
                              <span>
                                Phonetic sound <strong>/{topSnd.sound}/</strong> accuracy is at <strong>{topSnd.currentWeeklyAccuracy}%</strong> (Trend: {topSnd.weeklyTrend}).
                              </span>
                            </li>
                          )}
                          <li className="flex items-start gap-1.5">
                            <span className="text-amber-300 font-bold">✓</span>
                            <span>
                              Best practice time: <strong className="capitalize text-amber-200">{speechProfile.style.bestTimeOfDay}</strong> ({speechProfile.style.bestTimeOfDay === 'morning' ? '6 AM - 12 PM' : speechProfile.style.bestTimeOfDay === 'afternoon' ? '12 PM - 5 PM' : '5 PM - 10 PM'})
                            </span>
                          </li>
                          <li className="flex items-start gap-1.5">
                            <span className="text-amber-300 font-bold">✓</span>
                            <span>
                              Rhythm & Speed: Average <strong>{speechProfile.style.averageWPM} WPM</strong> across {speechProfile.style.totalSessionsCount} practice sessions.
                            </span>
                          </li>
                        </ul>
                      );
                    })()}
                  </div>

                  {/* Top 3 Weak Sounds & Top 5 Weak Words (Requirement 5) */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Top 3 Weak Sounds */}
                    <div className="bg-indigo-950/60 p-2.5 rounded-xl border border-indigo-800/70">
                      <span className="block text-[10px] font-bold text-indigo-300 uppercase mb-1.5">
                        {language === 'en' ? 'Top 3 Focus Sounds:' : 'मुख्य ३ ध्यान ध्वनियाँ:'}
                      </span>
                      <div className="space-y-1">
                        {getTopWeakSoundsFromProfile(language).map((s) => (
                          <div key={s.sound} className="flex items-center justify-between text-[11px] bg-indigo-900/80 px-2 py-1 rounded-lg">
                            <span className="font-bold text-amber-200">/{s.sound}/</span>
                            <span className="text-[10px] text-indigo-200">{s.currentWeeklyAccuracy}%</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${s.weeklyTrend === 'improving' ? 'bg-emerald-900 text-emerald-200' : s.weeklyTrend === 'worse' ? 'bg-rose-900 text-rose-200' : 'bg-slate-800 text-slate-200'}`}>
                              {s.weeklyTrend}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top 5 Weak Words */}
                    <div className="bg-indigo-950/60 p-2.5 rounded-xl border border-indigo-800/70">
                      <span className="block text-[10px] font-bold text-indigo-300 uppercase mb-1.5">
                        {language === 'en' ? 'Top Words Needing Practice:' : 'अभ्यास योग्य मुख्य शब्द:'}
                      </span>
                      <div className="space-y-1">
                        {getTopWeakWordsFromProfile(language).map((w) => (
                          <div key={w.word} className="flex items-center justify-between text-[11px] bg-indigo-900/80 px-2 py-1 rounded-lg">
                            <span className="font-bold text-white truncate max-w-[80px]">"{w.word}"</span>
                            <span className="text-[10px] text-amber-300 font-bold">{w.needsPracticeCount}x retries</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-indigo-300 italic text-center pt-1 border-t border-indigo-800/80">
                    "Practice suggestions, not a medical diagnosis."
                  </p>
                </div>

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
                            {language === 'en' ? 'Raw Recognized Text (What ReadBuddy Heard):' : 'ऐप ने क्या सुना (कच्चा पाठ):'}
                          </span>
                          <p className="font-semibold text-indigo-950 bg-white p-2.5 rounded-xl border border-indigo-100/80 italic">
                            "{latest.heardTranscript || (language === 'en' ? 'None (No speech recognized)' : 'कोई स्पष्ट आवाज़ नहीं मिली')}"
                          </p>
                        </div>

                        {/* Recognition Language & Error Code Diagnostic Row (Requirement 5) */}
                        <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                          <div className="bg-white p-2 rounded-xl border border-indigo-100/80">
                            <span className="block text-[9px] font-bold text-slate-400 uppercase">
                              {language === 'en' ? 'Recognition Language:' : 'पहचान भाषा:'}
                            </span>
                            <span className="font-bold text-slate-700">
                              {latest.recognitionLanguage || (latest.language === 'hi' ? 'hi-IN (Hindi)' : 'en-IN (English)')}
                            </span>
                          </div>
                          <div className="bg-white p-2 rounded-xl border border-indigo-100/80">
                            <span className="block text-[9px] font-bold text-slate-400 uppercase">
                              {language === 'en' ? 'Error Code:' : 'त्रुटि कोड:'}
                            </span>
                            <span className={`font-bold ${latest.errorCode ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {latest.errorCode ? latest.errorCode : (language === 'en' ? 'None (Clean stream)' : 'कोई त्रुटि नहीं')}
                            </span>
                          </div>
                        </div>

                        {/* Word-by-Word Sequence Alignment (Requirement 6) */}
                        {(() => {
                          const expText = latest.expectedText || latest.paragraphTitle || '';
                          const heardText = latest.heardTranscript || '';
                          if (!expText) return null;
                          const alignment = analyzeSpokenText(expText, heardText, latest.language || language);
                          return (
                            <div className="bg-white p-2.5 rounded-xl border border-indigo-100/80 space-y-1.5">
                              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                {language === 'en' ? 'Word-by-Word Alignment:' : 'शब्द-दर-शब्द मिलान:'}
                              </span>
                              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                                {alignment.map((w, idx) => (
                                  <div
                                    key={idx}
                                    className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg border font-semibold ${
                                      w.status === 'correct'
                                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                        : w.status === 'not-heard'
                                        ? 'bg-amber-50 text-amber-900 border-amber-300'
                                        : 'bg-rose-50 text-rose-900 border-rose-300'
                                    }`}
                                    title={
                                      w.status === 'correct'
                                        ? 'Matched'
                                        : w.status === 'not-heard'
                                        ? 'Not heard'
                                        : `Mismatch (Spoken: "${w.spoken || ''}")`
                                    }
                                  >
                                    <span>{w.expected}</span>
                                    {w.status === 'correct' && (
                                      <span className="text-emerald-700 text-[9px] font-bold">✓</span>
                                    )}
                                    {w.status === 'not-heard' && (
                                      <span className="text-amber-700 text-[9px] font-bold">?</span>
                                    )}
                                    {w.status === 'needs-practice' && (
                                      <span className="text-rose-700 text-[9px] font-bold">✕</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        <div className="pt-1 flex items-center justify-between">
                          <span className="text-[10px] text-slate-500">
                            {latest.paragraphTitle} · {latest.durationSeconds}s
                          </span>
                          <AudioRecordPlayer blob={latest.audioBlob} />
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
                    return (
                      <div
                        key={rec.id}
                        className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2"
                      >
                        <div className="flex items-center justify-between gap-3">
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

                        {/* Audio Controls Element or No Audio Saved Message */}
                        <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
                          <AudioRecordPlayer blob={rec.audioBlob} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: PARENT SETTINGS */}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                {/* Child Permanent Identity Card */}
                {profile && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900 to-slate-900 text-white shadow-sm space-y-2.5">
                    <div className="flex items-center justify-between border-b border-indigo-800 pb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-200">
                        {language === 'en' ? 'Child Profile Identity' : 'बच्चे की प्रोफ़ाइल पहचान'}
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                        {language === 'en' ? 'Permanent child_id' : 'स्थायी आईडी'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Child Name:</span>
                        <span className="font-extrabold text-white text-sm">{profile.name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Registered Mobile:</span>
                        <span className="font-mono font-bold text-indigo-300">
                          {maskMobileNumber(profile.mobileNumber || '9876543210')}
                        </span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-indigo-950/80 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400 font-mono">
                          ID: <span className="text-slate-300 font-semibold">{profile.childId || 'child_default'}</span>
                        </span>
                        <span className="text-indigo-200 font-medium">
                          Level {profile.level}: {profile.levelTitle}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {language === 'en' ? "Child's Name:" : 'बच्चे का नाम:'}
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

                {/* Voice Recording Toggle (Requirement 1) */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="pr-3">
                    <span className="block text-xs font-bold text-slate-800">
                      {language === 'en'
                        ? 'Save my voice recording (may stop speech recognition on some phones)'
                        : 'मेरी आवाज़ की रिकॉर्डिंग सहेजें (कुछ फोन पर वाक पहचान रुक सकती है)'}
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      {language === 'en'
                        ? 'Captures audio for playback in results. Keep OFF for maximum microphone compatibility on Android Chrome.'
                        : 'परिणामों में दोबारा सुनने के लिए ऑडियो सहेजता है। Android Chrome पर बेहतर पहचान के लिए इसे बंद रखें।'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSaveVoiceRecording(!saveVoiceRecording)}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      saveVoiceRecording ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                    title={saveVoiceRecording ? 'Turn voice recording off' : 'Turn voice recording on'}
                  >
                    <span
                      className={`block w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                        saveVoiceRecording ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* 3 & 4. Rebuilt Microphone Diagnostic Screen (Requirement 3 & 4) */}
                <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-md">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-slate-100 tracking-wide">
                        {language === 'en' ? 'Microphone Diagnostic Console' : 'माइक डायग्नोस्टिक कंसोल'}
                      </span>
                    </div>
                    {/* Language Selector (Default en-IN) */}
                    <div className="flex items-center gap-1.5 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
                      <Radio className="w-3 h-3 text-indigo-400" />
                      <select
                        value={testMicLang}
                        onChange={(e) => {
                          if (isTestingMic) stopMicDiagnosticTest();
                          setTestMicLang(e.target.value as AppLanguage);
                        }}
                        className="bg-transparent text-[11px] font-bold text-slate-200 focus:outline-none cursor-pointer"
                      >
                        <option value="en" className="bg-slate-900 text-white">en-IN (English)</option>
                        <option value="hi" className="bg-slate-900 text-white">hi-IN (Hindi)</option>
                      </select>
                    </div>
                  </div>

                  {/* Big Real-time Heard Transcript Display */}
                  <div className="my-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                      <span>FINAL RECOGNIZED TEXT:</span>
                      {testConfidence !== null && (
                        <span className="text-emerald-400 font-bold">Confidence: {testConfidence}%</span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-slate-100 min-h-[1.5rem] break-words">
                      {testTranscript ? (
                        <span className="text-emerald-300">"{testTranscript}"</span>
                      ) : (
                        <span className="text-slate-500 italic">
                          {isTestingMic ? 'Listening... Speak any words (e.g. red, green, yellow, hello)...' : 'Tap "Start Test" and speak'}
                        </span>
                      )}
                    </p>
                    {testAlternatives.length > 1 && (
                      <div className="mt-1 pt-1 border-t border-slate-800/60 text-[10px] text-slate-400 font-mono">
                        <span>Alternatives: </span>
                        <span className="text-slate-300">{testAlternatives.slice(1).join(', ')}</span>
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2 mb-3">
                    {!isTestingMic ? (
                      <button
                        type="button"
                        onClick={startMicDiagnosticTest}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 shadow-xs cursor-pointer"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>{language === 'en' ? 'Start Diagnostic Test' : 'परीक्षण शुरू करें'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopMicDiagnosticTest}
                        className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 shadow-xs animate-pulse cursor-pointer"
                      >
                        <div className="w-2 h-2 rounded-full bg-white" />
                        <span>{language === 'en' ? 'Stop Listening' : 'रोकें'}</span>
                      </button>
                    )}

                    {testLogs.length > 0 && (
                      <button
                        type="button"
                        onClick={clearDiagnosticLogs}
                        className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition active:scale-95 border border-slate-700 cursor-pointer"
                        title="Clear Logs"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Live Event Log Console */}
                  <div className="rounded-xl bg-black/60 border border-slate-800 p-2.5 font-mono text-[11px] max-h-44 overflow-y-auto space-y-1 scrollbar-thin">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider pb-1 mb-1 border-b border-slate-800/80 flex items-center justify-between">
                      <span>Live Web Speech Events:</span>
                      <span className={isTestingMic ? 'text-emerald-400 animate-pulse' : 'text-slate-600'}>
                        {isTestingMic ? '● ACTIVE' : '○ IDLE'}
                      </span>
                    </div>

                    {testLogs.length === 0 ? (
                      <p className="text-slate-600 italic py-2 text-center text-[10px]">
                        No events yet. Tap "Start Diagnostic Test" to begin.
                      </p>
                    ) : (
                      testLogs.map((log) => (
                        <div key={log.id} className="leading-tight py-0.5">
                          <span className="text-slate-500 mr-1.5">{log.time}</span>
                          <span
                            className={`font-bold mr-1.5 ${
                              log.eventType === 'onresult'
                                ? 'text-emerald-400'
                                : log.eventType === 'onerror'
                                ? 'text-rose-400'
                                : log.eventType === 'onspeechstart'
                                ? 'text-amber-400'
                                : 'text-sky-400'
                            }`}
                          >
                            [{log.eventType}]
                          </span>
                          <span className="text-slate-200">{log.summary}</span>
                          {log.detail && (
                            <span className="block text-[10px] text-slate-400 pl-4">{log.detail}</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {settingsSavedMessage && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-1.5 border border-emerald-200">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>{language === 'en' ? 'Settings saved successfully!' : 'सेटिंग्स सफलतापूर्वक सहेजी गईं!'}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <button
                    onClick={handleSaveSettings}
                    className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 active:scale-98 transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{language === 'en' ? 'Save Settings' : 'सेटिंग्स सहेजें'}</span>
                  </button>

                  {/* Reset Speech Profile Option (Requirement 8) */}
                  <button
                    type="button"
                    onClick={() => setShowResetProfileModal(true)}
                    className="w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{language === 'en' ? 'Reset Speech Profile' : 'वाक् प्रोफ़ाइल रीसेट करें'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SHARE REPORT MODAL FOR SPEECH THERAPIST (Requirement 6) */}
        {showShareReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    {language === 'en' ? 'Speech Therapist Summary Report' : 'स्पीच थेरेपिस्ट समरी रिपोर्ट'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowShareReportModal(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Hidden Canvas for PNG Generation */}
              <canvas ref={reportCanvasRef} className="hidden" />

              {/* Preview Box */}
              <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-200 font-mono text-xs space-y-2 max-h-60 overflow-y-auto">
                <pre className="whitespace-pre-wrap leading-relaxed text-[11px]">
                  {generateTherapistReportText(speechProfile, language)}
                </pre>
              </div>

              <p className="text-[11px] text-slate-500 italic text-center">
                "Practice suggestions, not a medical diagnosis."
              </p>

              {copiedReportNotice && (
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold text-center border border-emerald-200 animate-in fade-in">
                  ✓ Text summary copied to clipboard!
                </div>
              )}

              {/* Download PNG & Copy Text Actions */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={handleDownloadPNGReport}
                  className="py-3 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-95 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{language === 'en' ? 'Download PNG' : 'PNG डाउनलोड करें'}</span>
                </button>
                <button
                  onClick={handleCopyReportText}
                  className="py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                  <span>{language === 'en' ? 'Copy Text' : 'कॉपी करें'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONFIRMATION RESET PROFILE MODAL (Requirement 8) */}
        {showResetProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center border border-slate-100 space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h3 className="text-lg font-bold text-slate-900">
                {language === 'en' ? 'Reset Speech Profile?' : 'वाक् प्रोफ़ाइल रीसेट करें?'}
              </h3>

              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'en'
                  ? 'This will reset per-sound stats, word memory, and adaptive difficulty back to default. Saved audio recordings will remain safe.'
                  : 'यह वाक् आँकड़े और शब्द स्मृति को रीसेट कर देगा। रिकॉर्डिंग सुरक्षित रहेंगी।'}
              </p>

              <div className="space-y-2 pt-2">
                <button
                  onClick={handleConfirmResetProfile}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs active:scale-95 transition shadow-xs cursor-pointer"
                >
                  {language === 'en' ? 'Yes, Reset Profile' : 'हाँ, रीसेट करें'}
                </button>
                <button
                  onClick={() => setShowResetProfileModal(false)}
                  className="w-full py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 transition cursor-pointer"
                >
                  {language === 'en' ? 'Cancel' : 'रद्द करें'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
