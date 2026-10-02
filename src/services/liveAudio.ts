/**
 * Client service for real-time voice conversations with gemini-3.8-live
 */

export interface LiveVoiceCallbacks {
  onStatusChange?: (status: 'disconnected' | 'connecting' | 'connected' | 'speaking' | 'listening') => void;
  onTranscript?: (text: string) => void;
  onError?: (error: string) => void;
  onVolumeChange?: (micVol: number, aiVol: number) => void;
}

export class LiveVoiceSession {
  private ws: WebSocket | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private callbacks: LiveVoiceCallbacks;
  private isConnected = false;
  private isModelSpeaking = false;

  constructor(callbacks: LiveVoiceCallbacks) {
    this.callbacks = callbacks;
  }

  public async start(): Promise<void> {
    this.callbacks.onStatusChange?.('connecting');

    try {
      // 1. Setup AudioContexts (16kHz for input mic, 24kHz for output model speech)
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.inputAudioCtx = new AudioCtx({ sampleRate: 16000 });
      this.outputAudioCtx = new AudioCtx({ sampleRate: 24000 });

      // Resume contexts on user gesture
      if (this.inputAudioCtx.state === 'suspended') {
        await this.inputAudioCtx.resume();
      }
      if (this.outputAudioCtx.state === 'suspended') {
        await this.outputAudioCtx.resume();
      }

      // 2. Connect WebSocket to /live
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = async () => {
        this.isConnected = true;
        this.callbacks.onStatusChange?.('connected');
        await this.startMicCapture();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.error) {
            this.callbacks.onError?.(msg.error);
            return;
          }

          if (msg.audio) {
            this.isModelSpeaking = true;
            this.callbacks.onStatusChange?.('speaking');
            this.playRawPcm24k(msg.audio);
          }

          if (msg.text) {
            this.callbacks.onTranscript?.(msg.text);
          }

          if (msg.interrupted) {
            this.stopAllAudio();
            this.isModelSpeaking = false;
            this.callbacks.onStatusChange?.('listening');
          }

          if (msg.turnComplete) {
            this.isModelSpeaking = false;
            this.callbacks.onStatusChange?.('listening');
          }
        } catch (e) {
          console.error('[LiveVoice] Error parsing WS message:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.error('[LiveVoice] WebSocket error:', err);
        this.callbacks.onError?.('Live voice connection error');
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.callbacks.onStatusChange?.('disconnected');
        this.stop();
      };
    } catch (err: any) {
      this.callbacks.onError?.(err.message || 'Microphone or connection failed');
      this.stop();
      throw err;
    }
  }

  private async startMicCapture() {
    if (!this.inputAudioCtx) return;

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const source = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);
    // 4096 buffer size at 16kHz is ~256ms frames
    this.scriptProcessor = this.inputAudioCtx.createScriptProcessor(4096, 1, 1);

    this.scriptProcessor.onaudioprocess = (e) => {
      if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

      const inputData = e.inputBuffer.getChannelData(0);

      // Calculate RMS for mic visualization
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.callbacks.onVolumeChange?.(Math.min(1, rms * 5), this.isModelSpeaking ? 0.7 : 0);

      // Convert Float32Array to 16-bit signed PCM
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      // Convert to Base64
      const bytes = new Uint8Array(pcm16.buffer);
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Audio = btoa(binary);

      this.ws.send(JSON.stringify({ audio: base64Audio }));
    };

    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.inputAudioCtx.destination);
    this.callbacks.onStatusChange?.('listening');
  }

  private playRawPcm24k(base64Pcm: string) {
    if (!this.outputAudioCtx) return;

    try {
      const binaryString = atob(base64Pcm);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
      }

      const buffer = this.outputAudioCtx.createBuffer(1, float32.length, 24000);
      buffer.getChannelData(0).set(float32);

      const source = this.outputAudioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.outputAudioCtx.destination);

      const currentTime = this.outputAudioCtx.currentTime;
      const startTime = Math.max(currentTime, this.nextStartTime);
      source.start(startTime);
      this.nextStartTime = startTime + buffer.duration;

      this.activeSources.push(source);
      source.onended = () => {
        const index = this.activeSources.indexOf(source);
        if (index > -1) {
          this.activeSources.splice(index, 1);
        }
        if (this.activeSources.length === 0) {
          this.isModelSpeaking = false;
          this.callbacks.onStatusChange?.('listening');
        }
      };
    } catch (err) {
      console.error('[LiveVoice] Playback error:', err);
    }
  }

  private stopAllAudio() {
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {}
    }
    this.activeSources = [];
    if (this.outputAudioCtx) {
      this.nextStartTime = this.outputAudioCtx.currentTime;
    }
  }

  public sendTextMessage(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ text }));
    }
  }

  public stop() {
    this.isConnected = false;
    this.isModelSpeaking = false;
    this.stopAllAudio();

    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch {}
      this.scriptProcessor = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.inputAudioCtx) {
      try {
        this.inputAudioCtx.close();
      } catch {}
      this.inputAudioCtx = null;
    }

    if (this.outputAudioCtx) {
      try {
        this.outputAudioCtx.close();
      } catch {}
      this.outputAudioCtx = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    this.callbacks.onStatusChange?.('disconnected');
  }
}
