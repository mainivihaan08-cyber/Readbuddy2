/**
 * ReadBuddy Types Definition
 */

export type AppLanguage = 'en' | 'hi';

export type LessonMode = 'word' | 'two-words' | 'line' | 'paragraph';

export type WordStatus = 'pending' | 'correct' | 'needs-practice' | 'not-heard';

export interface WordAnalysis {
  expected: string;
  cleaned: string;
  status: WordStatus;
  spoken?: string;
  syllables?: string;
  detectedSubstitution?: {
    expectedSound: string;
    spokenSound: string;
  };
  alignmentType?: 'matched' | 'not-heard' | 'mismatch' | 'pending';
  similarity?: number;
}

export interface ReadingItem {
  id: string;
  title: string;
  titleHi?: string;
  language: AppLanguage;
  category: string;
  categoryHi?: string;
  grade: string;
  text: string;
  targetSounds: string[];
  syllablesMap: Record<string, string>;
  difficulty: 'easy' | 'medium' | 'challenging';
  mode?: LessonMode;
}

export type ParagraphItem = ReadingItem;

export interface SoundSubstitutionLog {
  id: string;
  childId?: string;
  expectedSound: string;
  spokenSound: string;
  language: AppLanguage;
  count: number;
  lastObserved: string;
  exampleWords: string[];
  trend: 'improving' | 'stable' | 'needs-practice';
}

export interface SavedRecording {
  id: string;
  childId?: string;
  timestamp: number;
  dateFormatted: string;
  paragraphId: string;
  paragraphTitle: string;
  language: AppLanguage;
  accuracy: number;
  durationSeconds: number;
  audioBlob?: Blob;
  audioUrl?: string;
  identifiedSubstitutions: string[];
  expectedText?: string;
  heardTranscript?: string;
  errorCode?: string;
  recognitionLanguage?: string;
}

export interface ChildProfile {
  childId: string;
  name: string;
  mobileNumber: string; // Primary identifier, normalized 10 digits
  createdAt: number;
  updatedAt: number;
  stars: number;
  streak: number;
  lastActiveDate: string; // YYYY-MM-DD
  todaySessionSeconds: number;
  dailyCapMinutes: number;
  level: number;
  levelTitle: string;
  todayChallengeCompleted: boolean;
  unlockedBadges: string[];
  totalParagraphsRead: number;
  totalWordsPracticed: number;
  // Future flexibility hooks
  authType?: 'mobile_direct' | 'otp' | 'google' | 'apple' | 'school';
  parentAccountId?: string;
  schoolId?: string;
}

export interface SpeechCoachReportItem {
  id: string;
  childId: string;
  recordingId?: string;
  sessionId?: string;
  timestamp: number;
  dateFormatted: string;
  targetText: string;
  transcribedText: string;
  reportMarkdown: string;
}

export interface BadgeItem {
  id: string;
  name: string;
  nameHi: string;
  description: string;
  descriptionHi: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  target: number;
}

export interface SoundDrillConfig {
  sound: string;
  language: AppLanguage;
  title: string;
  tip: string;
  words: string[];
  tongueTwister: string;
  tongueTwisterSyllables?: string;
}

export interface DailyPracticePoint {
  day: string;
  dayShort: string;
  date: string;
  minutes: number;
  targetMinutes: number;
  isToday?: boolean;
}

export interface SoundStat {
  sound: string;
  language: AppLanguage;
  totalAttempts: number;
  correctCount: number;
  substitutedCount: number;
  substitutionsMap: Record<string, number>;
  weeklyTrend: 'improving' | 'same' | 'worse';
  pastWeeklyAccuracy: number;
  currentWeeklyAccuracy: number;
}

export interface WordMemoryItem {
  word: string;
  language: AppLanguage;
  attempts: number;
  correctCount: number;
  needsPracticeCount: number;
  consecutiveCorrect: number;
  lastResult: 'correct' | 'needs-practice' | 'not-heard';
  lastPracticedTimestamp: number;
  nextReviewDate: string; // YYYY-MM-DD
}

export interface SpeakingStyleStats {
  totalWordsSpoken: number;
  totalSpeakingTimeSeconds: number;
  averageWPM: number;
  pauseCount: number;
  retriesPerWord: Record<string, number>;
  hourlyAttempts: Record<number, number>;
  bestTimeOfDay: 'morning' | 'afternoon' | 'evening';
  averageSessionLengthSeconds: number;
  totalSessionsCount: number;
  goodSessionsInRow: number;
  poorSessionsInRow: number;
  difficultyAdaptiveLevel: 'easy' | 'medium' | 'challenging';
}

export interface SpeechProfile {
  childId?: string;
  childName: string;
  updatedTimestamp: number;
  sounds: Record<string, SoundStat>;
  words: Record<string, WordMemoryItem>;
  style: SpeakingStyleStats;
}

export interface WeeklyStats {
  daysPracticed: boolean[]; // Mon - Sun
  dailyActivity: DailyPracticePoint[]; // 7 days data for recharts bar chart
  totalMinutes: number;
  paragraphsCompleted: number;
  wordsSpoken: number;
  avgAccuracy: number;
}

// ==========================================
// WORD DIFFICULTY & LONG-TERM REPORT TYPES
// ==========================================

export type WordAttemptResult = 'correct' | 'incorrect' | 'uncertain';

export type WordErrorType =
  | 'substitution'
  | 'omission'
  | 'addition'
  | 'distortion'
  | 'unclear'
  | 'stress_error'
  | 'syllable_error'
  | 'word_recognition_error'
  | 'uncertain';

export interface WordAttemptRecord {
  id: string;
  childId: string;
  sessionId: string;
  recordingId?: string;
  targetWord: string;
  normalizedWord: string;
  language: AppLanguage;
  attemptNumber: number;
  result: WordAttemptResult;
  confidence: number;
  observedText?: string;
  errorType?: WordErrorType;
  phonemesExpected?: string[];
  phonemesObserved?: string[];
  primarySound?: string;
  createdAt: number;
  dateStr: string; // YYYY-MM-DD
}

export type WordDifficultyStatus =
  | 'needs-practice'
  | 'improving'
  | 'stable'
  | 'declining'
  | 'mastered'
  | 'insufficient-data';

export type WordDifficultyTrend =
  | 'improving'
  | 'stable'
  | 'needs-attention'
  | 'declining'
  | 'mastered'
  | 'insufficient-data';

export interface ChildWordProfile {
  id: string;
  childId: string;
  word: string;
  normalizedWord: string;
  language: AppLanguage;
  totalAttempts: number;
  correctAttempts: number;
  incorrectAttempts: number;
  uncertainAttempts: number;
  validAttempts: number;
  accuracy: number; // Lifetime %
  recentAccuracy: number; // Last 5-8 attempts %
  retryCount: number; // In-session retries count
  recentAttempts: WordAttemptResult[]; // Last 5-8 attempts
  currentStatus: WordDifficultyStatus;
  trend: WordDifficultyTrend;
  masteryLevel: 'mastered' | 'learning' | 'struggling' | 'new';
  primarySound?: string;
  soundFamily?: string;
  difficultyPriority: number; // For prioritizing Top Difficult Words
  firstPracticedAt: number;
  lastPracticedAt: number;
  lastResult: WordAttemptResult;
  recommendedAction: string;
  syllables?: string;
}

export interface DailyWordProgress {
  date: string;
  wordsPracticed: number;
  correctCount: number;
  needsAttentionWords: string[];
  improvedToday: string[];
  masteredToday: string[];
  mostRepeatedDifficultySound?: string;
}

export interface WeeklyWordProgress {
  wordsPracticed: number;
  wordsImproved: number;
  wordsNeedingContinuedPractice: number;
  wordsMastered: number;
  wordsDeclining: number;
  topRecurringDifficultWords: ChildWordProfile[];
  recurringSoundPattern?: string;
  recurringSoundExampleWords: string[];
}

export interface AdaptiveWordPracticeSet {
  word: string;
  language: AppLanguage;
  primarySound: string;
  level1Sound: { sound: string; description: string };
  level2SoundVowel: { text: string; audioHelp: string };
  level3SimpleWord: { text: string; meaning?: string };
  level4TargetWord: { text: string; syllables: string; slowAudioTip: string };
  level5Sentence: { text: string; highlightWord: string };
}

// ==========================================
// DEEP PRONUNCIATION ANALYSIS ENGINE TYPES
// ==========================================

export type AudioQualityStatus = 'excellent' | 'good' | 'acceptable' | 'poor' | 'insufficient';

export interface AudioQualityMetrics {
  snrDb: number;
  clippingCount: number;
  silenceRatio: number;
  durationSeconds: number;
  sampleRate: number;
  noiseFloorDb: number;
  isAudible: boolean;
  status: AudioQualityStatus;
  explanation: string;
}

export type PhonemePosition = 'initial' | 'medial' | 'final';

export type PhonemeEvaluationResult =
  | 'correct'
  | 'likely_correct'
  | 'possible_error'
  | 'likely_error'
  | 'uncertain'
  | 'not_detected';

export type PronunciationConfidence = 'high' | 'medium' | 'low';

export interface AcousticEvidenceMetrics {
  f1Hz?: number;
  f2Hz?: number;
  intensityDb?: number;
  spectralCenterHz?: number;
  durationMs?: number;
  voicingLikely?: boolean;
}

export interface PhonemeAttemptRecord {
  id: string;
  childId: string;
  sessionId: string;
  recordingId?: string;
  targetWord: string;
  normalizedWord: string;
  phoneme: string;
  expectedIpa: string;
  observedIpa?: string;
  position: PhonemePosition;
  startTime?: number;
  endTime?: number;
  durationMs?: number;
  acousticFeatures?: AcousticEvidenceMetrics;
  result: PhonemeEvaluationResult;
  errorType?: 'substitution' | 'omission' | 'addition' | 'distortion' | 'timing_difference' | 'uncertain';
  confidence: PronunciationConfidence;
  observation: string;
  interpretation: string;
  recommendation: string;
  createdAt: number;
  language: AppLanguage;
}

export interface ChildPhonemeProfile {
  id: string;
  childId: string;
  phoneme: string;
  ipaSymbol: string;
  language: AppLanguage;
  totalAttempts: number;
  successfulAttempts: number;
  possibleErrorAttempts: number;
  uncertainAttempts: number;
  overallAccuracy: number;
  recentAccuracy: number;
  initialAccuracy: number;
  medialAccuracy: number;
  finalAccuracy: number;
  initialAttempts: number;
  medialAttempts: number;
  finalAttempts: number;
  trend: 'improving' | 'stable' | 'declining' | 'needs_attention' | 'insufficient_data';
  status: 'needs_practice' | 'improving' | 'mastered' | 'stable' | 'insufficient_data';
  affectedWords: string[];
  lastObservedSubstitutions: string[];
  updatedAt: number;
}

export interface DeepPronunciationWordResult {
  targetWord: string;
  normalizedWord: string;
  wordResult: 'correct' | 'mostly_correct' | 'possible_pronunciation_issue' | 'likely_pronunciation_issue' | 'uncertain';
  confidence: PronunciationConfidence;
  expectedPhonemes: string[];
  observedPhonemes: string[];
  phonemes: PhonemeAttemptRecord[];
  syllableStress: {
    expectedStress: string;
    observedStress?: string;
    stressResult: 'correct' | 'possible_stress_difference' | 'uncertain';
  };
  recommendation: string;
  observation: string;
  interpretation: string;
}

export interface DeepPronunciationAnalysisResult {
  recordingId: string;
  childId: string;
  language: AppLanguage;
  audioQuality: AudioQualityMetrics;
  overallWpm: number;
  speechRateStatus: 'normal' | 'rushed' | 'slow' | 'possible_clarity_reduction_due_to_rate';
  sentenceLevel: {
    linkingAndReductions: string;
    pausesCount: number;
    unnaturalPauses: boolean;
    rhythmClarity: string;
  };
  words: DeepPronunciationWordResult[];
  crossWordPatterns: Array<{
    phoneme: string;
    position: PhonemePosition;
    affectedWords: string[];
    status: string;
    confidence: PronunciationConfidence;
    observation: string;
    interpretation: string;
    recommendation: string;
  }>;
  practiceRecommendations: string[];
  todaySummary: {
    wordsPracticed: number;
    wordsStrong: number;
    wordsNeedingReview: number;
    uncertainCount: number;
    soundsNeedingAttention: string[];
    improvedToday: string[];
  };
}


