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
 * Speech Recognition Controller
 */
export class SpeechRecognizer {
  private recognition: SpeechRecognitionInstance | null = null;
  private shouldBeListening = false;
  private isListening = false;
  private sessionBaseTranscript = '';
  private currentSegmentFinal = '';
  private currentSegmentInterim = '';
  private onTranscriptCallback: ((transcript: string, isFinal: boolean) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onStateChangeCallback: ((active: boolean) => void) | null = null;
  private currentLanguage: AppLanguage = 'en';
  private restartTimeout: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;

  constructor(lang: AppLanguage = 'en') {
    this.currentLanguage = lang;
    this.initRecognition();
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
        this.onStateChangeCallback?.(true);
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let segFinal = '';
        let segInterim = '';

        for (let i = 0; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            segFinal += result[0].transcript + ' ';
          } else {
            segInterim += result[0].transcript;
          }
        }

        this.currentSegmentFinal = segFinal;
        this.currentSegmentInterim = segInterim;

        const combined = (this.sessionBaseTranscript + segFinal + segInterim).trim();
        this.onTranscriptCallback?.(combined, !!segFinal);
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        // Routine auto-abort / no-speech errors should NOT end the user's reading session
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return;
        }

        // Fatal errors (e.g. mic permission denied)
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this.shouldBeListening = false;
          this.isListening = false;
          this.onStateChangeCallback?.(false);
          this.onErrorCallback?.(event.error);
          return;
        }

        console.warn('SpeechRecognition non-fatal event error:', event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;

        // Consolidate current segment's final results into sessionBaseTranscript
        if (this.currentSegmentFinal) {
          this.sessionBaseTranscript = (this.sessionBaseTranscript + this.currentSegmentFinal).trim() + ' ';
          this.currentSegmentFinal = '';
          this.currentSegmentInterim = '';
        }

        // If the user has NOT pressed stop, automatically restart right away
        if (this.shouldBeListening) {
          if (this.restartTimeout) clearTimeout(this.restartTimeout);
          this.restartTimeout = setTimeout(() => {
            if (this.shouldBeListening) {
              try {
                this.recognition?.start();
              } catch {
                // If it fails to restart immediately, retry briefly
                this.retryCount++;
                if (this.retryCount < 10 && this.shouldBeListening) {
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
          this.onStateChangeCallback?.(false);
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

  public start(
    onTranscript: (transcript: string, isFinal: boolean) => void,
    onError?: (err: string) => void,
    onStateChange?: (active: boolean) => void
  ) {
    this.shouldBeListening = true;
    this.sessionBaseTranscript = '';
    this.currentSegmentFinal = '';
    this.currentSegmentInterim = '';
    this.retryCount = 0;
    this.onTranscriptCallback = onTranscript;
    this.onErrorCallback = onError || null;
    this.onStateChangeCallback = onStateChange || null;

    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    if (!this.recognition) {
      this.initRecognition();
    }

    if (!this.recognition) {
      this.onErrorCallback?.('Speech recognition is not supported on this browser.');
      return;
    }

    try {
      this.recognition.lang = this.currentLanguage === 'hi' ? 'hi-IN' : 'en-IN';
      this.recognition.start();
    } catch {
      // If already started or throwing, try stopping then restarting cleanly
      try {
        this.recognition.stop();
        setTimeout(() => {
          if (this.shouldBeListening) {
            try { this.recognition?.start(); } catch {}
          }
        }, 100);
      } catch (e) {
        console.warn('Recognition start exception:', e);
      }
    }
  }

  public stop() {
    this.shouldBeListening = false;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (err) {
        console.warn('Recognition stop error:', err);
      }
    }
    this.isListening = false;
    this.onStateChangeCallback?.(false);
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
