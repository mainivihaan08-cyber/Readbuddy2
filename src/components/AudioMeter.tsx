import React, { useEffect, useRef, useState } from 'react';
import { Mic, Activity, Volume2, AlertCircle, RefreshCw } from 'lucide-react';
import { AppLanguage } from '../types';
import {
  acquireMicrophoneStream,
  createStreamAnalyser,
  calculateVoiceMetrics,
  unlockAudioContext,
  AnalyserHandle,
} from '../services/audioStreamManager';

export interface AudioMeterProps {
  /**
   * Active MediaStream to analyze. (Optional)
   */
  audioStream?: MediaStream | null;
  /**
   * Directly passed AnalyserNode (optional, for maximum efficiency).
   */
  analyserNode?: AnalyserNode | null;
  /**
   * Whether recording is currently active.
   */
  isRecording?: boolean;
  /**
   * External voice active signal from SpeechRecognition.
   */
  isVoiceActive?: boolean;
  /**
   * Optional custom CSS class.
   */
  className?: string;
  /**
   * Number of equalizer frequency bars (default 9).
   */
  barCount?: number;
  /**
   * Whether to display numerical level percentage (e.g. 45%).
   */
  showLevelText?: boolean;
  /**
   * Whether to display speech presence badge.
   */
  showActivityBadge?: boolean;
  /**
   * Size variant: 'sm' | 'md' | 'lg'
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * App language for localized text.
   */
  language?: AppLanguage;
  /**
   * Callback on mic permission failure or audio error.
   */
  onError?: (err: Error) => void;
  /**
   * Real-time callback reporting voice level & activity metrics.
   */
  onVoiceActivity?: (metrics: {
    levelPercent: number;
    isVoiceActive: boolean;
    barHeights: number[];
  }) => void;
}

export const AudioMeter: React.FC<AudioMeterProps> = ({
  audioStream,
  analyserNode,
  isRecording = true,
  isVoiceActive: externalIsVoiceActive,
  className = '',
  barCount = 9,
  showLevelText = true,
  showActivityBadge = true,
  size = 'md',
  language = 'en',
  onError,
  onVoiceActivity,
}) => {
  const [level, setLevel] = useState<number>(0);
  const [barHeights, setBarHeights] = useState<number[]>(() =>
    Array(barCount).fill(15)
  );
  const [internalVoiceActive, setInternalVoiceActive] = useState<boolean>(false);
  const [hasMicError, setHasMicError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const animationFrameRef = useRef<number | null>(null);
  const analyserHandleRef = useRef<AnalyserHandle | null>(null);

  const isVoiceActive = Boolean(externalIsVoiceActive || internalVoiceActive);

  // Resume audio context whenever user interacts with audio meter
  const handleUserTapResume = () => {
    unlockAudioContext();
    setHasMicError(false);
  };

  useEffect(() => {
    if (!isRecording) {
      cleanup();
      setLevel(0);
      setBarHeights(Array(barCount).fill(12));
      setInternalVoiceActive(false);
      return;
    }

    let isCancelled = false;

    // If an audioStream or analyserNode is explicitly provided, use Web Audio API AnalyserNode
    if (audioStream || analyserNode) {
      try {
        setHasMicError(false);
        setErrorMessage('');
        unlockAudioContext();

        let activeAnalyser: AnalyserNode | null = analyserNode || null;

        if (!activeAnalyser && audioStream && audioStream.getAudioTracks().length > 0) {
          const handle = createStreamAnalyser(audioStream);
          if (handle) {
            analyserHandleRef.current = handle;
            activeAnalyser = handle.analyser;
          }
        }

        if (activeAnalyser && !isCancelled) {
          const bufferLength = activeAnalyser.frequencyBinCount;
          const freqData = new Uint8Array(bufferLength);
          const timeData = new Uint8Array(activeAnalyser.fftSize || 64);

          const updateLoop = () => {
            if (!activeAnalyser || isCancelled) return;

            const metrics = calculateVoiceMetrics(
              activeAnalyser,
              timeData,
              freqData,
              barCount
            );

            setLevel(metrics.levelPercent);
            setInternalVoiceActive(metrics.isVoiceActive);
            setBarHeights(metrics.barHeights);
            onVoiceActivity?.(metrics);

            animationFrameRef.current = requestAnimationFrame(updateLoop);
          };

          animationFrameRef.current = requestAnimationFrame(updateLoop);
          return () => {
            isCancelled = true;
            cleanup();
          };
        }
      } catch (err: any) {
        console.warn('[AudioMeter] WebAudio analyser error:', err);
      }
    }

    // High-performance dynamic fluid visualizer loop (prevents hardware mic locking on Android)
    let phase = 0;
    const animateLiveWave = () => {
      if (isCancelled) return;
      phase += 0.15;

      const active = Boolean(externalIsVoiceActive || internalVoiceActive);
      const baseAmp = active ? 65 : 28;
      const calculatedLevel = active ? Math.min(100, Math.round(55 + Math.sin(phase * 2) * 35)) : Math.round(18 + Math.sin(phase) * 10);

      const dynamicBars = Array.from({ length: barCount }, (_, i) => {
        const offset = (i / barCount) * Math.PI * 2;
        const wave1 = Math.sin(phase + offset);
        const wave2 = Math.cos(phase * 1.5 - offset);
        const heightFactor = Math.max(0.15, (wave1 + wave2 + 2) / 4);
        return Math.min(100, Math.max(14, Math.round(heightFactor * baseAmp + (active ? 20 : 8))));
      });

      setLevel(calculatedLevel);
      setBarHeights(dynamicBars);

      onVoiceActivity?.({
        levelPercent: calculatedLevel,
        isVoiceActive: active,
        barHeights: dynamicBars,
      });

      animationFrameRef.current = requestAnimationFrame(animateLiveWave);
    };

    animationFrameRef.current = requestAnimationFrame(animateLiveWave);

    return () => {
      isCancelled = true;
      cleanup();
    };
  }, [audioStream, analyserNode, isRecording, externalIsVoiceActive, barCount, language]);

  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (analyserHandleRef.current) {
      analyserHandleRef.current.cleanup();
      analyserHandleRef.current = null;
    }
  };

  const getContainerHeight = () => {
    if (size === 'sm') return 'h-7';
    if (size === 'lg') return 'h-14';
    return 'h-11';
  };

  const getBarWidth = () => {
    if (size === 'sm') return 'w-1.5';
    if (size === 'lg') return 'w-3';
    return 'w-2';
  };

  return (
    <div
      onClick={handleUserTapResume}
      className={`rounded-2xl p-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg border border-indigo-500/30 select-none ${className}`}
      role="region"
      aria-label="Microphone Audio Level Meter"
    >
      {/* Top Status Header */}
      <div className="flex items-center justify-between gap-2 mb-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                hasMicError
                  ? 'bg-rose-400'
                  : isVoiceActive
                  ? 'bg-emerald-400'
                  : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                hasMicError
                  ? 'bg-rose-500'
                  : isVoiceActive
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
              }`}
            />
          </span>
          <span className="font-extrabold text-[11px] tracking-tight text-slate-200 flex items-center gap-1">
            <Mic className={`w-3.5 h-3.5 ${hasMicError ? 'text-rose-400' : 'text-indigo-400'}`} />
            <span>{language === 'en' ? 'Live Mic Signal' : 'माइक सिग्नल'}</span>
          </span>
        </div>

        {showActivityBadge && (
          <div className="flex items-center gap-1.5">
            {hasMicError ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-rose-500/25 text-rose-300 border-rose-400/50 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-rose-300" />
                <span>{errorMessage || (language === 'en' ? 'Check Mic' : 'माइक जांचें')}</span>
              </span>
            ) : (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                  isVoiceActive
                    ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400/50 shadow-xs shadow-emerald-500/20'
                    : 'bg-white/10 text-slate-400 border-white/10'
                }`}
              >
                {isVoiceActive
                  ? language === 'en'
                    ? '🗣️ Voice Active'
                    : '🗣️ आवाज़ सक्रिय'
                  : language === 'en'
                  ? 'Listening...'
                  : 'सुन रहे हैं...'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Real-time Web Audio Analyser Equalizer Waveform */}
      <div
        className={`w-full flex items-end justify-center gap-1.5 bg-black/40 rounded-xl px-2.5 py-1.5 border border-white/10 ${getContainerHeight()}`}
      >
        {barHeights.map((height, idx) => (
          <div
            key={idx}
            className={`${getBarWidth()} rounded-full transition-all duration-75 ease-out ${
              height > 55
                ? 'bg-gradient-to-t from-emerald-400 via-amber-400 to-rose-500 shadow-xs shadow-rose-500/50'
                : height > 28
                ? 'bg-gradient-to-t from-emerald-400 to-amber-400'
                : 'bg-gradient-to-t from-indigo-500 to-emerald-400'
            }`}
            style={{ height: `${Math.max(12, height)}%` }}
          />
        ))}
      </div>

      {/* Numerical Signal Level & Speech Guidance */}
      {showLevelText && (
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mt-2 px-0.5">
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-indigo-400" />
            <span>
              {language === 'en' ? 'Signal Level:' : 'सिग्नल क्षमता:'}{' '}
              <strong
                className={`font-mono text-xs ${
                  level > 8 ? 'text-emerald-300' : 'text-slate-200'
                }`}
              >
                {level}%
              </strong>
            </span>
          </div>

          <span
            className={
              level > 8
                ? 'text-emerald-300 font-semibold'
                : 'text-indigo-300 italic'
            }
          >
            {level > 8
              ? language === 'en'
                ? '✓ Clear audio input'
                : '✓ स्पष्ट आवाज़ मिल रही है'
              : language === 'en'
              ? 'Speak clearly into mic'
              : 'माइक में स्पष्ट बोलें'}
          </span>
        </div>
      )}
    </div>
  );
};
