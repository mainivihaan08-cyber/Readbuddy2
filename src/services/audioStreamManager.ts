/**
 * ReadBuddy - Audio Stream & Web Audio Manager
 * 
 * Provides robust, non-blocking microphone stream acquisition,
 * shared AudioContext management, and real-time voice signal analysis.
 * Prevents multiple conflicting getUserMedia requests, handles browser
 * autoplay/suspended policies, and guarantees instant mic signal response.
 */

let sharedAudioContext: AudioContext | null = null;
let activeStream: MediaStream | null = null;

/**
 * Returns or creates the shared AudioContext, ensuring it is resumed.
 */
export function getSharedAudioContext(): AudioContext | null {
  const AudioContextClass =
    window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioContextClass();
  }

  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch((err) => {
      console.warn('[AudioStreamManager] Failed to resume AudioContext:', err);
    });
  }

  return sharedAudioContext;
}

/**
 * Ensures AudioContext is resumed in the current user-gesture tick.
 */
export function unlockAudioContext(): void {
  try {
    const ctx = getSharedAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  } catch (e) {
    console.warn('[AudioStreamManager] unlockAudioContext error:', e);
  }
}

/**
 * Acquire a reliable microphone MediaStream with graceful constraint fallbacks.
 */
export async function acquireMicrophoneStream(): Promise<MediaStream> {
  if (!navigator?.mediaDevices?.getUserMedia) {
    throw new Error('navigator.mediaDevices.getUserMedia is not supported on this browser');
  }

  // If we already have a live track stream, reuse it
  if (activeStream && activeStream.active) {
    const liveTrack = activeStream.getAudioTracks().find((t) => t.readyState === 'live');
    if (liveTrack && liveTrack.enabled) {
      return activeStream;
    }
  }

  // 1. Try with standard voice enhancement constraints
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    activeStream = stream;
    return stream;
  } catch (initialErr) {
    console.warn('[AudioStreamManager] Enhanced audio constraints failed, trying basic audio:', initialErr);
  }

  // 2. Fallback to basic audio: true (some hardware fails with constraints)
  try {
    const fallbackStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    activeStream = fallbackStream;
    return fallbackStream;
  } catch (fallbackErr) {
    console.error('[AudioStreamManager] Basic audio getUserMedia failed:', fallbackErr);
    throw fallbackErr;
  }
}

/**
 * Release active microphone stream tracks.
 */
export function stopMicrophoneStream(stream?: MediaStream | null): void {
  const target = stream || activeStream;
  if (target) {
    target.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {}
    });
    if (target === activeStream) {
      activeStream = null;
    }
  }
}

export interface AnalyserHandle {
  analyser: AnalyserNode;
  audioContext: AudioContext;
  sourceNode: MediaStreamAudioSourceNode;
  cleanup: () => void;
}

/**
 * Create an AnalyserNode connected to the given MediaStream.
 */
export function createStreamAnalyser(stream: MediaStream): AnalyserHandle | null {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return null;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const sourceNode = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64; // Low latency, 32 frequency bins
    analyser.smoothingTimeConstant = 0.4; // Smooth transitions

    sourceNode.connect(analyser);

    return {
      analyser,
      audioContext: ctx,
      sourceNode,
      cleanup: () => {
        try {
          sourceNode.disconnect();
        } catch {}
      },
    };
  } catch (err) {
    console.warn('[AudioStreamManager] createStreamAnalyser error:', err);
    return null;
  }
}

/**
 * Calculate dynamic speech level & frequency bar heights from an AnalyserNode.
 */
export function calculateVoiceMetrics(
  analyser: AnalyserNode,
  timeData: Uint8Array,
  freqData: Uint8Array,
  barCount: number = 9
): {
  levelPercent: number;
  isVoiceActive: boolean;
  barHeights: number[];
} {
  // 1. Time domain RMS volume
  (analyser as any).getByteTimeDomainData(timeData);
  let sumSquares = 0;
  for (let i = 0; i < timeData.length; i++) {
    const dev = (timeData[i] - 128) / 128;
    sumSquares += dev * dev;
  }
  const rms = Math.sqrt(sumSquares / timeData.length);

  // Dynamic sensitivity multiplier: responsive to child voices (RMS ~ 0.02 - 0.25)
  // Non-linear scaling ensures even soft speech shows 30%-60%
  const levelPercent = Math.min(100, Math.max(0, Math.round(Math.pow(rms * 3.5, 0.8) * 100)));
  const isVoiceActive = levelPercent > 8 || rms > 0.015;

  // 2. Frequency data for equalizer bars
  (analyser as any).getByteFrequencyData(freqData);
  const bufferLength = analyser.frequencyBinCount;
  const barHeights: number[] = [];

  for (let b = 0; b < barCount; b++) {
    // Map each bar to vocal formant bins (lower to mid range)
    const binIdx = Math.min(
      bufferLength - 1,
      1 + Math.floor((b / Math.max(1, barCount - 1)) * 14)
    );
    const freqVal = freqData[binIdx] || 0;
    const baseHeight = (freqVal / 255) * 85;
    const boost = isVoiceActive ? rms * 60 : 0;
    const height = Math.min(100, Math.max(12, Math.round(baseHeight + boost)));
    barHeights.push(height);
  }

  return {
    levelPercent,
    isVoiceActive,
    barHeights,
  };
}
