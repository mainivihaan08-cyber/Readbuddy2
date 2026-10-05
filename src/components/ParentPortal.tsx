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
  Award,
  History,
  Target,
  Activity,
  Star,
  Camera,
  Image as ImageIcon
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
  SpeechCoachReportItem,
  WeeklyStats,
  SpeechProfile,
  PhonicsDashboardSummary,
  ChildPhonicsProfile,
  ReadingItem
} from '../types';
import { WordDifficultyReport } from './WordDifficultyReport';
import { SoundProgressReport } from './SoundProgressReport';
import { SpeechCaptureDiagnosticView } from './SpeechCaptureDiagnosticView';
import { getChildPhonicsProfiles, getPhonicsDashboardSummary } from '../services/phonicsEngine';
import { analyzeSpokenText } from '../services/soundAnalysis';
import {
  getParentPin,
  setParentPin,
  getWeeklyStats,
  getSoundSubstitutions,
  getSavedRecordings,
  getSpeechCoachReports,
  getChildProfile,
  saveChildProfile,
  getAppSettings,
  saveAppSettings,
  maskMobileNumber,
  getAllChildProfiles,
  switchChildProfile,
  getCustomReadingItems,
  saveCustomReadingItem,
} from '../services/storage';
import {
  getSpeechProfile,
  resetSpeechProfile,
  getTopWeakSoundsFromProfile,
  getTopWeakWordsFromProfile,
  generateTherapistReportText,
  exportReportToCanvas
} from '../services/speechProfile';
import { ensureNotificationsGranted, ensureMicrophoneGranted } from '../utils/permissionManager';
import {
  SpeechRecognizer,
  getFriendlySpeechErrorMessage,
  SpeechDiagnosticEvent
} from '../services/speech';
import { compressImageFile } from '../utils/imageCompressor';

interface ParentPortalProps {
  language: AppLanguage;
  profile?: ChildProfile;
  onClose: () => void;
  onProfileUpdated?: () => void;
  onStartReading?: () => void;
  onStartDrill?: () => void;
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
  profile: propProfile,
  onClose,
  onProfileUpdated,
  onStartReading,
  onStartDrill,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Parent Dashboard states (Strictly child-scoped)
  const [activeTab, setActiveTab] = useState<'report' | 'words' | 'sounds' | 'recordings' | 'settings' | 'books'>('report');
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [substitutions, setSubstitutions] = useState<SoundSubstitutionLog[]>([]);
  const [recordings, setRecordings] = useState<SavedRecording[]>([]);
  const [coachReports, setCoachReports] = useState<SpeechCoachReportItem[]>([]);
  const [phonicsSummary, setPhonicsSummary] = useState<PhonicsDashboardSummary | null>(null);
  const [profile, setProfile] = useState<ChildProfile>(() => propProfile || getChildProfile());

  // Settings form states
  const [childName, setChildName] = useState(profile.name);
  const [dailyCap, setDailyCap] = useState(profile.dailyCapMinutes);
  const [newPin, setNewPin] = useState('');
  const [animationsOn, setAnimationsOn] = useState(() => getAppSettings().animationsEnabled);
  const [saveVoiceRecording, setSaveVoiceRecording] = useState(() => getAppSettings().saveVoiceRecording);
  const [notificationsOn, setNotificationsOn] = useState(() => getAppSettings().notificationsEnabled);
  const [settingsSavedMessage, setSettingsSavedMessage] = useState(false);

  // Custom Books & Photo Upload States (Gemini AI multimodal extraction)
  const [bookChapterName, setBookChapterName] = useState('');
  const [bookLanguage, setBookLanguage] = useState<AppLanguage>('en');
  const [bookImageBase64, setBookImageBase64] = useState<string | null>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [isParsingBook, setIsParsingBook] = useState(false);
  const [parsingBookError, setParsingBookError] = useState<string | null>(null);
  const [parsedBookResult, setParsedBookResult] = useState<{
    words: string[];
    twoWordPhrases: string[];
    lines: string[];
    paragraphs: string[];
    oneWord?: string;
    twoWords?: string;
    line?: string;
    paragraph?: string;
  } | null>(null);
  const [customBooksList, setCustomBooksList] = useState<ReadingItem[]>([]);

  useEffect(() => {
    setCustomBooksList(getCustomReadingItems(language));
  }, [language, activeTab]);

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

  // Speech Profile Engine states (Strictly isolated by profile.childId)
  const [speechProfile, setSpeechProfile] = useState<SpeechProfile>(() => getSpeechProfile(profile.childId));
  const [showShareReportModal, setShowShareReportModal] = useState(false);
  const [copiedReportNotice, setCopiedReportNotice] = useState(false);
  const [showResetProfileModal, setShowResetProfileModal] = useState(false);
  const reportCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (propProfile) {
      setProfile(propProfile);
      setChildName(propProfile.name);
      setDailyCap(propProfile.dailyCapMinutes);
      setSpeechProfile(getSpeechProfile(propProfile.childId));
    }
  }, [propProfile]);

  useEffect(() => {
    const handleProfileChange = () => {
      setSpeechProfile(getSpeechProfile(profile.childId));
    };
    window.addEventListener('readbuddy_speech_profile_changed', handleProfileChange);
    return () => {
      window.removeEventListener('readbuddy_speech_profile_changed', handleProfileChange);
    };
  }, [profile.childId]);

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
    const fresh = resetSpeechProfile(profile.childId);
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
        const stats = await getWeeklyStats(profile.childId);
        setWeeklyStats(stats);
        const subs = await getSoundSubstitutions(undefined, profile.childId);
        setSubstitutions(subs);
        const recs = await getSavedRecordings(profile.childId);
        setRecordings(recs);
        const reports = getSpeechCoachReports(profile.childId);
        setCoachReports(reports);
        const phSummary = await getPhonicsDashboardSummary(language, profile.childId);
        setPhonicsSummary(phSummary);
      }
    }
    loadData();
  }, [isAuthenticated, profile.childId, language]);

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
      notificationsEnabled: notificationsOn,
    });

    if (newPin.trim().length === 4) {
      setParentPin(newPin.trim());
    }

    setSettingsSavedMessage(true);
    setTimeout(() => setSettingsSavedMessage(false), 2500);
    onProfileUpdated?.();
  };

  // Custom Books & Photo OCR Handlers (Memory-safe compression)
  const handleBookImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingImage(true);
    setParsingBookError(null);
    setParsedBookResult(null);

    try {
      // Scale and compress large photos (12-50MP) down to optimal size (< 250KB)
      const compressedBase64 = await compressImageFile(file, 1200, 0.75);
      setBookImageBase64(compressedBase64);
    } catch (err: any) {
      console.warn('[Books] Image compression warning:', err);
      try {
        const fallbackBase64 = await compressImageFile(file, 800, 0.6);
        setBookImageBase64(fallbackBase64);
      } catch (err2) {
        setParsingBookError(
          language === 'en'
            ? 'Low memory on device. Please select a photo from your gallery instead.'
            : 'डिवाइस में मेमोरी कम है। कृपया गैलरी से फ़ोटो चुनें।'
        );
      }
    } finally {
      setIsCompressingImage(false);
      e.target.value = '';
    }
  };

  const handleParseBookPage = async () => {
    if (!bookChapterName.trim()) {
      setParsingBookError(language === 'en' ? 'Please enter a Chapter Name.' : 'कृपया अध्याय का नाम दर्ज करें।');
      return;
    }
    if (!bookImageBase64) {
      setParsingBookError(language === 'en' ? 'Please upload or capture a photo of the book page.' : 'कृपया पुस्तक के पृष्ठ का फ़ोटो अपलोड करें।');
      return;
    }

    setIsParsingBook(true);
    setParsingBookError(null);
    setParsedBookResult(null);

    try {
      const response = await fetch('/api/parse-book-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: bookImageBase64,
          language: bookLanguage,
          chapterName: bookChapterName,
        }),
      });

      const responseText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch (jsonErr) {
        console.warn('[Books] Server returned non-JSON response:', responseText);
        throw new Error(
          language === 'en'
            ? 'Unable to parse page text. Please ensure the book page is well-lit and clear, then retry.'
            : 'पेज का टेक्स्ट पढ़ने में असमर्थ। कृपया सुनिश्चित करें कि फ़ोटो साफ़ है और दोबारा प्रयास करें।'
        );
      }

      if (!response.ok || !data.result) {
        throw new Error(data.error || 'Failed to extract text segments from page');
      }

      setParsedBookResult(data.result);
    } catch (err: any) {
      console.error('[Books] Parsing error:', err);
      let userFriendlyMsg = err.message || 'Error occurred while analyzing image';
      if (userFriendlyMsg.includes('503') || userFriendlyMsg.includes('UNAVAILABLE') || userFriendlyMsg.includes('high demand')) {
        userFriendlyMsg = language === 'en'
          ? 'AI server is momentarily busy. Automatic fallback activated — please tap Extract again.'
          : 'एआई सर्वर पर अधिक लोड है। बैकअप मॉडल सक्रिय कर दिया गया है — कृपया दोबारा "पेज को स्कैन करें" दबाएं।';
      } else if (userFriendlyMsg.includes('{') && userFriendlyMsg.includes('message')) {
        try {
          const parsedErr = JSON.parse(userFriendlyMsg);
          if (parsedErr.error?.message) {
            userFriendlyMsg = parsedErr.error.message;
          }
        } catch {}
      }
      setParsingBookError(userFriendlyMsg);
    } finally {
      setIsParsingBook(false);
    }
  };

  const handleSaveCustomBookLessons = () => {
    if (!parsedBookResult || !bookChapterName.trim()) return;

    const chapterName = bookChapterName.trim();
    const now = Date.now();

    // 1. Save all extracted single words
    const wordsList = parsedBookResult.words && parsedBookResult.words.length > 0
      ? parsedBookResult.words
      : [parsedBookResult.oneWord || 'wisdom'];

    wordsList.forEach((wordText, idx) => {
      saveCustomReadingItem({
        id: `custom-w-${now}-${idx}`,
        title: chapterName,
        language: bookLanguage,
        category: bookLanguage === 'en' ? 'Vocabulary Word' : 'शब्दावली शब्द',
        grade: bookLanguage === 'en' ? 'Custom Book' : 'कस्टम किताब',
        difficulty: 'medium',
        mode: 'word',
        text: wordText.trim().replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, ''),
        targetSounds: [],
        syllablesMap: {},
      });
    });

    // 2. Save all extracted two-word phrases
    const twoWordsList = parsedBookResult.twoWordPhrases && parsedBookResult.twoWordPhrases.length > 0
      ? parsedBookResult.twoWordPhrases
      : [parsedBookResult.twoWords || 'gold coins'];

    twoWordsList.forEach((phraseText, idx) => {
      saveCustomReadingItem({
        id: `custom-tw-${now}-${idx}`,
        title: chapterName,
        language: bookLanguage,
        category: bookLanguage === 'en' ? 'Two-Word Phrase' : 'दो-शब्द वाक्यांश',
        grade: bookLanguage === 'en' ? 'Custom Book' : 'कस्टम किताब',
        difficulty: 'medium',
        mode: 'two-words',
        text: phraseText.trim().replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, ''),
        targetSounds: [],
        syllablesMap: {},
      });
    });

    // 3. Save all extracted sentence lines
    const linesList = parsedBookResult.lines && parsedBookResult.lines.length > 0
      ? parsedBookResult.lines
      : [parsedBookResult.line || 'A practice sentence line.'];

    linesList.forEach((lineText, idx) => {
      saveCustomReadingItem({
        id: `custom-ln-${now}-${idx}`,
        title: chapterName,
        language: bookLanguage,
        category: bookLanguage === 'en' ? 'Reading Sentence' : 'पठन वाक्य',
        grade: bookLanguage === 'en' ? 'Custom Book' : 'कस्टम किताब',
        difficulty: 'medium',
        mode: 'line',
        text: lineText.trim(),
        targetSounds: [],
        syllablesMap: {},
      });
    });

    // 4. Save all extracted paragraphs
    const paragraphsList = parsedBookResult.paragraphs && parsedBookResult.paragraphs.length > 0
      ? parsedBookResult.paragraphs
      : [parsedBookResult.paragraph || 'A practice reading paragraph.'];

    paragraphsList.forEach((paraText, idx) => {
      saveCustomReadingItem({
        id: `custom-p-${now}-${idx}`,
        title: chapterName,
        language: bookLanguage,
        category: bookLanguage === 'en' ? 'Story Paragraph' : 'कहानी पैराग्राफ',
        grade: bookLanguage === 'en' ? 'Custom Book' : 'कस्टम किताब',
        difficulty: 'medium',
        mode: 'paragraph',
        text: paraText.trim(),
        targetSounds: [],
        syllablesMap: {},
      });
    });

    // Reset states
    setBookChapterName('');
    setBookImageBase64(null);
    setParsedBookResult(null);
    setCustomBooksList(getCustomReadingItems(language));

    const totalCount = wordsList.length + twoWordsList.length + linesList.length + paragraphsList.length;
    alert(
      language === 'en'
        ? `"${chapterName}" added successfully with ${wordsList.length} words, ${twoWordsList.length} two-word phrases, ${linesList.length} lines, and ${paragraphsList.length} paragraphs (${totalCount} total practice items)!`
        : `"${chapterName}" सफलतापूर्वक जोड़ा गया! (${wordsList.length} शब्द, ${twoWordsList.length} दो-शब्द, ${linesList.length} वाक्य, ${paragraphsList.length} पैराग्राफ — कुल ${totalCount} अभ्यास इकाइयाँ)`
    );
    onProfileUpdated?.();
  };

  const handleDeleteCustomItem = (id: string) => {
    try {
      const raw = localStorage.getItem('readbuddy_custom_reading_items');
      if (!raw) return;
      const items: ReadingItem[] = JSON.parse(raw);
      const filtered = items.filter(i => i.id !== id);
      localStorage.setItem('readbuddy_custom_reading_items', JSON.stringify(filtered));
      setCustomBooksList(getCustomReadingItems(language));
      onProfileUpdated?.();
    } catch (err) {
      console.error(err);
    }
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
            <div className="grid grid-cols-6 bg-slate-100 p-1 rounded-2xl text-[10px] sm:text-xs font-bold gap-0.5">
              <button
                onClick={() => setActiveTab('report')}
                className={`py-2 rounded-xl transition ${
                  activeTab === 'report' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                {language === 'en' ? 'Weekly' : 'साप्ताहिक'}
              </button>
              <button
                onClick={() => setActiveTab('words')}
                className={`py-2 rounded-xl transition ${
                  activeTab === 'words' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                {language === 'en' ? 'Words' : 'शब्द'}
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
                onClick={() => setActiveTab('books')}
                className={`py-2 rounded-xl transition ${
                  activeTab === 'books' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                {language === 'en' ? 'Books' : 'किताबें'}
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
            {activeTab === 'report' && weeklyStats && (() => {
              const reportsCount = coachReports.length;
              const practiceSessionsCount = speechProfile.style.totalSessionsCount;
              const recordingsCount = recordings.length;
              const analyzedSpeechesCount = recordings.length;
              const wordsPracticedCount = profile.totalWordsPracticed;
              const accuracyText = (recordings.length > 0 && weeklyStats.avgAccuracy > 0)
                ? `${weeklyStats.avgAccuracy}%`
                : 'No data yet';
              const wpmText = (speechProfile.style.totalSessionsCount > 0 && speechProfile.style.averageWPM > 0)
                ? `${speechProfile.style.averageWPM} WPM`
                : 'No data yet';

              const topWeakSnds = getTopWeakSoundsFromProfile(language, profile.childId);
              const topWeakWords = getTopWeakWordsFromProfile(language, profile.childId);
              const topSnd = topWeakSnds[0];

              return (
                <div className="space-y-4">
                  {/* Speech Profile Summary Card (Requirement 3) */}
                  <div className="p-4 rounded-2xl bg-indigo-900 text-white shadow-md space-y-3">
                    <div className="flex items-center justify-between border-b border-indigo-700/80 pb-2">
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-amber-300" />
                        <div>
                          <h3 className="text-sm font-bold text-white">
                            {language === 'en' ? `${profile.name}'s Speech Profile` : `${profile.name} का वाक् प्रोफ़ाइल`}
                          </h3>
                          <span className="text-[10px] text-indigo-200">
                            {practiceSessionsCount === 0
                              ? (language === 'en' ? 'New Profile • Ready for first session' : 'नया प्रोफ़ाइल • पहले अभ्यास के लिए तैयार')
                              : (language === 'en' ? 'Grows continuously with child practice' : 'अभ्यास के साथ निरंतर प्रगति')}
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

                    {/* 7 Core Initial Metrics Row: Fulfilling Requirement 3 */}
                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      <div className="bg-indigo-950/80 p-2 rounded-xl border border-indigo-800/80">
                        <span className="block text-[9px] text-indigo-300 font-bold uppercase">Reports</span>
                        <span className="text-xs font-black text-white">{reportsCount}</span>
                      </div>
                      <div className="bg-indigo-950/80 p-2 rounded-xl border border-indigo-800/80">
                        <span className="block text-[9px] text-indigo-300 font-bold uppercase">Sessions</span>
                        <span className="text-xs font-black text-white">{practiceSessionsCount}</span>
                      </div>
                      <div className="bg-indigo-950/80 p-2 rounded-xl border border-indigo-800/80">
                        <span className="block text-[9px] text-indigo-300 font-bold uppercase">Recordings</span>
                        <span className="text-xs font-black text-white">{recordingsCount}</span>
                      </div>
                      <div className="bg-indigo-950/80 p-2 rounded-xl border border-indigo-800/80">
                        <span className="block text-[9px] text-indigo-300 font-bold uppercase">Words Practiced</span>
                        <span className="text-xs font-black text-white">{wordsPracticedCount}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="bg-indigo-950/80 p-2 rounded-xl border border-indigo-800/80">
                        <span className="block text-[9px] text-indigo-300 font-bold uppercase">Analyzed Speeches</span>
                        <span className="text-xs font-black text-white">{analyzedSpeechesCount}</span>
                      </div>
                      <div className="bg-indigo-950/80 p-2 rounded-xl border border-indigo-800/80">
                        <span className="block text-[9px] text-indigo-300 font-bold uppercase">Accuracy</span>
                        <span className="text-[11px] font-black text-amber-300">{accuracyText}</span>
                      </div>
                      <div className="bg-indigo-950/80 p-2 rounded-xl border border-indigo-800/80">
                        <span className="block text-[9px] text-indigo-300 font-bold uppercase">WPM</span>
                        <span className="text-[11px] font-black text-amber-300">{wpmText}</span>
                      </div>
                    </div>

                    {/* Top 3 Focus Sounds & Top 5 Weak Words */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Top Focus Sounds */}
                      <div className="bg-indigo-950/60 p-2.5 rounded-xl border border-indigo-800/70">
                        <span className="block text-[10px] font-bold text-indigo-300 uppercase mb-1.5">
                          {language === 'en' ? 'Top Focus Sounds:' : 'मुख्य ध्यान ध्वनियाँ:'}
                        </span>
                        {topWeakSnds.length === 0 ? (
                          <span className="text-[11px] font-semibold text-indigo-300 italic block py-1">
                            {language === 'en' ? 'No data yet' : 'कोई डेटा नहीं'}
                          </span>
                        ) : (
                          <div className="space-y-1">
                            {topWeakSnds.map((s) => (
                              <div key={s.sound} className="flex items-center justify-between text-[11px] bg-indigo-900/80 px-2 py-1 rounded-lg">
                                <span className="font-bold text-amber-200">/{s.sound}/</span>
                                <span className="text-[10px] text-indigo-200">{s.currentWeeklyAccuracy}%</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${s.weeklyTrend === 'improving' ? 'bg-emerald-900 text-emerald-200' : s.weeklyTrend === 'worse' ? 'bg-rose-900 text-rose-200' : 'bg-slate-800 text-slate-200'}`}>
                                  {s.weeklyTrend}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Top Words Needing Practice */}
                      <div
                        onClick={() => setActiveTab('words')}
                        className="bg-indigo-950/60 p-2.5 rounded-xl border border-indigo-800/70 cursor-pointer hover:border-indigo-600 transition"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="block text-[10px] font-bold text-indigo-300 uppercase">
                            {language === 'en' ? 'Top Words Needing Practice:' : 'अभ्यास योग्य मुख्य शब्द:'}
                          </span>
                          <span className="text-[9px] text-amber-300 font-bold hover:underline">
                            {language === 'en' ? 'Full Report ➔' : 'रिपोर्ट ➔'}
                          </span>
                        </div>
                        {topWeakWords.length === 0 ? (
                          <span className="text-[11px] font-semibold text-indigo-300 italic block py-1">
                            {language === 'en' ? 'No data yet' : 'कोई डेटा नहीं'}
                          </span>
                        ) : (
                          <div className="space-y-1">
                            {topWeakWords.map((w) => (
                              <div key={w.word} className="flex items-center justify-between text-[11px] bg-indigo-900/80 px-2 py-1 rounded-lg">
                                <span className="font-bold text-white truncate max-w-[80px]">"{w.word}"</span>
                                <span className="text-[10px] text-amber-300 font-bold">{w.needsPracticeCount}x retries</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {practiceSessionsCount === 0 ? (
                      <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-400/40 text-center space-y-1">
                        <p className="text-xs font-bold text-amber-200 flex items-center justify-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>{language === 'en' ? 'Start your first practice session to see your progress.' : 'अपनी प्रगति देखने के लिए पहला अभ्यास शुरू करें।'}</span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-[10px] text-indigo-300 italic text-center pt-1 border-t border-indigo-800/80">
                        "Practice suggestions, not a medical diagnosis."
                      </p>
                    )}
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
                        {(recordings.length > 0 && weeklyStats.avgAccuracy > 0) ? `${weeklyStats.avgAccuracy}%` : (language === 'en' ? 'No data yet' : 'कोई डेटा नहीं')}
                      </span>
                      <span className="block text-[10px] text-slate-500 font-bold">
                        {language === 'en' ? 'Avg Clarity' : 'औसत स्पष्टता'}
                      </span>
                    </div>
                  </div>

                  {/* LAST ATTEMPT / RECENT REPORTS */}
                  {recordings.length === 0 ? (
                    <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-center space-y-2">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs font-bold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-indigo-600" />
                          <span>{language === 'en' ? 'Recent Reports' : 'हाल की रिपोर्ट'}</span>
                        </div>
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {language === 'en' ? 'No reports yet' : 'कोई रिपोर्ट नहीं'}
                        </span>
                      </div>
                      <div className="py-4 space-y-1">
                        <p className="text-xs font-bold text-slate-700">
                          {language === 'en' ? 'No reports yet' : 'कोई रिपोर्ट अभी उपलब्ध नहीं है'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {language === 'en'
                            ? 'Start your first practice session to see your progress.'
                            : 'अपनी प्रगति देखने के लिए अपना पहला अभ्यास सत्र शुरू करें।'}
                        </p>
                      </div>
                      {onStartReading && (
                        <button
                          onClick={() => {
                            onClose();
                            onStartReading();
                          }}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{language === 'en' ? 'Start Reading Now' : 'पढ़ना शुरू करें'}</span>
                        </button>
                      )}
                    </div>
                  ) : (() => {
                    const latest = recordings[0];
                    const isHigh = latest.accuracy >= 90;
                    const isMedium = latest.accuracy >= 70 && latest.accuracy < 90;
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

                    {weeklyStats.totalMinutes === 0 ? (
                      <div className="py-8 text-center space-y-1">
                        <p className="text-xs font-bold text-slate-700">
                          {language === 'en' ? 'No practice activity yet' : 'कोई अभ्यास गतिविधि अभी दर्ज नहीं है'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {language === 'en'
                            ? 'Start your first practice session to see your progress.'
                            : 'अपनी प्रगति देखने के लिए अपना पहला अभ्यास सत्र शुरू करें।'}
                        </p>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">
                        Weekly total: <strong className="text-slate-800 tabular-nums">{weeklyStats.totalMinutes} mins</strong>
                      </span>
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                        {weeklyStats.daysPracticed.filter(Boolean).length} / 7 Days Active
                      </span>
                    </div>
                  </div>

                  {/* Recent Reports Card (Requirement 3) */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                        <History className="w-4 h-4 text-indigo-600" />
                        <span>{language === 'en' ? 'Recent Reports' : 'हाल की रिपोर्ट'}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                        {coachReports.length} {coachReports.length === 1 ? 'Report' : 'Reports'}
                      </span>
                    </div>

                    {coachReports.length === 0 ? (
                      <div className="py-4 text-center space-y-1">
                        <p className="text-xs font-bold text-slate-700">
                          {language === 'en' ? 'No reports yet' : 'कोई रिपोर्ट नहीं'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {language === 'en'
                            ? 'Start your first practice session to see your progress.'
                            : 'अपनी प्रगति देखने के लिए अपना पहला अभ्यास सत्र शुरू करें।'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {coachReports.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-2xl border border-slate-200/70 transition flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0">
                              <span className="font-extrabold text-slate-900 block truncate">
                                {item.targetText ? `"${item.targetText.slice(0, 40)}..."` : 'Practice Session Report'}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                {item.dateFormatted} • {item.transcribedText ? `${item.transcribedText.split(' ').length} words` : 'Report Ready'}
                              </span>
                            </div>
                            <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-[10px] shrink-0 border border-indigo-100">
                              Logged
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* TAB 2: WORDS NEEDING PRACTICE & LONG-TERM WORD REPORT */}
            {activeTab === 'words' && (
              <WordDifficultyReport
                language={language}
                profile={profile}
                onStartReading={() => {
                  onClose();
                  onStartReading?.();
                }}
              />
            )}

            {/* TAB 3: WEAK SOUNDS, PHONICS & TRENDS */}
            {activeTab === 'sounds' && (
              <div className="space-y-4">
                {/* Parent-Friendly Phonics Progress Report (Requirement 72) */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white shadow-sm space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-indigo-700/60">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-amber-300" />
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        {language === 'en' ? 'Phonics Progress Report' : 'ध्वनि प्रगति रिपोर्ट'}
                      </h4>
                    </div>
                    <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full font-bold">
                      {phonicsSummary?.totalPracticedSoundsCount || 0} {language === 'en' ? 'Sounds Practiced' : 'अभ्यासित ध्वनियाँ'}
                    </span>
                  </div>

                  {phonicsSummary && phonicsSummary.totalPracticedSoundsCount === 0 ? (
                    <p className="text-xs text-indigo-200 py-1">
                      {language === 'en'
                        ? 'No individual phonics sound practice logged yet. When your child practices phonics cards, clear sound summaries will appear here.'
                        : 'कोई व्यक्तिगत ध्वनि अभ्यास अभी दर्ज नहीं है। अभ्यास के बाद यहाँ विवरण दिखेगा।'}
                    </p>
                  ) : (
                    <div className="space-y-2 text-xs">
                      {/* Improving Sounds */}
                      {phonicsSummary && phonicsSummary.recentlyImprovedSounds.length > 0 && (
                        <div className="flex items-start gap-2 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/30">
                          <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-bold text-emerald-300 uppercase block">
                              {language === 'en' ? 'Improving Sounds:' : 'सुधरती ध्वनियाँ:'}
                            </span>
                            <span className="font-extrabold text-emerald-100">
                              {phonicsSummary.recentlyImprovedSounds.map((s: ChildPhonicsProfile) => s.ipaSymbol).join(' · ')}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Needs More Practice */}
                      {phonicsSummary && phonicsSummary.practicingSounds.length > 0 && (
                        <div className="flex items-start gap-2 bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-500/30">
                          <Activity className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-bold text-indigo-300 uppercase block">
                              {language === 'en' ? 'Currently Practicing:' : 'अभ्यास जारी:'}
                            </span>
                            <span className="font-bold text-indigo-100">
                              {phonicsSummary.practicingSounds.slice(0, 4).map((s: ChildPhonicsProfile) => s.ipaSymbol).join(' · ')}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Strong Sounds */}
                      {phonicsSummary && phonicsSummary.strongSounds.length > 0 && (
                        <div className="flex items-start gap-2 bg-amber-950/40 p-2.5 rounded-xl border border-amber-500/30">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-bold text-amber-300 uppercase block">
                              {language === 'en' ? 'Strong / Mastered:' : 'मजबूत ध्वनियाँ:'}
                            </span>
                            <span className="font-bold text-amber-100">
                              {phonicsSummary.strongSounds.map((s: ChildPhonicsProfile) => `✓ ${s.ipaSymbol}`).join(' · ')}
                            </span>
                          </div>
                        </div>
                      )}

                      <p className="text-[10px] text-indigo-200/80 pt-1 italic">
                        {language === 'en'
                          ? 'Educational phonics overview based on child practice attempts.'
                          : 'बच्चे के अभ्यास पर आधारित शैक्षिक ध्वनि प्रगति।'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="text-xs text-slate-500 flex items-center justify-between pt-1">
                  <span>{language === 'en' ? 'Identified Sound Substitutions:' : 'पहचानी गई ध्वनियाँ:'}</span>
                  <span className="text-[11px] text-indigo-600 font-semibold">
                    {substitutions.length} {language === 'en' ? 'patterns logged' : 'पैटर्न दर्ज'}
                  </span>
                </div>

                {substitutions.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-center space-y-1.5">
                    <p className="text-xs font-bold text-slate-700">
                      {language === 'en' ? 'No sound substitution patterns logged yet' : 'कोई ध्वनि प्रतिस्थापन पैटर्न अभी दर्ज नहीं है'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {language === 'en'
                        ? 'Start your first practice session to see your progress.'
                        : 'अपनी प्रगति देखने के लिए अपना पहला अभ्यास शुरू करें।'}
                    </p>
                  </div>
                ) : (
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
                )}
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

                {recordings.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs text-center space-y-1.5">
                    <p className="text-xs font-bold text-slate-700">
                      {language === 'en' ? 'No recordings yet' : 'कोई रिकॉर्डिंग नहीं'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {language === 'en'
                        ? 'Start your first practice session to see your progress.'
                        : 'अपनी प्रगति देखने के लिए अपना पहला अभ्यास सत्र शुरू करें।'}
                    </p>
                  </div>
                ) : (
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
                )}
              </div>
            )}

            {/* TAB 5: CUSTOM BOOKS UPLOAD */}
            {activeTab === 'books' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-start gap-3">
                  <BookOpen className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-indigo-950">
                    <p className="font-extrabold text-sm mb-0.5">
                      {language === 'en' ? 'Custom Book Practice Portal' : 'कस्टम बुक अभ्यास पोर्टल'}
                    </p>
                    <p className="leading-relaxed">
                      {language === 'en'
                        ? "Take a photo of any physical book page. Our Gemini AI will extract and segment it into a Word, Two Words, Line, and Paragraph that your child can immediately practice on the main screen!"
                        : "बच्चे की किताब के किसी भी पेज की फोटो खींचें। हमारी जेमिनी एआई उस पेज में से एक शब्द, दो शब्द, एक वाक्य और एक कहानी निकालकर बच्चे के अभ्यास के लिए मुख्य स्क्रीन पर जोड़ देगी!"}
                    </p>
                  </div>
                </div>

                {/* Upload / Capture Form */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    {language === 'en' ? 'Add Custom Chapter' : 'नया अध्याय जोड़ें'}
                  </h4>

                  {/* Chapter Name Input */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {language === 'en' ? 'Chapter Name (e.g. The Brave Elephant):' : 'अध्याय का नाम (जैसे साहसी हाथी):'}
                    </label>
                    <input
                      type="text"
                      placeholder={language === 'en' ? 'Enter Chapter Name' : 'अध्याय का नाम यहाँ लिखें'}
                      value={bookChapterName}
                      onChange={(e) => setBookChapterName(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>

                  {/* Language Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {language === 'en' ? 'Book Language:' : 'पुस्तक की भाषा:'}
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setBookLanguage('en')}
                        className={`flex-1 py-1.5 rounded-lg font-bold text-xs border transition ${
                          bookLanguage === 'en'
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        English
                      </button>
                      <button
                        type="button"
                        onClick={() => setBookLanguage('hi')}
                        className={`flex-1 py-1.5 rounded-lg font-bold text-xs border transition ${
                          bookLanguage === 'hi'
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        Hindi (हिंदी)
                      </button>
                    </div>
                  </div>

                  {/* Image Upload/Capture Buttons (Camera & Gallery options) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      {language === 'en' ? 'Upload or Capture Page Photo:' : 'पेज की फोटो अपलोड या कैप्चर करें:'}
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      {/* Direct Camera Option */}
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50/80 rounded-2xl p-3 transition cursor-pointer relative text-center">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleBookImageChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Camera className="w-5 h-5 text-indigo-600 mb-1" />
                        <span className="text-[11px] font-bold text-indigo-900">
                          {language === 'en' ? '📷 Open Camera' : '📷 कैमरा खोलें'}
                        </span>
                        <span className="text-[9px] text-indigo-600/80">
                          {language === 'en' ? 'Take live photo' : 'सीधी फोटो खींचें'}
                        </span>
                      </label>

                      {/* Gallery / File Picker Option */}
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 bg-slate-50/70 hover:bg-slate-100 rounded-2xl p-3 transition cursor-pointer relative text-center">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBookImageChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <ImageIcon className="w-5 h-5 text-slate-600 mb-1" />
                        <span className="text-[11px] font-bold text-slate-800">
                          {language === 'en' ? '📁 From Gallery' : '📁 गैलरी से चुनें'}
                        </span>
                        <span className="text-[9px] text-slate-500">
                          {language === 'en' ? 'Low-memory safe' : 'सुरक्षित और तेज़'}
                        </span>
                      </label>
                    </div>

                    {/* Compression indicator or preview thumbnail */}
                    {isCompressingImage && (
                      <div className="mt-2 p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-center flex items-center justify-center gap-2 text-xs font-bold text-indigo-700 animate-pulse">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{language === 'en' ? 'Optimizing photo for memory safety...' : 'मेमोरी सुरक्षा हेतु फ़ोटो को ऑप्टिमाइज़ किया जा रहा है...'}</span>
                      </div>
                    )}

                    {bookImageBase64 && !isCompressingImage && (
                      <div className="mt-2.5 flex items-center gap-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                        <div className="w-12 h-12 rounded-lg border border-emerald-300 overflow-hidden shrink-0 bg-white flex items-center justify-center shadow-2xs">
                          <img src={bookImageBase64} alt="Preview" className="max-w-full max-h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold text-emerald-900 block truncate">
                            ✓ {language === 'en' ? 'Photo ready & optimized' : 'फ़ोटो तैयार और सुरक्षित'}
                          </span>
                          <span className="text-[10px] text-emerald-700 block">
                            {language === 'en' ? 'Ready to segment with Gemini AI' : 'जेमिनी एआई विश्लेषण के लिए तैयार'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Parse Trigger Button */}
                  <button
                    type="button"
                    onClick={handleParseBookPage}
                    disabled={isParsingBook || !bookChapterName.trim() || !bookImageBase64}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 active:scale-98 transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    {isParsingBook ? (
                      <span className="flex items-center gap-1.5 animate-pulse">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{language === 'en' ? 'Analyzing with Gemini AI...' : 'जेमिनी एआई विश्लेषण कर रहा है...'}</span>
                      </span>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 fill-white" />
                        <span>{language === 'en' ? 'Extract & Segment Page Content' : 'पेज को स्कैन और सेगमेंट करें'}</span>
                      </>
                    )}
                  </button>

                  {/* Errors */}
                  {parsingBookError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                      {parsingBookError}
                    </div>
                  )}
                </div>

                {/* OCR Response Preview & Acceptance with Full Word & Phrase Bank */}
                {parsedBookResult && (
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 animate-in slide-in-from-bottom duration-300">
                    <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-indigo-700 tracking-wider">
                        {language === 'en' ? 'Parsed Page Content Bank' : 'पेज से निकाले गए सभी शब्द एवं पाठ'}
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                        Gemini Ready
                      </span>
                    </div>

                    <div className="space-y-3.5 text-xs">
                      {/* Multiple Words Bank */}
                      <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-150">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wide">
                            {language === 'en' ? '1. Practice Words Bank:' : '१. एकल शब्द बैंक:'}
                          </span>
                          <span className="text-[10px] font-extrabold bg-indigo-200/80 text-indigo-900 px-2 py-0.5 rounded-full">
                            {parsedBookResult.words?.length || 1} {language === 'en' ? 'words extracted' : 'शब्द निकाले गए'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {(parsedBookResult.words?.length ? parsedBookResult.words : [parsedBookResult.oneWord || 'wisdom']).map((w, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 bg-white text-indigo-900 font-bold text-xs rounded-xl border border-indigo-200 shadow-2xs"
                            >
                              {w}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Multiple Two-Word Phrases */}
                      <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-150">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wide">
                            {language === 'en' ? '2. Two-Word Phrases:' : '२. दो-शब्द वाक्यांश:'}
                          </span>
                          <span className="text-[10px] font-extrabold bg-purple-200/80 text-purple-900 px-2 py-0.5 rounded-full">
                            {parsedBookResult.twoWordPhrases?.length || 1} {language === 'en' ? 'phrases' : 'वाक्यांश'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {(parsedBookResult.twoWordPhrases?.length ? parsedBookResult.twoWordPhrases : [parsedBookResult.twoWords || 'gold coins']).map((p, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 bg-white text-purple-950 font-bold text-xs rounded-xl border border-purple-200 shadow-2xs"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Sentence Lines */}
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                            {language === 'en' ? '3. Reading Sentence Lines:' : '३. पठन वाक्य:'}
                          </span>
                          <span className="text-[10px] font-extrabold bg-slate-200 text-slate-800 px-2 py-0.5 rounded-full">
                            {parsedBookResult.lines?.length || 1} {language === 'en' ? 'lines' : 'पंक्तियाँ'}
                          </span>
                        </div>
                        <div className="space-y-1.5 pt-1">
                          {(parsedBookResult.lines?.length ? parsedBookResult.lines : [parsedBookResult.line || '']).map((l, i) => (
                            <p key={i} className="font-semibold text-slate-800 bg-white p-2 rounded-xl border border-slate-200 text-xs">
                              {l}
                            </p>
                          ))}
                        </div>
                      </div>

                      {/* Paragraphs */}
                      <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wide">
                            {language === 'en' ? '4. Practice Paragraphs:' : '४. अभ्यास पैराग्राफ:'}
                          </span>
                          <span className="text-[10px] font-extrabold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                            {parsedBookResult.paragraphs?.length || 1} {language === 'en' ? 'paragraph' : 'पैराग्राफ'}
                          </span>
                        </div>
                        <div className="space-y-1.5 pt-1">
                          {(parsedBookResult.paragraphs?.length ? parsedBookResult.paragraphs : [parsedBookResult.paragraph || '']).map((p, i) => (
                            <p key={i} className="text-slate-700 bg-white p-2.5 rounded-xl border border-amber-150 leading-relaxed text-xs">
                              {p}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Accept and Save button */}
                    <button
                      type="button"
                      onClick={handleSaveCustomBookLessons}
                      className="w-full py-3 rounded-xl bg-emerald-600 text-white font-extrabold text-xs hover:bg-emerald-700 active:scale-98 transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        {language === 'en'
                          ? `Save All Extracted Units (${(parsedBookResult.words?.length || 1) + (parsedBookResult.twoWordPhrases?.length || 1) + (parsedBookResult.lines?.length || 1) + (parsedBookResult.paragraphs?.length || 1)} Items) to Practice`
                          : `सभी निकाली गई इकाइयाँ (${(parsedBookResult.words?.length || 1) + (parsedBookResult.twoWordPhrases?.length || 1) + (parsedBookResult.lines?.length || 1) + (parsedBookResult.paragraphs?.length || 1)} पाठ) अभ्यास में जोड़ें`}
                      </span>
                    </button>
                  </div>
                )}

                {/* Saved custom book chapters list */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    {language === 'en' ? 'Saved Custom Book Chapters' : 'सहेजे गए कस्टम बुक अध्याय'}
                  </h4>

                  {customBooksList.length === 0 ? (
                    <p className="text-slate-400 text-center py-6 text-xs italic">
                      {language === 'en'
                        ? 'No custom book chapters uploaded yet.'
                        : 'कोई भी कस्टम किताब अभी तक अपलोड नहीं की गई है।'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {/* Filter list into distinct chapter entries */}
                      {Array.from(new Set(customBooksList.map((i) => i.title))).map((chapterTitle) => {
                        const chapterItems = customBooksList.filter((i) => i.title === chapterTitle);
                        const wordItem = chapterItems.find((i) => i.mode === 'word');

                        return (
                          <div
                            key={chapterTitle}
                            className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-extrabold text-slate-900 truncate">
                                {chapterTitle}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                {chapterItems.length} {language === 'en' ? 'practice units added' : 'अभ्यास इकाइयाँ जोड़ी गईं'} ({wordItem?.grade || 'Custom Book'})
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    language === 'en'
                                      ? `Are you sure you want to delete "${chapterTitle}" custom lessons?`
                                      : `क्या आप सचमुच "${chapterTitle}" के सभी अभ्यास पाठों को हटाना चाहते हैं?`
                                  )
                                ) {
                                  // Delete all items with this title
                                  chapterItems.forEach((item) => handleDeleteCustomItem(item.id));
                                }
                              }}
                              className="text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-150 rounded-lg px-2 py-1 transition cursor-pointer"
                            >
                              {language === 'en' ? 'Delete' : 'हटाएं'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
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

                {/* Daily Reminders & Progress Notifications Toggle */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="pr-3">
                    <span className="block text-xs font-bold text-slate-800">
                      {language === 'en'
                        ? 'Daily Challenge & Progress Reminders'
                        : 'दैनिक चुनौती और प्रगति अनुस्मारक'}
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      {language === 'en'
                        ? 'Enables gentle notifications to keep up reading streaks and progress milestones on Android.'
                        : 'पठन निरंतरता और प्रगति के मील के पत्थर बनाए रखने के लिए सूचनाएं सक्षम करें।'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!notificationsOn) {
                        const success = await ensureNotificationsGranted(language);
                        if (success) setNotificationsOn(true);
                      } else {
                        setNotificationsOn(false);
                      }
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      notificationsOn ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                    title={notificationsOn ? 'Turn notifications off' : 'Turn notifications on'}
                  >
                    <span
                      className={`block w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                        notificationsOn ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Smart Speech Capture Engine Diagnostics (Requirements 56, 57, 58) */}
                <SpeechCaptureDiagnosticView
                  language={language}
                  profile={profile}
                />

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
