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
  private isListening = false;
  private onTranscriptCallback: ((transcript: string, isFinal: boolean) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onStateChangeCallback: ((active: boolean) => void) | null = null;
  private currentLanguage: AppLanguage = 'en';

  constructor(lang: AppLanguage = 'en') {
    this.currentLanguage = lang;
    this.initRecognition();
  }

  private initRecognition() {
    if (!isSpeechRecognitionSupported()) return;

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    this.recognition = new SpeechRec();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3;
    this.recognition.lang = this.currentLanguage === 'hi' ? 'hi-IN' : 'en-IN';

    this.recognition.onstart = () => {
      this.isListening = true;
      this.onStateChangeCallback?.(true);
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = 0; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const combined = (finalTranscript + interimTranscript).trim();
      this.onTranscriptCallback?.(combined, !!finalTranscript);
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Ignore routine aborts when user stops
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      this.onErrorCallback?.(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.onStateChangeCallback?.(false);
    };
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
    this.onTranscriptCallback = onTranscript;
    this.onErrorCallback = onError || null;
    this.onStateChangeCallback = onStateChange || null;

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
      // If already started, restart
      try {
        this.recognition.stop();
        setTimeout(() => this.recognition?.start(), 150);
      } catch (err) {
        console.warn('Recognition start error:', err);
      }
    }
  }

  public stop() {
    if (this.recognition && this.isListening) {
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
    return this.isListening;
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
