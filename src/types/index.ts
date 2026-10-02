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
