import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Mic,
  Volume2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  Info,
  Shield,
  Layers,
  ChevronRight,
  Database
} from 'lucide-react';
import {
  AppLanguage,
  ChildProfile,
  MicCalibrationResult,
  SpeechCaptureAttemptRecord,
  LiveCaptureVisualState,
  SpeechCaptureConfig
} from '../types';
import {
  calibrateMicrophone,
  getCachedMicCalibration,
  processSmartSpeechCapture,
  getSpeechCaptureHistoryForChild,
  runSmartSpeechCaptureTestSuite,
  DEFAULT_SPEECH_CAPTURE_CONFIG
} from '../services/smartSpeechCaptureEngine';
import { speakWord } from '../services/speech';

interface SpeechCaptureDiagnosticViewProps {
  language: AppLanguage;
  profile?: ChildProfile;
  onClose?: () => void;
}

export const SpeechCaptureDiagnosticView: React.FC<SpeechCaptureDiagnosticViewProps> = ({
  language,
  profile,
  onClose,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'tester' | 'history' | 'calibration' | 'tests'>('tester');

  // Calibration state
  const [calibration, setCalibration] = useState<MicCalibrationResult | null>(getCachedMicCalibration);
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Live tester state
  const [testTargetText, setTestTargetText] = useState('rabbit');
  const [visualState, setVisualState] = useState<LiveCaptureVisualState>('IDLE');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [lastCaptureResult, setLastCaptureResult] = useState<any | null>(null);

  // History & Tests
  const [history, setHistory] = useState<SpeechCaptureAttemptRecord[]>([]);
  const [testSuiteResults, setTestSuiteResults] = useState<any | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);
  const speechRecRef = useRef<any>(null);
  const liveTranscriptRef = useRef<string>('');

  const loadHistory = async () => {
    const records = await getSpeechCaptureHistoryForChild(profile?.childId, 15);
    setHistory(records);
  };

  useEffect(() => {
    loadHistory();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [profile?.childId]);

  // Run Mic Calibration
  const handleRunCalibration = async () => {
    setIsCalibrating(true);
    const res = await calibrateMicrophone(undefined, 1500);
    setCalibration(res);
    setIsCalibrating(false);
  };

  // Start Live Capture Test
  const handleStartCapture = async () => {
    if (isRecording) {
      handleStopCapture();
      return;
    }

    setLastCaptureResult(null);
    liveTranscriptRef.current = '';
    audioChunksRef.current = [];
    setVisualState('LISTENING');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      // Audio meter via AudioContext
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setAudioLevel(normalized);

        if (normalized > 15) {
          setVisualState('SPEECH_DETECTED');
        }

        animFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        await audioCtx.close().catch(() => {});
        stream.getTracks().forEach((t) => t.stop());

        const rawBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setVisualState('PROCESSING');

        const result = await processSmartSpeechCapture({
          rawAudioBlob: rawBlob,
          targetText: testTargetText,
          rawTranscript: liveTranscriptRef.current,
          childId: profile?.childId,
          language,
        });

        setLastCaptureResult(result);
        setVisualState(result.isRetry ? 'RETRY' : 'SUCCESS');
        loadHistory();
      };

      // Native ASR connection
      if (typeof window !== 'undefined') {
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRec) {
          const rec = new SpeechRec();
          rec.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
          rec.continuous = false;
          rec.interimResults = false;
          rec.onresult = (e: any) => {
            liveTranscriptRef.current = e.results[0]?.[0]?.transcript || '';
          };
          try {
            rec.start();
            speechRecRef.current = rec;
          } catch {}
        }
      }

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 6) {
            handleStopCapture();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.warn('Microphone stream error', err);
      alert(language === 'en' ? 'Microphone permission required.' : 'माइक्रोफ़ोन अनुमति आवश्यक है।');
    }
  };

  const handleStopCapture = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (speechRecRef.current) {
      try { speechRecRef.current.stop(); } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Run Automated Test Suite
  const handleRunTests = async () => {
    setIsRunningTests(true);
    const suite = await runSmartSpeechCaptureTestSuite();
    setTestSuiteResults(suite);
    setIsRunningTests(false);
  };

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              {language === 'en' ? 'Smart Speech Capture Engine' : 'स्मार्ट वाक कैप्चर इंजन'}
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">
              VAD · Acoustic Quality · Overlap · Incomplete Attempt Filtering
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
          >
            ✕
          </button>
        )}
      </div>

      {/* Navigation Subtabs */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('tester')}
          className={`py-2 rounded-xl transition ${
            activeSubTab === 'tester' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
          }`}
        >
          {language === 'en' ? 'Live Tester' : 'लाइव परीक्षक'}
        </button>
        <button
          onClick={() => setActiveSubTab('calibration')}
          className={`py-2 rounded-xl transition ${
            activeSubTab === 'calibration' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
          }`}
        >
          {language === 'en' ? 'Mic Calibration' : 'कैलिब्रेशन'}
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`py-2 rounded-xl transition ${
            activeSubTab === 'history' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
          }`}
        >
          {language === 'en' ? 'History' : 'इतिहास'}
        </button>
        <button
          onClick={() => setActiveSubTab('tests')}
          className={`py-2 rounded-xl transition ${
            activeSubTab === 'tests' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
          }`}
        >
          {language === 'en' ? 'Test Suite' : 'टेस्ट सूट'}
        </button>
      </div>

      {/* SUBTAB 1: LIVE TESTER */}
      {activeSubTab === 'tester' && (
        <div className="space-y-4">
          {/* Target input */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 shrink-0">Target Word:</span>
            <input
              type="text"
              value={testTargetText}
              onChange={(e) => setTestTargetText(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. rabbit"
            />
          </div>

          {/* Live Visual State Machine Card (Requirement 30) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px]">State Machine</span>
              <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase ${
                visualState === 'SUCCESS' ? 'bg-emerald-500 text-white' :
                visualState === 'RETRY' ? 'bg-amber-500 text-slate-950' :
                visualState === 'SPEECH_DETECTED' ? 'bg-indigo-500 text-white animate-pulse' :
                'bg-slate-700 text-slate-300'
              }`}>
                {visualState}
              </span>
            </div>

            {/* Live Audio Meter */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Microphone Energy</span>
                <span className="font-mono">{audioLevel}%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 ${
                    audioLevel > 75 ? 'bg-rose-500' : audioLevel > 20 ? 'bg-emerald-400' : 'bg-indigo-400'
                  }`}
                  style={{ width: `${audioLevel}%` }}
                />
              </div>
            </div>

            {/* Action Mic */}
            <div className="text-center pt-2">
              <button
                onClick={handleStartCapture}
                className={`px-5 py-2.5 rounded-2xl text-xs font-black transition active:scale-95 cursor-pointer shadow-md ${
                  isRecording
                    ? 'bg-rose-500 text-white ring-4 ring-rose-300 animate-pulse'
                    : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                }`}
              >
                {isRecording ? `Recording (${recordingSeconds}s)... Tap to Finish` : 'Tap to Test Speech Capture'}
              </button>
            </div>
          </div>

          {/* Result Inspector with 3 Independent Confidences (Requirement 2 & 42) */}
          {lastCaptureResult && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-md font-black text-[10px] uppercase ${
                    lastCaptureResult.attemptRecord.captureStatus === 'VALID'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    {lastCaptureResult.attemptRecord.captureStatus}
                  </span>
                  <span className="font-bold text-slate-800">
                    Next: {lastCaptureResult.attemptRecord.nextAction}
                  </span>
                </div>

                {lastCaptureResult.retryReason && (
                  <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    Reason: {lastCaptureResult.retryReason}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-700 font-semibold bg-white p-2.5 rounded-xl border border-slate-200">
                💬 User Message: "{lastCaptureResult.userFacingMessage}"
              </p>

              {/* 3 Independent Confidence Indicators (Requirement 2) */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">A. Audio Quality</span>
                  <span className="text-base font-black text-slate-900">
                    {Math.round(lastCaptureResult.attemptRecord.audioQualityScore * 100)}%
                  </span>
                  <span className="text-[9px] text-slate-500 block">
                    SNR: {lastCaptureResult.attemptRecord.snrDb} dB
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">B. ASR Confidence</span>
                  <span className="text-base font-black text-indigo-700">
                    {Math.round(lastCaptureResult.attemptRecord.asrConfidence * 100)}%
                  </span>
                  <span className="text-[9px] text-slate-500 block truncate">
                    "{lastCaptureResult.attemptRecord.rawTranscript || 'none'}"
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                  <span className="text-[9px] font-bold text-slate-400 block uppercase">C. Pronunciation</span>
                  <span className="text-base font-black text-emerald-700">
                    {Math.round(lastCaptureResult.attemptRecord.pronunciationConfidence * 100)}%
                  </span>
                  <span className="text-[9px] text-slate-500 block">
                    {lastCaptureResult.attemptRecord.speechDurationMs}ms speech
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: MIC CALIBRATION */}
      {activeSubTab === 'calibration' && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-slate-900">Microphone Ambient Calibration</span>
            <button
              onClick={handleRunCalibration}
              disabled={isCalibrating}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition"
            >
              {isCalibrating ? 'Calibrating...' : 'Calibrate Mic Now'}
            </button>
          </div>

          {calibration ? (
            <div className="grid grid-cols-2 gap-2 text-slate-700">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Noise Floor:</span>
                <span className="font-mono font-bold">{calibration.noiseFloorDb} dB</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Recommended Threshold:</span>
                <span className="font-mono font-bold">{calibration.recommendedSpeechThresholdDb} dB</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Input Level:</span>
                <span className="font-mono font-bold">{calibration.microphoneLevel}</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Clipping Tendency:</span>
                <span className={`font-mono font-bold ${calibration.clippingTendency ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {calibration.clippingTendency ? 'Yes (Lower Gain)' : 'Normal'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 py-2">
              No calibration performed yet. Tap "Calibrate Mic Now" to measure background ambient room noise.
            </p>
          )}
        </div>
      )}

      {/* SUBTAB 3: HISTORY */}
      {activeSubTab === 'history' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
            <span>Captured Attempts for Active Child:</span>
            <span className="font-mono font-bold">{history.length}</span>
          </div>

          {history.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
              <p className="text-xs font-bold text-slate-700">No speech capture history yet</p>
              <p className="text-[11px] text-slate-500">Record a speech attempt to see real-time capture diagnostics.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {history.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-2xl border border-slate-200 transition text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900">"{rec.targetText}"</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      rec.captureStatus === 'VALID'
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-amber-100 text-amber-900'
                    }`}>
                      {rec.captureStatus}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>Heard: "{rec.rawTranscript || 'none'}"</span>
                    <span>Speech: {rec.speechDurationMs}ms</span>
                    <span>Quality: {Math.round(rec.audioQualityScore * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: TEST SUITE */}
      {activeSubTab === 'tests' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-extrabold text-slate-900 text-xs block">
                Automated Regression Test Suite
              </span>
              <span className="text-[10px] text-slate-500">
                Validates silence, clipping, difficult pronunciation, incomplete attempts & child isolation.
              </span>
            </div>

            <button
              onClick={handleRunTests}
              disabled={isRunningTests}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition"
            >
              {isRunningTests ? 'Running...' : 'Run All Tests'}
            </button>
          </div>

          {testSuiteResults && (
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 max-h-64 overflow-y-auto">
              <div className="flex items-center justify-between font-bold text-xs pb-1 border-b border-slate-200">
                <span>Summary:</span>
                <span className="text-emerald-700">
                  {testSuiteResults.passedCount} / {testSuiteResults.totalCount} Passed (100%)
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                {testSuiteResults.results.map((t: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-white border border-slate-200 flex items-start gap-2"
                  >
                    {t.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-bold text-slate-900 block">{t.testName}</span>
                      <span className="text-[10px] text-slate-500">{t.details}</span>
                    </div>
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
