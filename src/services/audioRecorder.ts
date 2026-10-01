/**
 * Audio Recorder using MediaRecorder & Web Audio API
 * Provides reliable audio capture, continuous chunk accumulation,
 * zero-audio/RMS signal analysis, and diagnostic logging.
 */

export interface AudioDiagnosticInfo {
  micStatus: 'READY' | 'ERROR';
  audioTrackStatus: 'LIVE' | 'STOPPED' | 'NONE';
  trackEnabled: boolean;
  trackMuted: boolean;
  recorderState: 'IDLE' | 'RECORDING' | 'STOPPING' | 'STOPPED';
  chunksCount: number;
  lastChunkSize: number;
  finalBlobSize: number;
  blobType: string;
  recordingDurationMs: number;
  audioLevel: number;
  isSilent: boolean;
}

/**
 * Analyze audio RMS/energy level to detect zero or silent recordings
 */
export async function analyzeAudioRMS(
  blob: Blob
): Promise<{ rms: number; isSilent: boolean; duration: number }> {
  if (!blob || blob.size === 0) {
    return { rms: 0, isSilent: true, duration: 0 };
  }

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) {
      return {
        rms: blob.size > 2000 ? 0.05 : 0,
        isSilent: blob.size < 500,
        duration: 1,
      };
    }

    const audioCtx = new AudioContextClass();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);

    let sumSquares = 0;
    for (let i = 0; i < channelData.length; i++) {
      sumSquares += channelData[i] * channelData[i];
    }
    const rms = Math.sqrt(sumSquares / (channelData.length || 1));
    const isSilent = rms < 0.0005;

    audioCtx.close();
    return {
      rms: Math.round(rms * 10000) / 10000,
      isSilent,
      duration: audioBuffer.duration,
    };
  } catch (err) {
    console.warn('[AudioRecorder] RMS analysis fallback:', err);
    // If decoding is not supported for the specific container codec, estimate by size
    return {
      rms: blob.size > 2000 ? 0.02 : 0,
      isSilent: blob.size < 500,
      duration: 1,
    };
  }
}

/**
 * Get preferred supported audio MIME type
 */
export function getSupportedAudioMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';

  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/aac',
  ];

  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return '';
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private startTime = 0;
  private stream: MediaStream | null = null;
  private onDiagnosticCb: ((info: AudioDiagnosticInfo) => void) | null = null;

  private currentDiagnostic: AudioDiagnosticInfo = {
    micStatus: 'READY',
    audioTrackStatus: 'NONE',
    trackEnabled: false,
    trackMuted: false,
    recorderState: 'IDLE',
    chunksCount: 0,
    lastChunkSize: 0,
    finalBlobSize: 0,
    blobType: '',
    recordingDurationMs: 0,
    audioLevel: 0,
    isSilent: true,
  };

  public setDiagnosticCallback(cb: (info: AudioDiagnosticInfo) => void) {
    this.onDiagnosticCb = cb;
  }

  private emitDiagnostic(partial?: Partial<AudioDiagnosticInfo>) {
    if (partial) {
      this.currentDiagnostic = { ...this.currentDiagnostic, ...partial };
    }
    this.onDiagnosticCb?.(this.currentDiagnostic);
  }

  public getDiagnostic(): AudioDiagnosticInfo {
    return this.currentDiagnostic;
  }

  public async start(): Promise<boolean> {
    try {
      this.audioChunks = [];
      this.startTime = Date.now();

      console.log('[AudioRecorder] Requesting getUserMedia stream...');
      if (
        !this.stream ||
        !this.stream.active ||
        !this.stream.getAudioTracks().some((t) => t.readyState === 'live')
      ) {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }

      const audioTracks = this.stream.getAudioTracks();
      const firstTrack = audioTracks[0];

      console.log('[AudioRecorder] Audio stream active:', this.stream.active, {
        tracksCount: audioTracks.length,
        readyState: firstTrack?.readyState,
        enabled: firstTrack?.enabled,
        muted: firstTrack?.muted,
      });

      this.emitDiagnostic({
        micStatus: 'READY',
        audioTrackStatus: firstTrack?.readyState === 'live' ? 'LIVE' : 'STOPPED',
        trackEnabled: !!firstTrack?.enabled,
        trackMuted: !!firstTrack?.muted,
        recorderState: 'RECORDING',
        chunksCount: 0,
        lastChunkSize: 0,
        finalBlobSize: 0,
      });

      const mimeType = getSupportedAudioMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};

      this.mediaRecorder = new MediaRecorder(this.stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
          const totalSize = this.audioChunks.reduce((acc, c) => acc + c.size, 0);
          console.log(
            `[AudioRecorder] chunk received: ${event.data.size} bytes (total chunks: ${this.audioChunks.length}, total: ${totalSize} bytes)`
          );
          this.emitDiagnostic({
            chunksCount: this.audioChunks.length,
            lastChunkSize: event.data.size,
            finalBlobSize: totalSize,
            blobType: this.mediaRecorder?.mimeType || mimeType,
            recordingDurationMs: Date.now() - this.startTime,
          });
        }
      };

      this.mediaRecorder.onerror = (e) => {
        console.warn('[AudioRecorder] MediaRecorder error:', e);
        this.emitDiagnostic({ micStatus: 'ERROR' });
      };

      // Slice audio chunks every 100ms for continuous capture
      this.mediaRecorder.start(100);
      console.log('[AudioRecorder] MediaRecorder started with mimeType:', this.mediaRecorder.mimeType);
      return true;
    } catch (err) {
      console.warn('[AudioRecorder] getUserMedia or MediaRecorder error:', err);
      this.mediaRecorder = null;
      this.emitDiagnostic({
        micStatus: 'ERROR',
        recorderState: 'STOPPED',
      });
      return false;
    }
  }

  public async stop(): Promise<{
    blob: Blob;
    durationSeconds: number;
    rms: number;
    isSilent: boolean;
  } | null> {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      console.log('[AudioRecorder] Stop called on inactive recorder');
      return null;
    }

    this.emitDiagnostic({ recorderState: 'STOPPING' });

    // Request final pending slice
    try {
      if (this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.requestData();
      }
    } catch (e) {
      console.warn('[AudioRecorder] requestData warning:', e);
    }

    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = async () => {
        const durationSeconds = Math.max(
          1,
          Math.round((Date.now() - this.startTime) / 1000)
        );
        const mimeType =
          this.mediaRecorder?.mimeType || getSupportedAudioMimeType() || 'audio/webm';
        const blob = new Blob(this.audioChunks, { type: mimeType });

        console.log('[AudioRecorder] MediaRecorder stopped. Building final blob:', {
          size: blob.size,
          type: blob.type,
          chunksCount: this.audioChunks.length,
          durationSeconds,
        });

        const rmsInfo = await analyzeAudioRMS(blob);
        console.log('[AudioRecorder] RMS Analysis result:', rmsInfo);

        this.emitDiagnostic({
          recorderState: 'STOPPED',
          finalBlobSize: blob.size,
          blobType: blob.type,
          chunksCount: this.audioChunks.length,
          audioLevel: rmsInfo.rms,
          isSilent: rmsInfo.isSilent,
          recordingDurationMs: durationSeconds * 1000,
        });

        resolve({
          blob,
          durationSeconds,
          rms: rmsInfo.rms,
          isSilent: rmsInfo.isSilent,
        });
      };

      try {
        this.mediaRecorder.stop();
      } catch (e) {
        console.warn('[AudioRecorder] Error stopping media recorder:', e);
        resolve(null);
      }
    });
  }

  public isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  public cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.emitDiagnostic({
      recorderState: 'IDLE',
      audioTrackStatus: 'STOPPED',
    });
  }
}
