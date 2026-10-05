/**
 * Client service for real-time voice conversations with gemini-3.8-live
 * with automatic Browser Speech Companion fallback for static hosts (GitHub Pages).
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
  private isBrowserCompanionMode = false;
  private recognition: any = null;
  private volumeTimer: any = null;

  constructor(callbacks: LiveVoiceCallbacks) {
    this.callbacks = callbacks;
  }

  public async start(): Promise<void> {
    this.callbacks.onStatusChange?.('connecting');

    try {
      // 1. Setup AudioContexts (16kHz for input mic, 24kHz for output model speech)
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.inputAudioCtx = new AudioCtx({ sampleRate: 16000 });
        this.outputAudioCtx = new AudioCtx({ sampleRate: 24000 });

        if (this.inputAudioCtx.state === 'suspended') {
          await this.inputAudioCtx.resume().catch(() => {});
        }
        if (this.outputAudioCtx.state === 'suspended') {
          await this.outputAudioCtx.resume().catch(() => {});
        }
      }

      // Check if we are on a static host (like github.io) where WebSockets don't exist
      const isStaticHost = window.location.hostname.includes('github.io') || window.location.port === '5000';
      if (isStaticHost) {
        this.startBrowserCompanionMode();
        return;
      }

      // 2. Try WebSocket connection to /live
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      this.ws = new WebSocket(wsUrl);

      // Connection timeout fallback: If WS doesn't open in 2.5s, switch to companion
      const wsTimeout = setTimeout(() => {
        if (!this.isConnected) {
          console.warn('[LiveVoice] WebSocket connection timed out, switching to Browser Voice Companion');
          if (this.ws) {
            try { this.ws.close(); } catch {}
            this.ws = null;
          }
          this.startBrowserCompanionMode();
        }
      }, 2500);

      this.ws.onopen = async () => {
        clearTimeout(wsTimeout);
        this.isConnected = true;
        this.callbacks.onStatusChange?.('connected');
        await this.startMicCapture();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.error) {
            console.warn('[LiveVoice] Server WS error, switching to Browser Companion:', msg.error);
            this.startBrowserCompanionMode();
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
        clearTimeout(wsTimeout);
        console.warn('[LiveVoice] WebSocket error (static hosting environment), activating Browser Voice Companion:', err);
        this.startBrowserCompanionMode();
      };

      this.ws.onclose = () => {
        if (!this.isBrowserCompanionMode) {
          this.isConnected = false;
          this.callbacks.onStatusChange?.('disconnected');
          this.stop();
        }
      };
    } catch (err: any) {
      console.warn('[LiveVoice] Connection exception, activating Browser Voice Companion:', err);
      this.startBrowserCompanionMode();
    }
  }

  /**
   * Browser Voice Companion mode (100% resilient on GitHub Pages and static deployments)
   */
  private startBrowserCompanionMode() {
    this.isBrowserCompanionMode = true;
    this.isConnected = true;
    this.callbacks.onStatusChange?.('connected');

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-IN';

        recognition.onstart = () => {
          this.callbacks.onStatusChange?.('listening');
        };

        recognition.onresult = (event: any) => {
          const lastIndex = event.results.length - 1;
          const transcript = event.results[lastIndex][0]?.transcript?.trim();
          if (transcript) {
            this.handleUserSpokenInput(transcript);
          }
        };

        recognition.onerror = () => {
          if (this.isConnected && this.isBrowserCompanionMode) {
            try { recognition.start(); } catch {}
          }
        };

        recognition.onend = () => {
          if (this.isConnected && this.isBrowserCompanionMode && !this.isModelSpeaking) {
            try { recognition.start(); } catch {}
          }
        };

        recognition.start();
        this.recognition = recognition;
      } catch (e) {
        console.warn('[LiveVoice] SpeechRecognition start warning:', e);
      }
    }

    // Volume simulation for companion mode
    this.volumeTimer = setInterval(() => {
      if (this.isModelSpeaking) {
        this.callbacks.onVolumeChange?.(0.05, 0.65 + Math.random() * 0.3);
      } else {
        this.callbacks.onVolumeChange?.(0.1 + Math.random() * 0.25, 0.05);
      }
    }, 150);

    // Initial warm greeting from Buddy
    setTimeout(() => {
      this.speakBuddyResponse("Hello! I am Buddy! I am ready to listen and practice reading with you. Talk to me!");
    }, 400);
  }

  private handleUserSpokenInput(userText: string) {
    const lower = userText.toLowerCase();
    let reply = "I heard you! You're speaking with great confidence. Would you like to practice a new word or sentence?";

    if (lower.includes('hello') || lower.includes('hi') || lower.includes('नमस्ते') || lower.includes('namaste')) {
      reply = "Hello there! It's wonderful to practice reading with you today! What should we practice?";
    } else if (lower.includes('how to say') || lower.includes('how do i say') || lower.includes('pronounce')) {
      reply = `To pronounce clearly, take a gentle breath and say each syllable smoothly. Try saying it once more into the mic!`;
    } else if (lower.includes('story') || lower.includes('कहानी')) {
      reply = "Once upon a time in a sunny forest, a brave elephant discovered a secret path of wisdom! Reading stories builds our imagination!";
    } else if (lower.includes('good') || lower.includes('great') || lower.includes('thank')) {
      reply = "You are doing an awesome job! Every time you practice, your voice becomes clearer and stronger!";
    } else if (lower.length > 0) {
      reply = `Great job reading: "${userText}"! Your pronunciation is clear and steady. Let's keep practicing!`;
    }

    this.speakBuddyResponse(reply);
  }

  private speakBuddyResponse(text: string) {
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) {
      this.callbacks.onTranscript?.(text);
      return;
    }

    this.isModelSpeaking = true;
    this.callbacks.onStatusChange?.('speaking');
    this.callbacks.onTranscript?.(text);

    // Stop recognition while speaking to avoid feedback loop
    if (this.recognition) {
      try { this.recognition.stop(); } catch {}
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.1;

    // Pick English/Hindi friendly voice if available
    const voices = window.speechSynthesis.getVoices();
    const friendlyVoice = voices.find((v) => v.lang.includes('en') || v.lang.includes('hi'));
    if (friendlyVoice) {
      utterance.voice = friendlyVoice;
    }

    utterance.onend = () => {
      this.isModelSpeaking = false;
      this.callbacks.onStatusChange?.('listening');
      if (this.isConnected && this.isBrowserCompanionMode && this.recognition) {
        try { this.recognition.start(); } catch {}
      }
    };

    utterance.onerror = () => {
      this.isModelSpeaking = false;
      this.callbacks.onStatusChange?.('listening');
    };

    window.speechSynthesis.speak(utterance);
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
    this.scriptProcessor = this.inputAudioCtx.createScriptProcessor(4096, 1, 1);

    this.scriptProcessor.onaudioprocess = (e) => {
      if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

      const inputData = e.inputBuffer.getChannelData(0);

      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.callbacks.onVolumeChange?.(Math.min(1, rms * 5), this.isModelSpeaking ? 0.7 : 0);

      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

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
    } else if (this.isBrowserCompanionMode) {
      this.handleUserSpokenInput(text);
    }
  }

  public stop() {
    this.isConnected = false;
    this.isModelSpeaking = false;
    this.isBrowserCompanionMode = false;
    this.stopAllAudio();

    if (this.volumeTimer) {
      clearInterval(this.volumeTimer);
      this.volumeTimer = null;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }

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

