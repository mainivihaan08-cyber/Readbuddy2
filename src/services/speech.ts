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
export class SpeechRecognizer {
  private recognition: SpeechRecognitionInstance | null = null;
  private shouldBeListening = false;
  private isListening = false;
  private isContinuous = true;
  private sessionBaseTranscript = '';
  private currentSegmentFinal = '';
  private currentSegmentInterim = '';
  private latestCombinedTranscript = '';
  private totalResultsReceived = 0;
  private lastErrorCode: string | null = null;

  private onTranscriptCallback: ((transcript: string, isFinal: boolean) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private onStateChangeCallback: ((active: boolean) => void) | null = null;
  private onStartCallback: (() => void) | null = null;

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
      this.recognition.continuous = this.isContinuous;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 3;
      this.recognition.lang = this.currentLanguage === 'hi' ? 'hi-IN' : 'en-IN';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.retryCount = 0;
        this.onStateChangeCallback?.(true);
        this.onStartCallback?.();
      };

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        this.totalResultsReceived++;
        this.lastErrorCode = null; // Clear error code as speech is actively recognized
        let segFinal = '';
        let segInterim = '';

        for (let i = 0; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result && result[0]?.transcript) {
            if (result.isFinal) {
              segFinal += result[0].transcript + ' ';
            } else {
              segInterim += result[0].transcript + ' ';
            }
          }
        }

        this.currentSegmentFinal = segFinal;
        this.currentSegmentInterim = segInterim;

        const combined = (this.sessionBaseTranscript + ' ' + segFinal + ' ' + segInterim)
          .replace(/\s+/g, ' ')
          .trim();
        this.latestCombinedTranscript = combined;
        this.onTranscriptCallback?.(combined, !!segFinal);
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        // Only record lastErrorCode if we haven't recognized any text yet
        if (!this.latestCombinedTranscript.trim()) {
          this.lastErrorCode = event.error;
        }

        // Routine pauses (no-speech) or normal aborts should NOT break speech recognition
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return;
        }

        // Fatal errors (e.g. mic permission denied or hardware capture error)
        if (
          event.error === 'not-allowed' ||
          event.error === 'service-not-allowed' ||
          event.error === 'audio-capture'
        ) {
          this.lastErrorCode = event.error;
          this.shouldBeListening = false;
          this.isListening = false;
          this.onStateChangeCallback?.(false);
          this.onErrorCallback?.(event.error);
          return;
        }

        console.warn('SpeechRecognition event error:', event.error);
        this.onErrorCallback?.(event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;

        // Consolidate current segment's results into sessionBaseTranscript so nothing is lost
        if (this.currentSegmentFinal || this.currentSegmentInterim) {
          this.sessionBaseTranscript = (
            this.sessionBaseTranscript +
            ' ' +
            this.currentSegmentFinal +
            ' ' +
            this.currentSegmentInterim
          )
            .replace(/\s+/g, ' ')
            .trim() + ' ';
          this.currentSegmentFinal = '';
          this.currentSegmentInterim = '';
        }

        // For Line & Paragraph continuous mode: auto-restart only if ended early
        if (this.shouldBeListening && this.isContinuous) {
          if (this.restartTimeout) clearTimeout(this.restartTimeout);
          this.restartTimeout = setTimeout(() => {
            if (this.shouldBeListening && this.isContinuous) {
              try {
                this.recognition?.start();
              } catch {
                this.retryCount++;
                if (this.retryCount < 10 && this.shouldBeListening) {
                  setTimeout(() => {
                    if (this.shouldBeListening && this.isContinuous) {
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
          // One-shot mode or user finished
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

  public getLastErrorCode(): string | null {
    return this.lastErrorCode;
  }

  public getTotalResultsReceived(): number {
    return this.totalResultsReceived;
  }

  public getLatestTranscript(): string {
    return this.latestCombinedTranscript;
  }

  public start(
    onTranscript: (transcript: string, isFinal: boolean) => void,
    onError?: (err: string) => void,
    onStateChange?: (active: boolean) => void,
    onRecognitionStarted?: () => void,
    continuous = true
  ) {
    this.isContinuous = continuous;
    this.shouldBeListening = true;
    this.sessionBaseTranscript = '';
    this.currentSegmentFinal = '';
    this.currentSegmentInterim = '';
    this.latestCombinedTranscript = '';
    this.totalResultsReceived = 0;
    this.lastErrorCode = null;
    this.retryCount = 0;

    this.onTranscriptCallback = onTranscript;
    this.onErrorCallback = onError || null;
    this.onStateChangeCallback = onStateChange || null;
    this.onStartCallback = onRecognitionStarted || null;

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
      this.recognition.continuous = continuous;
      this.recognition.lang = this.currentLanguage === 'hi' ? 'hi-IN' : 'en-IN';
      this.recognition.start();
    } catch {
      // If already started or in transition, stop and restart cleanly
      try {
        this.recognition.stop();
        setTimeout(() => {
          if (this.shouldBeListening) {
            try {
              if (this.recognition) {
                this.recognition.continuous = continuous;
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

  public abort() {
    this.shouldBeListening = false;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (err) {
        console.warn('Recognition abort error:', err);
      }
      this.recognition = null;
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
