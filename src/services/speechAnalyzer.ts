/**
 * AI Speech Analyzer Pipeline & Provider Architecture
 * 
 * Provides clean separation of concerns:
 * - Audio capture & quality verification
 * - Speech-to-text transcript processing
 * - Pronunciation & target comparison analysis
 * - Child-friendly feedback & scoring
 */

import { AppLanguage, LessonMode, WordAnalysis } from '../types';
import { cleanWord, wordSimilarity, detectSubstitution, analyzeSpokenText } from './soundAnalysis';
import { analyzeAudioRMS } from './audioRecorder';

export type AudioQualityState =
  | 'MIC_PERMISSION_DENIED'
  | 'MIC_STREAM_ERROR'
  | 'RECORDING_STARTED'
  | 'RECORDING'
  | 'AUDIO_CAPTURED'
  | 'AUDIO_EMPTY'
  | 'AUDIO_SILENT'
  | 'AUDIO_READY';

export type ChildFriendlyResultState =
  | 'LISTENING'
  | 'PROCESSING'
  | 'SPEECH_DETECTED'
  | 'ANALYZING'
  | 'COMPLETE'
  | 'TRY_AGAIN'
  | 'NO_SPEECH'
  | 'AUDIO_PROBLEM'
  | 'MICROPHONE_PERMISSION_REQUIRED'
  | 'ANALYSIS_UNAVAILABLE';

export interface SpeechAnalyzerInput {
  audioBlob?: Blob | null;
  targetText: string;
  recognizedText: string;
  language: AppLanguage;
  exerciseType: LessonMode | 'drill' | 'word' | 'two-words' | 'line' | 'paragraph';
  syllablesMap?: Record<string, string>;
  totalResultsReceived?: number;
  speechDetected?: boolean;
  errorCode?: string | null;
}

export interface WordSpeechResult extends WordAnalysis {
  confidence?: number;
}

export interface SpeechAnalysisResult {
  speechDetected: boolean;
  audioUsable: boolean;
  audioQualityState: AudioQualityState;
  recognizedText: string;
  targetText: string;
  wordResults: WordSpeechResult[];
  pronunciationFeedback: string;
  completionStatus: 'complete' | 'incomplete' | 'different_words' | 'no_speech';
  childFriendlyState: ChildFriendlyResultState;
  clarityScore: number; // 0 - 100
  confidence: number;
  analysisAvailable: boolean;
  analysisType: 'browser_phonetic' | 'cloud_ai' | 'fallback';
  starsEarned: number;
  identifiedSubstitutions: string[];
}

export interface SpeechAnalyzerProvider {
  analyzeSpeech(input: SpeechAnalyzerInput): Promise<SpeechAnalysisResult>;
}

/**
 * Standard Browser Phonetic & Target Comparison Analyzer
 */
export class BrowserSpeechAnalyzerProvider implements SpeechAnalyzerProvider {
  public async analyzeSpeech(input: SpeechAnalyzerInput): Promise<SpeechAnalysisResult> {
    const {
      audioBlob,
      targetText,
      recognizedText,
      language,
      exerciseType,
      syllablesMap = {},
      totalResultsReceived = 0,
      speechDetected = false,
      errorCode = null,
    } = input;

    // 1. Audio Quality & Usability Check
    let audioQualityState: AudioQualityState = 'AUDIO_READY';
    let audioUsable = false;

    if (errorCode === 'not-allowed' || errorCode === 'service-not-allowed') {
      audioQualityState = 'MIC_PERMISSION_DENIED';
    } else if (errorCode === 'audio-capture') {
      audioQualityState = 'MIC_STREAM_ERROR';
    } else if (audioBlob && audioBlob.size > 0) {
      const rmsInfo = await analyzeAudioRMS(audioBlob);
      if (rmsInfo.isSilent && audioBlob.size < 600) {
        audioQualityState = 'AUDIO_EMPTY';
      } else if (rmsInfo.isSilent) {
        audioQualityState = 'AUDIO_SILENT';
        audioUsable = true; // Still have audio container
      } else {
        audioQualityState = 'AUDIO_READY';
        audioUsable = true;
      }
    } else {
      audioQualityState = 'AUDIO_EMPTY';
    }

    const cleanRecognized = recognizedText.trim();
    const hasRecognizedSpeech = cleanRecognized.length > 0;
    const isActuallySpeechDetected = speechDetected || hasRecognizedSpeech || totalResultsReceived > 0;

    // 2. Handle Genuine No-Speech or Mic Denied
    if (!isActuallySpeechDetected && !hasRecognizedSpeech) {
      const isPermDenied = audioQualityState === 'MIC_PERMISSION_DENIED';
      return {
        speechDetected: false,
        audioUsable,
        audioQualityState,
        recognizedText: '',
        targetText,
        wordResults: analyzeSpokenText(targetText, '', language, syllablesMap).map((w) => ({
          ...w,
          status: 'needs-practice' as const,
        })),
        pronunciationFeedback: isPermDenied
          ? (language === 'en' ? 'Microphone permission required.' : 'माइक की अनुमति आवश्यक है।')
          : (language === 'en' ? "We couldn't hear speech. Please try again." : 'कोई आवाज़ नहीं मिली। कृपया पुनः प्रयास करें।'),
        completionStatus: 'no_speech',
        childFriendlyState: isPermDenied ? 'MICROPHONE_PERMISSION_REQUIRED' : 'NO_SPEECH',
        clarityScore: 0,
        confidence: 0,
        analysisAvailable: true,
        analysisType: 'browser_phonetic',
        starsEarned: 1,
        identifiedSubstitutions: [],
      };
    }

    // 3. Word by Word Comparison & Alignment
    const wordResults = analyzeSpokenText(targetText, cleanRecognized, language, syllablesMap);

    const targetWords = targetText.trim().split(/\s+/).filter(Boolean);
    const spokenWords = cleanRecognized.split(/\s+/).filter(Boolean);
    const correctCount = wordResults.filter((w) => w.status === 'correct').length;
    const totalWords = wordResults.length || 1;

    // 4. Completion Status
    let completionStatus: 'complete' | 'incomplete' | 'different_words' | 'no_speech' = 'complete';
    if (correctCount === totalWords && targetWords.length > 0) {
      completionStatus = 'complete';
    } else if (spokenWords.length < targetWords.length) {
      completionStatus = 'incomplete';
    } else {
      completionStatus = 'different_words';
    }

    // 5. Calculate Clarity Score
    let clarityScore = 0;
    if (exerciseType === 'word') {
      const expClean = cleanWord(targetText, language);
      const spkClean = cleanWord(cleanRecognized, language);
      if (!spkClean) {
        clarityScore = 0;
      } else if (expClean === spkClean) {
        clarityScore = 100;
      } else {
        const sim = wordSimilarity(expClean, spkClean);
        const isWordCorrect = wordResults.length > 0 && wordResults[0].status === 'correct';
        clarityScore = isWordCorrect ? Math.round(Math.max(sim, 0.7) * 100) : Math.round(sim * 100);
      }
    } else {
      clarityScore = totalWords > 0 ? Math.round((correctCount / totalWords) * 100) : 0;
    }

    // 6. Stars Awarded
    let starsEarned = 1;
    if (clarityScore >= 90) starsEarned = 15;
    else if (clarityScore >= 70) starsEarned = 10;
    else if (clarityScore >= 40) starsEarned = 5;
    else starsEarned = 1;

    // 7. Child Friendly Result State & Encouraging Feedback
    let childFriendlyState: ChildFriendlyResultState = 'COMPLETE';
    let pronunciationFeedback = '';

    if (clarityScore >= 90) {
      childFriendlyState = 'COMPLETE';
      pronunciationFeedback =
        language === 'en'
          ? 'Outstanding reading! Crystal clear and confident!'
          : 'अद्भुत पठन! बिल्कुल स्पष्ट और आत्मविश्वास से भरपूर!';
    } else if (clarityScore >= 70) {
      childFriendlyState = 'COMPLETE';
      pronunciationFeedback =
        language === 'en'
          ? 'Good job! A little more practice and you will master this!'
          : 'बहुत अच्छा काम! थोड़े और अभ्यास से यह बिल्कुल सिद्ध हो जाएगा!';
    } else {
      childFriendlyState = 'TRY_AGAIN';
      pronunciationFeedback =
        language === 'en'
          ? "Nice try! Let's do it once more together."
          : 'अच्छा प्रयास! आइए मिलकर एक बार और अभ्यास करते हैं।';
    }

    // 8. Identify Substitutions
    const identifiedSubstitutions: string[] = [];
    wordResults.forEach((w) => {
      if (w.status === 'needs-practice' && w.detectedSubstitution) {
        const label = `${w.detectedSubstitution.expectedSound} ➔ ${w.detectedSubstitution.spokenSound}`;
        if (!identifiedSubstitutions.includes(label)) {
          identifiedSubstitutions.push(label);
        }
      }
    });

    return {
      speechDetected: true,
      audioUsable,
      audioQualityState,
      recognizedText: cleanRecognized,
      targetText,
      wordResults,
      pronunciationFeedback,
      completionStatus,
      childFriendlyState,
      clarityScore,
      confidence: 0.9,
      analysisAvailable: true,
      analysisType: 'browser_phonetic',
      starsEarned,
      identifiedSubstitutions,
    };
  }
}

/**
 * Cloud AI Speech Analyzer Provider (Secure integration proxy point)
 * Keeps secrets server-side and falls back safely to browser provider.
 */
export class CloudSpeechAnalyzerProvider implements SpeechAnalyzerProvider {
  private fallbackProvider: BrowserSpeechAnalyzerProvider;
  private apiEndpoint: string;

  constructor(apiEndpoint = '/api/analyze-speech') {
    this.fallbackProvider = new BrowserSpeechAnalyzerProvider();
    this.apiEndpoint = apiEndpoint;
  }

  public async analyzeSpeech(input: SpeechAnalyzerInput): Promise<SpeechAnalysisResult> {
    // If backend proxy is not reachable or fails, smoothly fallback to local phonetic analyzer
    try {
      if (typeof window !== 'undefined' && window.location && input.audioBlob) {
        // Safe check if backend endpoint exists
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const formData = new FormData();
        formData.append('audio', input.audioBlob, 'speech.webm');
        formData.append('targetText', input.targetText);
        formData.append('recognizedText', input.recognizedText);
        formData.append('language', input.language);
        formData.append('exerciseType', input.exerciseType);

        const res = await fetch(this.apiEndpoint, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        }).catch(() => null);

        clearTimeout(timeoutId);

        if (res && res.ok) {
          const cloudData = await res.json();
          if (cloudData && cloudData.analysisAvailable) {
            return {
              ...cloudData,
              analysisType: 'cloud_ai',
            };
          }
        }
      }
    } catch {
      // Graceful offline fallback
    }

    return this.fallbackProvider.analyzeSpeech(input);
  }
}

// Singleton Default Provider
export const defaultSpeechAnalyzer: SpeechAnalyzerProvider = new BrowserSpeechAnalyzerProvider();

export async function analyzeSpeech(input: SpeechAnalyzerInput): Promise<SpeechAnalysisResult> {
  return defaultSpeechAnalyzer.analyzeSpeech(input);
}
