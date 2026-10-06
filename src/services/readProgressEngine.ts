/**
 * ReadBuddy - Professional READ Module Independent Progress Engine
 * Segregated data management for the 4-level structured reading curriculum:
 * - Level 1: Single Words Only
 * - Level 2: Word Combinations
 * - Level 3: Short Sentences
 * - Level 4: Paragraphs & Stories
 */

import { AppLanguage } from '../types';
import { cleanWord, wordSimilarity } from './soundAnalysis';
import { addStars } from './storage';
import {
  LEVEL_1_SINGLE_WORDS,
  LEVEL_2_COMBINATIONS,
  LEVEL_3_SENTENCES,
  LEVEL_4_STORIES,
  ReadWordItem
} from '../data/readModuleData';

export interface ReadAttemptResult {
  isRecognized: boolean; // Did the child attempt the word? (e.g. 'wabbit' for 'rabbit')
  clarityScore: number; // 0-100% pronunciation similarity
  isSuccess: boolean; // Meets passing threshold
  attemptNumber: number;
  expectedText: string;
  spokenText: string;
  feedbackTextEn: string;
  feedbackTextHi: string;
  educationalTipEn?: string;
  educationalTipHi?: string;
  needsMorePractice: boolean;
}

export interface ReadSessionHistoryItem {
  id: string;
  timestamp: number;
  dateFormatted: string;
  levelNumber: 1 | 2 | 3 | 4;
  levelName: string;
  itemsAttempted: number;
  itemsMastered: number;
  accuracyPercent: number;
  wordsToPracticeAgain: string[];
}

export interface ReadLevelProgress {
  levelNumber: 1 | 2 | 3 | 4;
  isUnlocked: boolean;
  isManuallyUnlockedByParent: boolean;
  totalAvailable: number;
  practicedCount: number;
  masteredCount: number;
  needsPracticeList: string[]; // List of word/item IDs
  accuracyPercent: number;
  lastPracticedDate?: string;
}

export interface ReadOverallDashboard {
  currentActiveLevel: 1 | 2 | 3 | 4;
  overallAccuracy: number;
  totalWordsPracticed: number;
  totalWordsMastered: number;
  totalWordsNeedingPractice: number;
  levels: Record<1 | 2 | 3 | 4, ReadLevelProgress>;
  recentSessions: ReadSessionHistoryItem[];
  adaptivePracticeQueue: ReadWordItem[];
}

// Storage keys
const READ_PROGRESS_STORAGE_KEY = 'readbuddy_reading_progress_v2';
const READ_HISTORY_STORAGE_KEY = 'readbuddy_reading_history_v2';

/**
 * Get the initial default state for Level 1-4 progress
 */
function getDefaultLevelProgress(): Record<1 | 2 | 3 | 4, ReadLevelProgress> {
  return {
    1: {
      levelNumber: 1,
      isUnlocked: true, // Always unlocked
      isManuallyUnlockedByParent: false,
      totalAvailable: LEVEL_1_SINGLE_WORDS.length,
      practicedCount: 0,
      masteredCount: 0,
      needsPracticeList: [],
      accuracyPercent: 0,
    },
    2: {
      levelNumber: 2,
      isUnlocked: false,
      isManuallyUnlockedByParent: false,
      totalAvailable: LEVEL_2_COMBINATIONS.length,
      practicedCount: 0,
      masteredCount: 0,
      needsPracticeList: [],
      accuracyPercent: 0,
    },
    3: {
      levelNumber: 3,
      isUnlocked: false,
      isManuallyUnlockedByParent: false,
      totalAvailable: LEVEL_3_SENTENCES.length,
      practicedCount: 0,
      masteredCount: 0,
      needsPracticeList: [],
      accuracyPercent: 0,
    },
    4: {
      levelNumber: 4,
      isUnlocked: false,
      isManuallyUnlockedByParent: false,
      totalAvailable: LEVEL_4_STORIES.length,
      practicedCount: 0,
      masteredCount: 0,
      needsPracticeList: [],
      accuracyPercent: 0,
    },
  };
}

/**
 * Load raw level progress records
 */
export function getReadLevelProgress(): Record<1 | 2 | 3 | 4, ReadLevelProgress> {
  try {
    const raw = localStorage.getItem(READ_PROGRESS_STORAGE_KEY);
    if (!raw) return getDefaultLevelProgress();
    const parsed = JSON.parse(raw);
    const defaults = getDefaultLevelProgress();

    // Ensure all 4 levels exist and totals match current database
    return {
      1: { ...defaults[1], ...parsed[1], totalAvailable: LEVEL_1_SINGLE_WORDS.length, isUnlocked: true },
      2: {
        ...defaults[2],
        ...parsed[2],
        totalAvailable: LEVEL_2_COMBINATIONS.length,
        isUnlocked: parsed[2]?.isManuallyUnlockedByParent || (parsed[1]?.accuracyPercent >= 60 && parsed[1]?.masteredCount >= 5),
      },
      3: {
        ...defaults[3],
        ...parsed[3],
        totalAvailable: LEVEL_3_SENTENCES.length,
        isUnlocked: parsed[3]?.isManuallyUnlockedByParent || (parsed[2]?.accuracyPercent >= 60 && parsed[2]?.masteredCount >= 4),
      },
      4: {
        ...defaults[4],
        ...parsed[4],
        totalAvailable: LEVEL_4_STORIES.length,
        isUnlocked: parsed[4]?.isManuallyUnlockedByParent || (parsed[3]?.accuracyPercent >= 60 && parsed[3]?.masteredCount >= 3),
      },
    };
  } catch (e) {
    return getDefaultLevelProgress();
  }
}

/**
 * Save level progress
 */
function saveReadLevelProgress(data: Record<1 | 2 | 3 | 4, ReadLevelProgress>): void {
  try {
    localStorage.setItem(READ_PROGRESS_STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event('readbuddy_reading_progress_updated'));
  } catch (e) {
    console.warn('Could not save read progress', e);
  }
}

/**
 * Parent manual unlock / lock override for any level
 */
export function toggleParentLevelUnlock(levelNumber: 1 | 2 | 3 | 4, unlock: boolean): void {
  const current = getReadLevelProgress();
  current[levelNumber].isManuallyUnlockedByParent = unlock;
  if (unlock) {
    current[levelNumber].isUnlocked = true;
  }
  saveReadLevelProgress(current);
}

/**
 * Get reading history log
 */
export function getReadSessionHistory(): ReadSessionHistoryItem[] {
  try {
    const raw = localStorage.getItem(READ_HISTORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Record a completed reading session
 */
export function recordReadSessionHistory(session: Omit<ReadSessionHistoryItem, 'id' | 'timestamp' | 'dateFormatted'>): void {
  try {
    const list = getReadSessionHistory();
    const newItem: ReadSessionHistoryItem = {
      ...session,
      id: `read_sess_${Date.now()}`,
      timestamp: Date.now(),
      dateFormatted: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    };

    const updated = [newItem, ...list].slice(0, 50); // Keep last 50
    localStorage.setItem(READ_HISTORY_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Could not save read history', e);
  }
}

/**
 * Analyze speech recording specifically for READ module:
 * Distinguishes Reading Recognition (Did child attempt the word?) from Pronunciation/Speech Clarity.
 * Applies supportive child-friendly feedback rules.
 */
export function analyzeReadingAttempt(
  expectedText: string,
  spokenTranscript: string,
  attemptNumber: number,
  language: AppLanguage = 'en'
): ReadAttemptResult {
  const cleanExp = cleanWord(expectedText, 'en').toLowerCase();
  const cleanSpk = cleanWord(spokenTranscript, 'en').toLowerCase();

  const similarity = wordSimilarity(cleanExp, cleanSpk);
  const isExact = cleanExp === cleanSpk;

  // Recognition check: Did child say the intended word or a close approximation?
  // e.g. "wabbit" for "rabbit", "cat" for "cap"
  const isRecognized = isExact || similarity >= 0.65 || (cleanSpk.length > 0 && cleanExp.includes(cleanSpk));

  // Clarity score: 0 to 100%
  const clarityScore = isExact ? 100 : Math.round(similarity * 100);

  // Success threshold for advancing: >= 78% clarity or exact
  const isSuccess = isExact || clarityScore >= 78;

  let feedbackTextEn = '';
  let feedbackTextHi = '';
  let educationalTipEn: string | undefined;
  let educationalTipHi: string | undefined;

  if (isSuccess) {
    const positivePhrases = [
      '✓ Great reading!',
      '✓ Nice work!',
      '✓ Excellent reading!',
      '✓ You got it! Well done!'
    ];
    const positivePhrasesHi = [
      '✓ बहुत बढ़िया पठन!',
      '✓ शानदार प्रयास!',
      '✓ बहुत अच्छा उच्चारण!',
      '✓ बिल्कुल सही! शाबाश!'
    ];
    const pick = Math.floor(Math.random() * positivePhrases.length);
    feedbackTextEn = positivePhrases[pick];
    feedbackTextHi = positivePhrasesHi[pick];
  } else if (isRecognized) {
    // Child attempted word but pronunciation differs
    feedbackTextEn = attemptNumber < 3
      ? "Good try! Let's say it once more clearly."
      : "You are getting better! Great effort.";
    feedbackTextHi = attemptNumber < 3
      ? "अच्छा प्रयास! एक बार और स्पष्ट आवाज़ में बोलें।"
      : "आप निरंतर सीख रहे हैं! बहुत अच्छा प्रयास।";

    educationalTipEn = "Word recognized! Additional pronunciation practice will build clarity.";
    educationalTipHi = "शब्द की पहचान सही है! थोड़े और अभ्यास से आवाज़ और स्पष्ट होगी।";
  } else {
    // Speech was unclear or empty
    feedbackTextEn = attemptNumber < 3
      ? "Let's try this word again. Listen and repeat!"
      : "3 attempts completed! Great effort!";
    feedbackTextHi = attemptNumber < 3
      ? "आइए इसे दोबारा आज़माएं। सुनकर दोहराएं!"
      : "३ प्रयास पूरे हुए! बहुत अच्छा प्रयास!";

    educationalTipEn = "Listen to the audio first, then speak clearly into the microphone.";
    educationalTipHi = "पहले ऑडियो सुनें, फिर माइक में स्पष्ट रूप से बोलें।";
  }

  return {
    isRecognized,
    clarityScore,
    isSuccess,
    attemptNumber,
    expectedText,
    spokenText: spokenTranscript || '(Unclear / Silence)',
    feedbackTextEn,
    feedbackTextHi,
    educationalTipEn,
    educationalTipHi,
    needsMorePractice: !isSuccess,
  };
}

/**
 * Record single item result in level progress and adaptive practice bucket
 */
export function recordItemResult(
  levelNumber: 1 | 2 | 3 | 4,
  itemId: string,
  isSuccess: boolean
): void {
  const current = getReadLevelProgress();
  const lvl = current[levelNumber];

  lvl.practicedCount += 1;
  lvl.lastPracticedDate = new Date().toISOString().slice(0, 10);

  if (isSuccess) {
    lvl.masteredCount += 1;
    // Remove from needs practice if mastered
    lvl.needsPracticeList = lvl.needsPracticeList.filter(id => id !== itemId);
    // Award 2 stars for successful reading
    addStars(2);
  } else {
    // Add to adaptive needs practice list (no duplicates)
    if (!lvl.needsPracticeList.includes(itemId)) {
      lvl.needsPracticeList.push(itemId);
    }
  }

  // Calculate level accuracy
  lvl.accuracyPercent = lvl.practicedCount > 0
    ? Math.min(100, Math.round((lvl.masteredCount / lvl.practicedCount) * 100))
    : 0;

  // Auto-unlock next level if threshold reached
  if (lvl.accuracyPercent >= 60 && lvl.masteredCount >= (levelNumber === 1 ? 5 : 4)) {
    const nextLvl = (levelNumber + 1) as 1 | 2 | 3 | 4;
    if (current[nextLvl]) {
      current[nextLvl].isUnlocked = true;
    }
  }

  saveReadLevelProgress(current);
}

/**
 * Get comprehensive Read Overall Dashboard
 */
export function getReadOverallDashboard(): ReadOverallDashboard {
  const levels = getReadLevelProgress();
  const history = getReadSessionHistory();

  let totalPracticed = 0;
  let totalMastered = 0;
  let totalNeedsPractice = 0;

  Object.values(levels).forEach(l => {
    totalPracticed += l.practicedCount;
    totalMastered += l.masteredCount;
    totalNeedsPractice += l.needsPracticeList.length;
  });

  const overallAccuracy = totalPracticed > 0
    ? Math.round((totalMastered / totalPracticed) * 100)
    : 0;

  // Build adaptive practice queue from struggling Level 1 words
  const strugglingIds = levels[1].needsPracticeList;
  const adaptivePracticeQueue = LEVEL_1_SINGLE_WORDS.filter(w => strugglingIds.includes(w.id));

  return {
    currentActiveLevel: levels[4].isUnlocked ? 4 : levels[3].isUnlocked ? 3 : levels[2].isUnlocked ? 2 : 1,
    overallAccuracy,
    totalWordsPracticed: totalPracticed,
    totalWordsMastered: totalMastered,
    totalWordsNeedingPractice: totalNeedsPractice,
    levels,
    recentSessions: history.slice(0, 10),
    adaptivePracticeQueue,
  };
}
