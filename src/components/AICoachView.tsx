import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  Bot,
  Volume2,
  FileText,
  RotateCcw,
  Play,
  Pause,
  Copy,
  Check,
  Send,
  Award,
  ChevronDown,
  ChevronUp,
  Download,
  AlertCircle,
  HelpCircle,
  MessageSquare,
  BookOpen,
  History
} from 'lucide-react';
import { AppLanguage, ChildProfile, SavedRecording, SpeechCoachReportItem } from '../types';
import { LiveVoiceSession } from '../services/liveAudio';
import { transcribeAudioWithGemini, generateSpeechCoachReport } from '../services/transcription';
import { getSavedRecordings, saveSpeechCoachReport, getSpeechCoachReports, maskMobileNumber } from '../services/storage';
import { PARAGRAPHS } from '../data/paragraphs';
import { ensureMicrophoneGranted } from '../utils/permissionManager';

interface AICoachViewProps {
  language: AppLanguage;
  profile: ChildProfile;
}

export const AICoachView: React.FC<AICoachViewProps> = ({ language, profile }) => {
  const [activeSubTab, setActiveSubTab] = useState<'transcribe-coach' | 'live-voice'>('transcribe-coach');

  // --- SUB-TAB 1: TRANSCRIBE & 31-STEP SPEECH COACH ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Selected reading passage
  const [selectedPassageId, setSelectedPassageId] = useState<string>('en-1');
  const [customPassageText, setCustomPassageText] = useState<string>('');

  // Transcription state
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState<string>('');

  // 31-step report state
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportMarkdown, setReportMarkdown] = useState<string>('');
  const [reportError, setReportError] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);

  // Past recordings & reports for active child profile
  const [pastRecordings, setPastRecordings] = useState<SavedRecording[]>([]);
  const [pastReports, setPastReports] = useState<SpeechCoachReportItem[]>([]);
  const [selectedPastReport, setSelectedPastReport] = useState<SpeechCoachReportItem | null>(null);
  const [activeRecordingId, setActiveRecordingId] = useState<string | null>(null);

  // --- SUB-TAB 2: GEMINI 3.8 LIVE VOICE CONVERSATION ---
  const [liveStatus, setLiveStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'speaking' | 'listening'>('disconnected');
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveMicVol, setLiveMicVol] = useState(0);
  const [liveAiVol, setLiveAiVol] = useState(0);
  const [liveMessages, setLiveMessages] = useState<Array<{ sender: 'user' | 'buddy'; text: string; time: string }>>([
    {
      sender: 'buddy',
      text: language === 'en'
        ? "Hi! I'm Buddy, your real-time reading coach. Tap 'Start Voice Chat' and talk to me!"
        : "नमस्ते! मैं बडी हूँ, आपका लाइव रीडिंग कोच। 'Start Voice Chat' दबाएं और मुझसे बात करें!",
      time: 'Just now',
    },
  ]);
  const liveSessionRef = useRef<LiveVoiceSession | null>(null);

  useEffect(() => {
    getSavedRecordings(profile.childId).then((recs) => {
      setPastRecordings(recs);
    });
    const reports = getSpeechCoachReports(profile.childId);
    setPastReports(reports);

    return () => {
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
        liveSessionRef.current = null;
      }
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
    };
  }, [profile.childId]);

  // Set default selected passage text
  useEffect(() => {
    const p = PARAGRAPHS.find((item) => item.id === selectedPassageId);
    if (p) {
      setCustomPassageText(p.text);
    }
  }, [selectedPassageId]);

  // Audio recording handlers
  const startRecording = async () => {
    try {
      setReportError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
        setRecordedAudioUrl(URL.createObjectURL(blob));
        setActiveRecordingId(`rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordSeconds(0);

      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      setReportError(err.message || 'Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
    }
  };

  const handleTranscribeOnly = async () => {
    if (!recordedBlob) return;
    setIsTranscribing(true);
    setReportError(null);

    try {
      const text = await transcribeAudioWithGemini(recordedBlob);
      setTranscribedText(text);
    } catch (err: any) {
      setReportError(err.message || 'Transcription failed');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    setReportError(null);

    try {
      let currentTranscript = transcribedText;
      // If not yet transcribed and audio exists, transcribe first
      if (!currentTranscript && recordedBlob) {
        setIsTranscribing(true);
        try {
          currentTranscript = await transcribeAudioWithGemini(recordedBlob);
          setTranscribedText(currentTranscript);
        } catch {}
        setIsTranscribing(false);
      }

      const report = await generateSpeechCoachReport({
        audioBlob: recordedBlob,
        transcript: currentTranscript,
        targetText: customPassageText,
        childName: profile.name,
        grade: `Class 6 (Streak: ${profile.streak} days, Level: ${profile.levelTitle})`,
      });

      setReportMarkdown(report);

      // Permanently link report with childId, recordingId, sessionId in storage
      saveSpeechCoachReport({
        targetText: customPassageText,
        transcribedText: currentTranscript,
        reportMarkdown: report,
        childId: profile.childId,
        recordingId: activeRecordingId || `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sessionId: `session-${Date.now()}`,
      });
      setPastReports(getSpeechCoachReports(profile.childId));
    } catch (err: any) {
      setReportError(err.message || 'Failed to generate report');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleLoadPastRecording = (rec: SavedRecording) => {
    setActiveRecordingId(rec.id);
    if (rec.audioBlob) {
      setRecordedBlob(rec.audioBlob);
      if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(URL.createObjectURL(rec.audioBlob));
      setTranscribedText(rec.heardTranscript || '');
      setCustomPassageText(rec.expectedText || '');
    }
  };

  const copyReportToClipboard = () => {
    if (reportMarkdown && navigator.clipboard) {
      navigator.clipboard.writeText(reportMarkdown);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2000);
    }
  };

  // --- LIVE VOICE SESSION HANDLERS ---
  const handleToggleLiveSession = async () => {
    if (liveStatus !== 'disconnected') {
      if (liveSessionRef.current) {
        liveSessionRef.current.stop();
        liveSessionRef.current = null;
      }
      setLiveStatus('disconnected');
      return;
    }

    // Ensure mic permission and device availability
    const granted = await ensureMicrophoneGranted(language);
    if (!granted) {
      return;
    }

    setLiveError(null);
    const session = new LiveVoiceSession({
      onStatusChange: (status) => setLiveStatus(status),
      onTranscript: (text) => {
        setLiveMessages((prev) => [
          ...prev,
          { sender: 'buddy', text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        ]);
      },
      onError: (err) => {
        setLiveError(err);
        setLiveStatus('disconnected');
      },
      onVolumeChange: (mic, ai) => {
        setLiveMicVol(mic);
        setLiveAiVol(ai);
      },
    });

    liveSessionRef.current = session;
    try {
      await session.start();
    } catch (e: any) {
      setLiveError(e.message || 'Could not connect to Live API');
      setLiveStatus('disconnected');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-28 space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-cyan-600 rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-200" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-100">
              AI Voice & Speech Studio
            </span>
          </div>
          <span className="text-[10px] font-semibold bg-white/20 px-2 py-0.5 rounded-full">
            CBSE Class 6
          </span>
        </div>
        <h2 className="text-xl font-black tracking-tight text-white mb-1">
          {language === 'en' ? 'AI Speech & Voice Coach' : 'एआई वाक एवं स्वर कोच'}
        </h2>
        <p className="text-xs text-indigo-100 leading-relaxed">
          {language === 'en'
            ? 'Transcribe your reading, receive evidence-based 31-step diagnostic reports, and have real-time voice conversations.'
            : 'अपने वाचन को ट्रांसक्राइब करें, 31-चरणीय वाक रिपोर्ट प्राप्त करें और रीयल-टाइम आवाज़ में बात करें।'}
        </p>

        {/* Sub-Tabs: Transcribe & 31-Step Coach vs Live Voice Conversation */}
        <div className="grid grid-cols-2 gap-2 mt-4 bg-black/20 p-1 rounded-2xl">
          <button
            onClick={() => setActiveSubTab('transcribe-coach')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSubTab === 'transcribe-coach'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Transcribe & Coach' : 'ट्रांसक्राइब व कोच'}</span>
          </button>
          <button
            onClick={() => setActiveSubTab('live-voice')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSubTab === 'live-voice'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Live Voice Buddy' : 'लाइव वॉइस बडी'}</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: TRANSCRIBE WITH GEMINI 3.5 & 31-STEP COACH REPORT */}
      {/* ======================================================== */}
      {activeSubTab === 'transcribe-coach' && (
        <div className="space-y-4">
          {/* Target Passage Selector */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>{language === 'en' ? 'Target Reading Passage:' : 'अभ्यास पाठ:'}</span>
              </label>
              <select
                value={selectedPassageId}
                onChange={(e) => setSelectedPassageId(e.target.value)}
                className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200/70 rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
              >
                {PARAGRAPHS.slice(0, 6).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-serif leading-relaxed italic">
              "{customPassageText}"
            </p>
          </div>

          {/* Microphone Recording Zone */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs text-center space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                {language === 'en' ? 'Step 1: Record Your Speech' : 'चरण १: अपनी आवाज़ रिकॉर्ड करें'}
              </span>
              <p className="text-xs text-slate-600">
                {language === 'en'
                  ? 'Speak clearly into your microphone, then transcribe with gemini-3.5-transcribe.'
                  : 'माइक्रोफ़ोन में स्पष्ट बोलें, फिर gemini-3.5-transcribe से ट्रांसक्राइब करें।'}
              </p>
            </div>

            {/* Big Mic Button */}
            <div className="flex flex-col items-center justify-center py-2">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="w-18 h-18 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 active:scale-95 transition cursor-pointer"
                  title="Start Recording"
                >
                  <Mic className="w-8 h-8" />
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="w-18 h-18 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-200 active:scale-95 transition animate-pulse cursor-pointer"
                  title="Stop Recording"
                >
                  <MicOff className="w-8 h-8" />
                </button>
              )}

              <div className="mt-2 font-mono text-xs font-bold text-slate-600">
                {isRecording ? (
                  <span className="text-rose-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                    Recording: {recordSeconds}s
                  </span>
                ) : recordedBlob ? (
                  <span className="text-emerald-600 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    Audio Ready ({recordSeconds || Math.round(recordedBlob.size / 16000)}s)
                  </span>
                ) : (
                  <span>Ready to Record</span>
                )}
              </div>
            </div>

            {/* Audio Playback if recorded */}
            {recordedAudioUrl && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center">
                <audio controls src={recordedAudioUrl} className="h-8 w-full max-w-xs" />
              </div>
            )}

            {/* Quick-load from saved ReadBuddy practice recordings */}
            {pastRecordings.length > 0 && !recordedBlob && (
              <div className="pt-2 border-t border-slate-100 text-left">
                <span className="text-[11px] font-bold text-slate-500 block mb-1">
                  Or analyze previous recorded practice:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {pastRecordings.slice(0, 3).map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleLoadPastRecording(r)}
                      className="text-[11px] font-semibold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 px-2 py-1 rounded-lg border border-slate-200 transition"
                    >
                      {r.paragraphTitle} ({r.accuracy}% Clarity)
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons: Transcribe & Deep Coach Report */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={handleTranscribeOnly}
                disabled={!recordedBlob || isTranscribing}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  !recordedBlob || isTranscribing
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>
                  {isTranscribing ? 'Transcribing...' : 'Transcribe (gemini-3.5)'}
                </span>
              </button>

              <button
                onClick={handleGenerateReport}
                disabled={isGeneratingReport}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  isGeneratingReport
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {isGeneratingReport ? 'Analyzing...' : 'Generate 31-Step Report'}
                </span>
              </button>
            </div>
          </div>

          {/* Transcribed Text Box */}
          {transcribedText && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Verbatim Audio Transcript (gemini-3.5-transcribe):</span>
                </span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold border border-emerald-200">
                  Accurate
                </span>
              </div>
              <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono leading-relaxed">
                "{transcribedText}"
              </p>
            </div>
          )}

          {/* Error Message if any */}
          {reportError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{reportError}</span>
            </div>
          )}

          {/* 31-STEP EVIDENCE-BASED SPEECH REPORT VIEWER */}
          {reportMarkdown && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-md space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="text-sm font-black text-slate-900">
                      31-Step Evidence-Based Speech Report
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      ReadBuddy Advanced AI Speech & Voice Coach
                    </p>
                  </div>
                </div>

                <button
                  onClick={copyReportToClipboard}
                  className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition"
                  title="Copy Full Report"
                >
                  {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedReport ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              {/* Rendered 31-step report content */}
              <div className="prose prose-xs max-w-none text-slate-700 overflow-x-auto text-[11px] leading-relaxed max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
                <div className="whitespace-pre-wrap font-sans space-y-2">
                  {reportMarkdown}
                </div>
              </div>
            </div>
          )}

          {/* Past Saved Reports for this Child Profile */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                <History className="w-4 h-4 text-indigo-600" />
                <span>
                  {language === 'en' ? 'Recent Reports for ' : 'पूर्व रिपोर्ट: '}
                  <strong>{profile.name}</strong>
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                {pastReports.length} {pastReports.length === 1 ? 'Report' : 'Reports'}
              </span>
            </div>

            {pastReports.length === 0 ? (
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
                {pastReports.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-2xl border border-slate-200/70 transition flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-extrabold text-slate-900 block truncate">
                        {item.targetText ? `"${item.targetText.slice(0, 45)}..."` : 'Practice Session Report'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {item.dateFormatted} • {item.transcribedText ? `${item.transcribedText.split(' ').length} words` : 'Report Ready'}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setReportMarkdown(item.reportMarkdown);
                        setTranscribedText(item.transcribedText);
                        setCustomPassageText(item.targetText);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shrink-0 transition"
                    >
                      View Report
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: REAL-TIME VOICE CONVERSATION (GEMINI 3.8 LIVE)    */}
      {/* ======================================================== */}
      {activeSubTab === 'live-voice' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-md text-center space-y-5">
            {/* Live Status Orb */}
            <div className="relative flex items-center justify-center py-4">
              {/* Outer pulsing ring */}
              <div
                className={`w-32 h-32 rounded-full absolute transition-all duration-300 ${
                  liveStatus === 'speaking'
                    ? 'bg-cyan-400/30 scale-125 animate-pulse'
                    : liveStatus === 'listening'
                    ? 'bg-indigo-400/20 scale-110'
                    : 'bg-slate-100 scale-95'
                }`}
              />
              {/* Inner animated core */}
              <div
                className={`w-24 h-24 rounded-full flex flex-col items-center justify-center text-white shadow-xl transition-all duration-300 z-10 ${
                  liveStatus === 'speaking'
                    ? 'bg-gradient-to-tr from-cyan-500 to-indigo-600 scale-110 shadow-cyan-200'
                    : liveStatus === 'listening'
                    ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 shadow-indigo-200'
                    : liveStatus === 'connecting'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-slate-400'
                }`}
              >
                <Bot className="w-9 h-9" />
                <span className="text-[10px] font-bold tracking-wider mt-1 uppercase">
                  {liveStatus}
                </span>
              </div>
            </div>

            {/* Audio Wave visualization bars */}
            <div className="flex items-center justify-center gap-1 h-6">
              {[0.3, 0.6, 0.9, 0.5, 0.8, 0.4, 0.7, 0.3].map((height, i) => {
                const scale =
                  liveStatus === 'speaking'
                    ? Math.max(0.2, liveAiVol * height * 1.5)
                    : liveStatus === 'listening'
                    ? Math.max(0.2, liveMicVol * height * 1.5)
                    : 0.15;
                return (
                  <div
                    key={i}
                    style={{ transform: `scaleY(${scale})` }}
                    className={`w-1 rounded-full transition-transform duration-75 origin-bottom ${
                      liveStatus === 'speaking'
                        ? 'bg-cyan-500 h-6'
                        : liveStatus === 'listening'
                        ? 'bg-indigo-600 h-6'
                        : 'bg-slate-200 h-4'
                    }`}
                  />
                );
              })}
            </div>

            {/* Instruction description */}
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {liveStatus === 'speaking'
                  ? 'Buddy is Speaking...'
                  : liveStatus === 'listening'
                  ? 'Buddy is Listening to You'
                  : liveStatus === 'connecting'
                  ? 'Connecting to Live API...'
                  : 'Real-Time Voice with Buddy'}
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                {language === 'en'
                  ? 'Talk freely! Ask Buddy to practice a difficult word, read a sentence together, or share a story.'
                  : 'खुलकर बोलें! बडी से किसी कठिन शब्द का अभ्यास करने या साथ में पढ़ने के लिए कहें।'}
              </p>
            </div>

            {/* Live Connection Toggle Button */}
            <button
              onClick={handleToggleLiveSession}
              className={`w-full py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition active:scale-98 cursor-pointer ${
                liveStatus === 'disconnected'
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200'
              }`}
            >
              {liveStatus === 'disconnected' ? (
                <>
                  <Mic className="w-4 h-4" />
                  <span>Start Live Voice Chat (gemini-3.8-live)</span>
                </>
              ) : (
                <>
                  <MicOff className="w-4 h-4" />
                  <span>End Voice Conversation</span>
                </>
              )}
            </button>

            {liveError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{liveError}</span>
              </div>
            )}
          </div>

          {/* Quick Voice Starters */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              Suggested Conversation Starters:
            </span>
            <div className="flex flex-col gap-1.5">
              {[
                'Can you help me practice the "r" sound in red and green?',
                'Can you tell me a short story about the friendly mongoose?',
                'How do I pronounce the word "companion" correctly?',
              ].map((starter, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (liveSessionRef.current && liveStatus !== 'disconnected') {
                      setLiveMessages((prev) => [
                        ...prev,
                        { sender: 'user', text: starter, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
                      ]);
                      liveSessionRef.current.sendTextMessage(starter);
                    }
                  }}
                  className="text-left text-xs bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 p-2.5 rounded-xl border border-slate-100 transition flex items-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span>"{starter}"</span>
                </button>
              ))}
            </div>
          </div>

          {/* Transcript / Conversation History Log */}
          {liveMessages.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2.5">
              <span className="text-xs font-bold text-slate-700 block">
                Conversation History:
              </span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 font-sans text-xs scrollbar-thin">
                {liveMessages.map((m, i) => (
                  <div
                    key={i}
                    className={`p-2.5 rounded-xl ${
                      m.sender === 'buddy'
                        ? 'bg-indigo-50/80 text-indigo-950 border border-indigo-100'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5 font-semibold">
                      <span>{m.sender === 'buddy' ? 'Buddy' : profile.name}</span>
                      <span>{m.time}</span>
                    </div>
                    <p className="leading-relaxed">{m.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
