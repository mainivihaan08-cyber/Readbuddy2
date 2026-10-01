/**
 * Speech Service: Web Speech API for Recognition & Synthesis
 */

import { AppLanguage } from '../types';

// SpeechRecognition type declarations
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onaudiostart: (() => void) | null;
  onaudioend: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
}

export interface SpeechDiagnosticEvent {
  type:
    | 'onstart'
    | 'onaudiostart'
    | 'onspeechstart'
    | 'onresult'
    | 'onspeechend'
    | 'onaudioend'
    | 'onend'
    | 'onerror';
  timestamp: number;
  details?: {
    isFinal?: boolean;
    interimText?: string;
    finalText?: string;
    fullTranscript?: string;
    confidence?: number;
    alternatives?: string[];
    errorCode?: string;
    errorMessage?: string;
  };
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item: (index: number) => SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item: (index: number) => SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

/**
 * Check if SpeechRecognition is supported
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Friendly explanation for Web Speech errors
 */
export function getFriendlySpeechErrorMessage(
  errorCode: string | null,
  language: AppLanguage
): string {
  if (!errorCode) {
    return language === 'en'
      ? "No speech was detected. Please speak closer to the microphone and try again!"
      : "कोई आवाज़ नहीं मिली। कृपया माइक के पास आकर स्पष्ट बोलें!";
  }

  switch (errorCode) {
    case 'not-allowed':
    case 'service-not-allowed':
      return language === 'en'
        ? "Microphone permission denied. Please allow microphone access in your browser site settings."
        : "माइक की अनुमति अस्वीकृत है। कृपया ब्राउज़र में माइक की अनुमति दें।";
    case 'no-speech':
      return language === 'en'
        ? "No speech detected. Please speak clearly near the phone microphone."
        : "कोई आवाज़ नहीं मिली। कृपया फोन के माइक के पास आकर स्पष्ट आवाज़ में बोलें।";
    case 'audio-capture':
      return language === 'en'
        ? "Microphone is not available or being used by another application. Please check your mic."
        : "माइक उपलब्ध नहीं है या किसी अन्य ऐप द्वारा उपयोग में है। कृपया अपना माइक जाँचें।";
    case 'network':
      return language === 'en'
        ? "No internet connection. Speech recognition requires network connectivity on this device."
        : "इंटरनेट कनेक्शन नहीं है। इस डिवाइस पर आवाज़ पहचान के लिए इंटरनेट आवश्यक है।";
    case 'aborted':
      return language === 'en'
        ? "Listening was cancelled. Tap the mic to try again."
        : "आवाज़ सुनना रुक गया। पुनः प्रयास करने के लिए माइक दबाएँ।";
    default:
      return language === 'en'
        ? `Speech recognition error (${errorCode}). Please check your microphone and try again.`
        : `आवाज़ पहचान में त्रुटि (${errorCode})। कृपया माइक जाँचें और पुनः प्रयास करें।`;
  }
}

/**
 * Speech Recognition Controller
 */
export type RecognitionState =
  | 'IDLE'
  | 'LISTENING'
  | 'SPEECH_DETECTED'
  | 'WAITING_FOR_SILENCE'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'ERROR';

export interface SpeechStartOptions {
  silenceTimeoutMs?: number;
  initialListenTimeoutMs?: number;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
  onError?: (err: string) => void;
  onStateChange?: (state: RecognitionState, active: boolean) => void;
  onDiagnostic?: (event: SpeechDiagnosticEvent) => void;
  onSilence?: () => void;
}

/**
 * Speech Recognition Controller
 */
export class SpeechRecognizer {
  private recognition: SpeechRecognitionInstance | null = null;
  private shouldBeListening = false;
  private isListening = false;
  private state: RecognitionState = 'IDLE';
  private speechDetected = false;

  private sessionBaseTranscript = '';
  private currentSegmentFinal = '';
  private currentSegmentInterim = '';
  private latestCombinedTranscript = '';
  private totalResultsReceived = 0;
  private lastErrorCode: string | null = null;

  private onTranscriptCallback: ((transcript: string, isFinal: boolean) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onStateChangeCallback: ((state: RecognitionState, active: boolean) => void) | null = null;
  private onDiagnosticCallback: ((event: SpeechDiagnosticEvent) => void) | null = null;
  private onSilenceCallback: (() => void) | null = null;

  private currentLanguage: AppLanguage = 'en';
  private restartTimeout: ReturnType<typeof setTimeout> | null = null;
  private initialListenTimeout: ReturnType<typeof setTimeout> | null = null;
  private silenceTimeout: ReturnType<typeof setTimeout> | null = null;
  private silenceDurationMs = 2000;
  private initialListenDurationMs = 10000;
  private retryCount = 0;

  constructor(lang: AppLanguage = 'en') {
    this.currentLanguage = lang;
    this.initRecognition();
  }

  private setState(newState: RecognitionState) {
    this.state = newState;
    this.onStateChangeCallback?.(newState, this.isListening || this.shouldBeListening);
  }

  private clearTimers() {
    if (this.initialListenTimeout) {
      clearTimeout(this.initialListenTimeout);
      this.initialListenTimeout = null;
    }
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
  }

  private handleSpeechActivity() {
    if (!this.speechDetected) {
      this.speechDetected = true;
      this.setState('SPEECH_DETECTED');
      if (this.initialListenTimeout) {
        clearTimeout(this.initialListenTimeout);
        this.initialListenTimeout = null;
      }
      console.log('[Speech] SPEECH ACTIVITY CONFIRMED');
    }

    // Reset silence timer
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }

    if (this.silenceDurationMs > 0 && this.shouldBeListening) {
      console.log(`[Speech] SILENCE TIMER RESET (${this.silenceDurationMs}ms)`);
      this.silenceTimeout = setTimeout(() => {
        if (this.shouldBeListening && (this.speechDetected || this.latestCombinedTranscript.trim())) {
          console.log('[Speech] SILENCE TIMER EXPIRED — Finalizing utterance:', this.latestCombinedTranscript);
          this.setState('WAITING_FOR_SILENCE');
          this.onSilenceCallback?.();
        }
      }, this.silenceDurationMs);
    }
  }

  private initRecognition() {
    if (!isSpeechRecognitionSupported()) return;

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 3;
      this.recognition.lang = this.currentLanguage === 'hi' ? 'hi-IN' : 'en-IN';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.retryCount = 0;
        console.log(`[Speech] START (lang: ${this.recognition?.lang}, continuous: true)`);
        this.setState(this.speechDetected ? 'SPEECH_DETECTED' : 'LISTENING');
        this.onDiagnosticCallback?.({
          type: 'onstart',
          timestamp: Date.now(),
        });
      };

      this.recognition.onaudiostart = () => {
        console.log('[Speech] AUDIO START');
        this.onDiagnosticCallback?.({
          type: 'onaudiostart',
          timestamp: Date.now(),
        });
      };

      this.recognition.onspeechstart = () => {
        console.log('[Speech] SPEECH START');
        this.handleSpeechActivity();
        this.onDiagnosticCallback?.({
          type: 'onspeechstart',
          timestamp: Date.now(),
        });
      };

      this.recognition.onspeechend = () => {
        console.log('[Speech] SPEECH END');
        this.onDiagnosticCallback?.({
          type: 'onspeechend',
          timestamp: Date.now(),
        });
      };

      this.recognition.onaudioend = () => {
        console.log('[Speech] AUDIO END');
        this.onDiagnosticCallback?.({
          type: 'onaudioend',
          timestamp: Date.now(),
        });
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        this.totalResultsReceived++;
        this.lastErrorCode = null;

        let segFinal = '';
        let segInterim = '';
        let confidenceScore = 0.95;
        const alternativesList: string[] = [];

        for (let i = 0; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result && result[0]?.transcript) {
            if (result.isFinal) {
              segFinal += result[0].transcript + ' ';
              confidenceScore = result[0].confidence || 0.95;
            } else {
              segInterim += result[0].transcript + ' ';
            }

            if (i === event.results.length - 1) {
              for (let a = 0; a < result.length; a++) {
                if (result[a]?.transcript) {
                  alternativesList.push(result[a].transcript);
                }
              }
            }
          }
        }

        this.currentSegmentFinal = segFinal.trim();
        this.currentSegmentInterim = segInterim.trim();

        const combined = (this.sessionBaseTranscript + ' ' + segFinal + ' ' + segInterim)
          .replace(/\s+/g, ' ')
          .trim();
        this.latestCombinedTranscript = combined;

        if (segInterim.trim()) {
          console.log(`[Speech] INTERIM: "${segInterim.trim()}"`);
        }
        if (segFinal.trim()) {
          console.log(`[Speech] FINAL: "${segFinal.trim()}"`);
        }
        console.log(`[Speech] ACCUMULATED: "${combined}"`);

        if (combined.trim()) {
          this.handleSpeechActivity();
        }

        this.onTranscriptCallback?.(combined, !!segFinal);

        this.onDiagnosticCallback?.({
          type: 'onresult',
          timestamp: Date.now(),
          details: {
            isFinal: !!segFinal,
            interimText: segInterim.trim(),
            finalText: segFinal.trim(),
            fullTranscript: combined,
            confidence: Math.round((confidenceScore || 0.95) * 100),
            alternatives: alternativesList,
          },
        });
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.log(`[Speech] ERROR: ${event.error} (${event.message || ''})`);

        this.onDiagnosticCallback?.({
          type: 'onerror',
          timestamp: Date.now(),
          details: {
            errorCode: event.error,
            errorMessage: event.message || event.error,
          },
        });

        // If speech was already detected or text exists, do NOT allow transient pause errors to corrupt state
        if (this.speechDetected || this.latestCombinedTranscript.trim().length > 0) {
          if (event.error === 'no-speech' || event.error === 'aborted') {
            return;
          }
        }

        // Fatal errors (e.g. mic permission denied)
        if (
          event.error === 'not-allowed' ||
          event.error === 'service-not-allowed' ||
          event.error === 'audio-capture'
        ) {
          this.clearTimers();
          this.lastErrorCode = event.error;
          this.shouldBeListening = false;
          this.isListening = false;
          this.setState('ERROR');
          this.onErrorCallback?.(event.error);
          return;
        }

        if (event.error === 'no-speech') {
          // If no speech heard yet, let the initial listening timeout handle it cleanly
          return;
        }

        console.warn('SpeechRecognition event error:', event.error);
        this.onErrorCallback?.(event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        console.log(`[Speech] END (shouldBeListening: ${this.shouldBeListening})`);

        this.onDiagnosticCallback?.({
          type: 'onend',
          timestamp: Date.now(),
          details: {
            fullTranscript: this.latestCombinedTranscript,
          },
        });

        // Consolidate final transcript so far
        if (this.currentSegmentFinal) {
          this.sessionBaseTranscript = (
            this.sessionBaseTranscript +
            ' ' +
            this.currentSegmentFinal
          )
            .replace(/\s+/g, ' ')
            .trim() + ' ';
          this.currentSegmentFinal = '';
          this.currentSegmentInterim = '';
        }

        // Auto-restart cleanly only if user has not explicitly stopped
        if (this.shouldBeListening) {
          if (this.restartTimeout) clearTimeout(this.restartTimeout);
          this.restartTimeout = setTimeout(() => {
            if (this.shouldBeListening) {
              try {
                this.recognition?.start();
              } catch {
                this.retryCount++;
                if (this.retryCount < 15 && this.shouldBeListening) {
                  setTimeout(() => {
                    if (this.shouldBeListening) {
                      try {
                        this.recognition?.start();
                      } catch {}
                    }
                  }, 150);
                }
              }
            }
          }, 50);
        } else {
          this.clearTimers();
          this.setState('IDLE');
        }
      };
    } catch (e) {
      console.warn('Failed to initialize SpeechRecognition:', e);
    }
  }

  public setLanguage(lang: AppLanguage) {
    this.currentLanguage = lang;
    if (this.recognition) {
      this.recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    }
  }

  public getState(): RecognitionState {
    return this.state;
  }

  public getLastErrorCode(): string | null {
    return this.lastErrorCode;
  }

  public getTotalResultsReceived(): number {
    return this.totalResultsReceived;
  }

  public getLatestTranscript(): string {
    return this.latestCombinedTranscript;
  }

  public isSpeechDetected(): boolean {
    return this.speechDetected;
  }

  public start(
    optionsOrTranscriptCb:
      | SpeechStartOptions
      | ((transcript: string, isFinal: boolean) => void),
    onError?: (err: string) => void,
    onStateChange?: (active: boolean) => void,
    onDiagnostic?: (event: SpeechDiagnosticEvent) => void
  ) {
    this.clearTimers();

    if (typeof optionsOrTranscriptCb === 'object' && optionsOrTranscriptCb !== null) {
      const opts = optionsOrTranscriptCb;
      this.onTranscriptCallback = opts.onTranscript || null;
      this.onErrorCallback = opts.onError || null;
      this.onDiagnosticCallback = opts.onDiagnostic || null;
      this.onSilenceCallback = opts.onSilence || null;
      this.silenceDurationMs = opts.silenceTimeoutMs !== undefined ? opts.silenceTimeoutMs : 2000;
      this.initialListenDurationMs =
        opts.initialListenTimeoutMs !== undefined ? opts.initialListenTimeoutMs : 10000;
      if (opts.onStateChange) {
        this.onStateChangeCallback = opts.onStateChange;
      }
    } else {
      this.onTranscriptCallback = optionsOrTranscriptCb;
      this.onErrorCallback = onError || null;
      this.onDiagnosticCallback = onDiagnostic || null;
      this.silenceDurationMs = 2000;
      this.initialListenDurationMs = 10000;
      if (onStateChange) {
        this.onStateChangeCallback = (_state, active) => onStateChange(active);
      }
    }

    this.shouldBeListening = true;
    this.speechDetected = false;
    this.sessionBaseTranscript = '';
    this.currentSegmentFinal = '';
    this.currentSegmentInterim = '';
    this.latestCombinedTranscript = '';
    this.totalResultsReceived = 0;
    this.lastErrorCode = null;
    this.retryCount = 0;
    this.setState('LISTENING');

    // Start initial listening window (10s): only show no-speech if window expires without ANY speech
    this.initialListenTimeout = setTimeout(() => {
      if (this.shouldBeListening && !this.speechDetected && !this.latestCombinedTranscript.trim()) {
        console.log('[Speech] INITIAL LISTENING TIMEOUT EXPIRED (No speech heard in 10s)');
        this.lastErrorCode = 'no-speech';
        this.setState('ERROR');
        this.onErrorCallback?.('no-speech');
        this.stop();
      }
    }, this.initialListenDurationMs);

    if (!this.recognition) {
      this.initRecognition();
    }

    if (!this.recognition) {
      this.onErrorCallback?.('Speech recognition is not supported on this browser.');
      return;
    }

    try {
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.currentLanguage === 'hi' ? 'hi-IN' : 'en-IN';
      this.recognition.start();
    } catch {
      // If already started or in transition, restart cleanly
      try {
        this.recognition.stop();
        setTimeout(() => {
          if (this.shouldBeListening) {
            try {
              if (this.recognition) {
                this.recognition.continuous = true;
                this.recognition.interimResults = true;
                this.recognition.lang = this.currentLanguage === 'hi' ? 'hi-IN' : 'en-IN';
                this.recognition.start();
              }
            } catch {}
          }
        }, 100);
      } catch (e) {
        console.warn('Recognition start exception:', e);
      }
    }
  }

  public stop() {
    this.shouldBeListening = false;
    this.clearTimers();
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (err) {
        console.warn('Recognition stop error:', err);
      }
    }
    this.isListening = false;
    this.setState('IDLE');
  }

  public abort() {
    this.shouldBeListening = false;
    this.clearTimers();
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (err) {
        console.warn('Recognition abort error:', err);
      }
      this.recognition = null;
    }
    this.isListening = false;
    this.setState('IDLE');
  }

  public get listening(): boolean {
    return this.isListening || this.shouldBeListening;
  }
}

/**
 * Text-to-Speech Synthesizer
 */
export function speakWord(
  text: string,
  lang: AppLanguage = 'en',
  speed: 'normal' | 'slow' = 'normal',
  onEnd?: () => void
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onEnd?.();
    return;
  }

  window.speechSynthesis.cancel(); // Stop any pending speech

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
  utterance.rate = speed === 'slow' ? 0.6 : 0.95;
  utterance.pitch = 1.05; // Slightly cheerful, gentle tone for kids

  // Pick suitable voice if available
  const voices = window.speechSynthesis.getVoices();
  const targetCode = lang === 'hi' ? 'hi' : 'en';
  const matchingVoice = voices.find(v => v.lang.startsWith(targetCode));
  if (matchingVoice) {
    utterance.voice = matchingVoice;
  }

  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }

  window.speechSynthesis.speak(utterance);
}

/**
 * Speak syllables with rhythmic micro-pauses
 */
export function speakSyllables(
  syllablesFormatted: string,
  lang: AppLanguage = 'en',
  onEnd?: () => void
) {
  const parts = syllablesFormatted.split('-').map(s => s.trim()).filter(Boolean);
  if (parts.length <= 1) {
    speakWord(syllablesFormatted, lang, 'slow', onEnd);
    return;
  }

  let index = 0;

  function speakNext() {
    if (index >= parts.length) {
      onEnd?.();
      return;
    }
    const part = parts[index];
    index++;
    speakWord(part, lang, 'slow', () => {
      setTimeout(speakNext, 180);
    });
  }

  speakNext();
}
