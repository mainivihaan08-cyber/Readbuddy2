import React, { useEffect, useRef, useState } from 'react';
import { Mic, Activity, Volume2 } from 'lucide-react';
import { AppLanguage } from '../types';

export interface AudioMeterProps {
  /**
   * Active MediaStream to analyze. If not provided and isRecording is true,
   * AudioMeter will request a lightweight microphone stream.
   */
  audioStream?: MediaStream | null;
  /**
   * Whether recording is currently active.
   */
  isRecording?: boolean;
  /**
   * Optional custom CSS class.
   */
  className?: string;
  /**
   * Number of equalizer frequency bars (default 7).
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
}

export const AudioMeter: React.FC<AudioMeterProps> = ({
  audioStream,
  isRecording = true,
  className = '',
  barCount = 7,
  showLevelText = true,
  showActivityBadge = true,
  size = 'md',
  language = 'en',
}) => {
  const [level, setLevel] = useState<number>(0);
  const [barHeights, setBarHeights] = useState<number[]>(() =>
    Array(barCount).fill(12)
  );
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const internalStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isRecording) {
      cleanupAudio();
      setLevel(0);
      setBarHeights(Array(barCount).fill(12));
      setIsVoiceActive(false);
      return;
    }

    let isCancelled = false;

    const initAudioAnalyser = async () => {
      try {
        const AudioCtxClass =
          window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtxClass) return;

        let streamToUse = audioStream;

        // If no stream passed, request one internally
        if (!streamToUse && navigator.mediaDevices?.getUserMedia) {
          try {
            const acquiredStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            });
            if (isCancelled) {
              acquiredStream.getTracks().forEach((t) => t.stop());
              return;
            }
            internalStreamRef.current = acquiredStream;
            streamToUse = acquiredStream;
          } catch (e) {
            console.warn('[AudioMeter] getUserMedia error:', e);
            return;
          }
        }

        if (!streamToUse || streamToUse.getAudioTracks().length === 0) return;

        const audioCtx = new AudioCtxClass();
        audioContextRef.current = audioCtx;

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = Math.max(32, Math.min(128, barCount * 8));
        analyser.smoothingTimeConstant = 0.6;
        analyserRef.current = analyser;

        const source = audioCtx.createMediaStreamSource(streamToUse);
        sourceRef.current = source;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateMeter = () => {
          if (!analyserRef.current || isCancelled) return;

          analyser.getByteFrequencyData(dataArray);

          // Calculate average energy / volume level
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const avg = sum / Math.max(1, bufferLength);
          const normalizedLevel = Math.min(100, Math.round((avg / 128) * 100));
          setLevel(normalizedLevel);
          setIsVoiceActive(normalizedLevel > 16);

          // Extract dynamic bar heights across frequency bands
          const step = Math.max(1, Math.floor(bufferLength / barCount));
          const newHeights: number[] = [];

          for (let b = 0; b < barCount; b++) {
            const index = Math.min(bufferLength - 1, b * step);
            const rawVal = dataArray[index] || 0;
            // Center bars are amplified slightly for a natural equalizer bell curve
            const centerBoost = 1 + (1 - Math.abs(b - (barCount - 1) / 2) / (barCount / 2)) * 0.4;
            const barHeight = Math.min(
              100,
              Math.max(10, Math.round((rawVal / 2.5) * centerBoost))
            );
            newHeights.push(barHeight);
          }

          setBarHeights(newHeights);
          animationFrameRef.current = requestAnimationFrame(updateMeter);
        };

        animationFrameRef.current = requestAnimationFrame(updateMeter);
      } catch (err) {
        console.warn('[AudioMeter] Initialization error:', err);
      }
    };

    initAudioAnalyser();

    return () => {
      isCancelled = true;
      cleanupAudio();
    };
  }, [audioStream, isRecording, barCount]);

  const cleanupAudio = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch {}
      sourceRef.current = null;
    }
    if (internalStreamRef.current) {
      internalStreamRef.current.getTracks().forEach((track) => track.stop());
      internalStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const getContainerHeight = () => {
    if (size === 'sm') return 'h-6';
    if (size === 'lg') return 'h-14';
    return 'h-10';
  };

  const getBarWidth = () => {
    if (size === 'sm') return 'w-1.5';
    if (size === 'lg') return 'w-3.5';
    return 'w-2.5';
  };

  return (
    <div
      className={`rounded-2xl p-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md border border-indigo-500/20 select-none ${className}`}
      role="region"
      aria-label="Microphone Audio Level Meter"
    >
      {/* Top Status Header */}
      <div className="flex items-center justify-between gap-2 mb-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isVoiceActive ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isVoiceActive ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </span>
          <span className="font-extrabold text-[11px] tracking-tight text-slate-200 flex items-center gap-1">
            <Mic className="w-3.5 h-3.5 text-indigo-400" />
            <span>{language === 'en' ? 'Live Mic Signal' : 'माइक सिग्नल'}</span>
          </span>
        </div>

        {showActivityBadge && (
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                isVoiceActive
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
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
          </div>
        )}
      </div>

      {/* Real-time Web Audio Analyser Equalizer Waveform */}
      <div
        className={`w-full flex items-end justify-center gap-1.5 bg-black/30 rounded-xl px-2 py-1.5 border border-white/5 ${getContainerHeight()}`}
      >
        {barHeights.map((height, idx) => (
          <div
            key={idx}
            className={`${getBarWidth()} rounded-full transition-all duration-75 ease-out ${
              height > 65
                ? 'bg-gradient-to-t from-emerald-400 via-amber-400 to-rose-500 shadow-xs shadow-rose-500/50'
                : height > 35
                ? 'bg-gradient-to-t from-emerald-400 to-amber-400'
                : 'bg-gradient-to-t from-indigo-500 to-emerald-400'
            }`}
            style={{ height: `${Math.max(10, height)}%` }}
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
              <strong className="text-white font-mono">{level}%</strong>
            </span>
          </div>

          <span
            className={
              level > 20
                ? 'text-emerald-300 font-semibold'
                : 'text-indigo-300 italic'
            }
          >
            {level > 20
              ? language === 'en'
                ? 'Clear audio input'
                : 'स्पष्ट आवाज़ दर्ज हो रही है'
              : language === 'en'
              ? 'Speak closer to microphone'
              : 'माइक के करीब बोलें'}
          </span>
        </div>
      )}
    </div>
  );
};
