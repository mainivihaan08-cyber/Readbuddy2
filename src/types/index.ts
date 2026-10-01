/**
 * ReadBuddy Types Definition
 */

export type AppLanguage = 'en' | 'hi';

export type LessonMode = 'word' | 'two-words' | 'line' | 'paragraph';

export type WordStatus = 'pending' | 'correct' | 'needs-practice';

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
}

export interface ChildProfile {
  name: string;
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

export interface WeeklyStats {
  daysPracticed: boolean[]; // Mon - Sun
  dailyActivity: DailyPracticePoint[]; // 7 days data for recharts bar chart
  totalMinutes: number;
  paragraphsCompleted: number;
  wordsSpoken: number;
  avgAccuracy: number;
}
