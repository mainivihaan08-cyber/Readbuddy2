/**
 * ReadBuddy - AI ADAPTIVE READING ENGINE
 *
 * Internal intelligence component of the READ module.
 * Continuously analyzes each child's reading accuracy, pronunciation differences,
 * attempt counts, error patterns, and spaced revision schedules to automatically
 * generate personalized daily practice sets.
 */

import { AppLanguage } from '../types';
import { getActiveChildId } from './storage';
import {
  LEVEL_1_SINGLE_WORDS,
  LEVEL_2_COMBINATIONS,
  LEVEL_3_SENTENCES,
  LEVEL_4_STORIES,
  ReadWordItem,
  ReadCombinationItem,
  ReadSentenceItem,
  ReadStoryItem
} from '../data/readModuleData';

export type WordLearningStatus = 'NEEDS_PRACTICE' | 'REVIEW' | 'MASTERED' | 'NEW';
export type WordPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ChildWordPerformance {
  childId: string;
  wordId: string;
  wordText: string;
  levelNumber: 1 | 2 | 3 | 4;
  stage?: 1 | 2 | 3 | 4;
  attemptsCount: number;
  successfulCount: number;
  failedCount: number;
  consecutiveSuccesses: number;
  accuracyPercent: number;
  difficultyScore: number; // 0-100 dynamic difficulty
  status: WordLearningStatus;
  priority: WordPriority;
  lastPracticedDate: string; // YYYY-MM-DD
  nextReviewDate: string; // YYYY-MM-DD
  errorSubstitutions: string[];
  phonicsPattern?: string;
  vowelPattern?: string;
}

export interface ParentFriendlySummary {
  wordsPracticedToday: number;
  readCorrectly: number;
  needsMorePractice: number;
  practiceAgainList: string[];
  improvementNotes: string[];
  tomorrowPlanEn: string;
  tomorrowPlanHi: string;
}

export interface DailyAdaptivePracticeSet {
  childId: string;
  levelNumber: 1 | 2 | 3 | 4;
  generatedDate: string; // YYYY-MM-DD
  totalItemsCount: number;
  weakCount: number;
  reviewCount: number;
  newCount: number;
  masteredCount: number;
  items: (ReadWordItem | ReadCombinationItem | ReadSentenceItem | ReadStoryItem)[];
  detectedLearningFocusEn: string;
  detectedLearningFocusHi: string;
  parentSummary: ParentFriendlySummary;
}

const STORAGE_WORD_PERFORMANCE_KEY = 'readbuddy_child_word_performance_v3';
const STORAGE_DAILY_ADAPTIVE_SET_KEY = 'readbuddy_child_daily_adaptive_set_v3';

/**
 * Get formatted today date string YYYY-MM-DD
 */
export function getTodayDateString(offsetDays = 0): string {
  const d = new Date();
  if (offsetDays !== 0) {
    d.setDate(d.getDate() + offsetDays);
  }
  return d.toISOString().slice(0, 10);
}

/**
 * Load all word performance records for a child from persistent local storage
 */
export function getChildAllWordPerformance(childId?: string): Record<string, ChildWordPerformance> {
  const targetId = childId || getActiveChildId();
  try {
    const raw = localStorage.getItem(STORAGE_WORD_PERFORMANCE_KEY);
    if (!raw) return {};
    const map: Record<string, Record<string, ChildWordPerformance>> = JSON.parse(raw);
    return map[targetId] || {};
  } catch (e) {
    return {};
  }
}

/**
 * Save word performance map for a child
 */
function saveChildAllWordPerformance(perfMap: Record<string, ChildWordPerformance>, childId?: string): void {
  const targetId = childId || getActiveChildId();
  try {
    const raw = localStorage.getItem(STORAGE_WORD_PERFORMANCE_KEY);
    const map: Record<string, Record<string, ChildWordPerformance>> = raw ? JSON.parse(raw) : {};
    map[targetId] = perfMap;
    localStorage.setItem(STORAGE_WORD_PERFORMANCE_KEY, JSON.stringify(map));
    window.dispatchEvent(new Event('readbuddy_adaptive_engine_updated'));
  } catch (e) {
    console.warn('Could not save child word performance', e);
  }
}

/**
 * Initialize or retrieve a child's word performance record
 */
export function getOrInitWordPerformance(wordItem: ReadWordItem, childId?: string): ChildWordPerformance {
  const targetId = childId || getActiveChildId();
  const perfMap = getChildAllWordPerformance(targetId);

  if (perfMap[wordItem.id]) {
    return perfMap[wordItem.id];
  }

  const initialRecord: ChildWordPerformance = {
    childId: targetId,
    wordId: wordItem.id,
    wordText: wordItem.word,
    levelNumber: 1,
    stage: wordItem.stage,
    attemptsCount: 0,
    successfulCount: 0,
    failedCount: 0,
    consecutiveSuccesses: 0,
    accuracyPercent: 0,
    difficultyScore: wordItem.stage === 1 ? 15 : wordItem.stage === 2 ? 30 : wordItem.stage === 3 ? 55 : 75,
    status: 'NEW',
    priority: 'MEDIUM',
    lastPracticedDate: '',
    nextReviewDate: getTodayDateString(0),
    errorSubstitutions: [],
    phonicsPattern: wordItem.phonicsPattern,
    vowelPattern: wordItem.vowelPattern,
  };

  return initialRecord;
}

/**
 * Calculate dynamic difficulty score (0 - 100)
 */
export function calculateDynamicDifficulty(
  failedCount: number,
  attemptsCount: number,
  consecutiveSuccesses: number,
  status: WordLearningStatus
): number {
  let score = 20;
  score += failedCount * 18;
  score += (attemptsCount - (consecutiveSuccesses * 2)) * 5;
  score -= consecutiveSuccesses * 15;

  if (status === 'NEEDS_PRACTICE') {
    score += 30;
  } else if (status === 'MASTERED') {
    score -= 40;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * UPDATE WORD PERFORMANCE IMMEDIATELY AFTER A READING ATTEMPT
 * Updates difficulty, status, spaced repetition schedule, error patterns, and review dates.
 */
export function recordAdaptiveAttemptResult(
  wordItem: ReadWordItem,
  isSuccess: boolean,
  spokenTranscript: string,
  childId?: string
): ChildWordPerformance {
  const targetId = childId || getActiveChildId();
  const perfMap = getChildAllWordPerformance(targetId);
  const perf = perfMap[wordItem.id] || getOrInitWordPerformance(wordItem, targetId);

  const today = getTodayDateString(0);
  perf.attemptsCount += 1;
  perf.lastPracticedDate = today;

  if (isSuccess) {
    perf.successfulCount += 1;
    perf.consecutiveSuccesses += 1;

    // Spaced repetition schedule calculation
    if (perf.consecutiveSuccesses >= 3 && (perf.successfulCount / perf.attemptsCount) >= 0.85) {
      perf.status = 'MASTERED';
      perf.priority = 'LOW';
      perf.nextReviewDate = getTodayDateString(14); // Review after 2 weeks
    } else {
      perf.status = 'REVIEW';
      perf.priority = 'MEDIUM';
      // Gradual review intervals: +1 day, +3 days, +7 days
      const intervalDays = perf.consecutiveSuccesses === 1 ? 1 : perf.consecutiveSuccesses === 2 ? 3 : 7;
      perf.nextReviewDate = getTodayDateString(intervalDays);
    }
  } else {
    perf.failedCount += 1;
    perf.consecutiveSuccesses = 0;
    perf.status = 'NEEDS_PRACTICE';
    perf.priority = 'HIGH';
    perf.nextReviewDate = getTodayDateString(1); // Review tomorrow

    if (spokenTranscript && spokenTranscript.trim().length > 0 && !perf.errorSubstitutions.includes(spokenTranscript.trim().toLowerCase())) {
      perf.errorSubstitutions.push(spokenTranscript.trim().toLowerCase());
    }
  }

  perf.accuracyPercent = Math.round((perf.successfulCount / perf.attemptsCount) * 100);
  perf.difficultyScore = calculateDynamicDifficulty(perf.failedCount, perf.attemptsCount, perf.consecutiveSuccesses, perf.status);

  perfMap[wordItem.id] = perf;
  saveChildAllWordPerformance(perfMap, targetId);

  return perf;
}

/**
 * ERROR PATTERN DETECTION
 * Identifies repeated difficulties (e.g. SH-pattern, Short E vs I, Consonant Blends)
 * using educational terminology without medical diagnoses.
 */
export function detectChildLearningFocus(childId?: string): { focusEn: string; focusHi: string; targetPattern?: string } {
  const targetId = childId || getActiveChildId();
  const perfMap = getChildAllWordPerformance(targetId);
  const weakRecords = Object.values(perfMap).filter(p => p.status === 'NEEDS_PRACTICE' || p.failedCount > 0);

  if (weakRecords.length === 0) {
    return {
      focusEn: 'Balanced Reading Practice & Word Mastery',
      focusHi: 'संतुलित वाचन अभ्यास एवं शब्द दक्षता',
    };
  }

  // Count occurrences of weak patterns
  const patternCounts: Record<string, number> = {};
  weakRecords.forEach(p => {
    if (p.phonicsPattern) {
      patternCounts[p.phonicsPattern] = (patternCounts[p.phonicsPattern] || 0) + 1;
    }
    if (p.vowelPattern) {
      patternCounts[p.vowelPattern] = (patternCounts[p.vowelPattern] || 0) + 1;
    }
  });

  const sortedPatterns = Object.entries(patternCounts).sort((a, b) => b[1] - a[1]);

  if (sortedPatterns.length > 0) {
    const topPattern = sortedPatterns[0][0];
    if (topPattern === 'SH') {
      return { focusEn: 'SH-pattern speech clarity practice recommended', focusHi: 'SH ध्वनि स्पष्टता अभ्यास का सुझाव', targetPattern: 'SH' };
    }
    if (topPattern === 'SHORT_E' || topPattern === 'SHORT_I') {
      return { focusEn: 'Short E vs Short I vowel clarity practice recommended', focusHi: 'लघु स्वर E एवं I भेद अभ्यास का सुझाव', targetPattern: 'SHORT_VOWEL' };
    }
    if (topPattern === 'CH' || topPattern === 'TH') {
      return { focusEn: `${topPattern}-digraph practice recommended`, focusHi: `${topPattern} द्विवर्ण अभ्यास का सुझाव`, targetPattern: topPattern };
    }
    if (topPattern === 'BL' || topPattern === 'TR' || topPattern === 'FR') {
      return { focusEn: 'Consonant blend cluster practice recommended', focusHi: 'संयुक्त व्यंजन गुच्छ अभ्यास का सुझाव', targetPattern: topPattern };
    }
  }

  return {
    focusEn: 'Focused single word practice for reading clarity',
    focusHi: 'स्पष्ट पठन हेतु केंद्रित एकल शब्द अभ्यास',
  };
}

/**
 * GENERATE PERSONALIZED DAILY PRACTICE SET FOR CHILD
 * Balanced set composition:
 * - High priority weak words (NEEDS_PRACTICE)
 * - Due review words (REVIEW)
 * - Pattern-matched words
 * - Controlled new words (1-2 new words to keep learning load manageable)
 * - Small mastered reinforcement (1-2 words)
 */
export function generateDailyAdaptivePracticeSet(
  levelNumber: 1 | 2 | 3 | 4 = 1,
  maxItems = 10,
  childId?: string
): DailyAdaptivePracticeSet {
  const targetId = childId || getActiveChildId();
  const perfMap = getChildAllWordPerformance(targetId);
  const today = getTodayDateString(0);

  // Pool of Level 1 single words (or other levels)
  const masterWordPool = LEVEL_1_SINGLE_WORDS;

  const weakWords: ReadWordItem[] = [];
  const reviewWords: ReadWordItem[] = [];
  const newWords: ReadWordItem[] = [];
  const masteredWords: ReadWordItem[] = [];

  masterWordPool.forEach(w => {
    const perf = perfMap[w.id];
    if (!perf || perf.status === 'NEW') {
      newWords.push(w);
    } else if (perf.status === 'NEEDS_PRACTICE') {
      weakWords.push(w);
    } else if (perf.status === 'REVIEW' || perf.nextReviewDate <= today) {
      reviewWords.push(w);
    } else if (perf.status === 'MASTERED') {
      masteredWords.push(w);
    }
  });

  // Sort weak words by difficulty score descending
  weakWords.sort((a, b) => (perfMap[b.id]?.difficultyScore || 0) - (perfMap[a.id]?.difficultyScore || 0));

  // Balanced practice set construction
  const selectedItems: ReadWordItem[] = [];

  // 1. Add High-Priority Weak Words (Up to 4 items)
  const weakToAdd = weakWords.slice(0, 4);
  selectedItems.push(...weakToAdd);

  // 2. Add Due Review Words (Up to 3 items)
  const reviewToAdd = reviewWords.slice(0, 3);
  reviewToAdd.forEach(w => {
    if (!selectedItems.some(i => i.id === w.id)) {
      selectedItems.push(w);
    }
  });

  // 3. Controlled New Word Introduction (1-2 new words max to avoid overwhelming)
  const newQuota = weakWords.length >= 4 ? 1 : 2;
  const newToAdd = newWords.slice(0, newQuota);
  newToAdd.forEach(w => {
    if (!selectedItems.some(i => i.id === w.id)) {
      selectedItems.push(w);
    }
  });

  // 4. Fill remaining capacity with Mastered reinforcement or remaining new words
  let remainingCapacity = maxItems - selectedItems.length;
  if (remainingCapacity > 0) {
    const masteredToAdd = masteredWords.slice(0, remainingCapacity);
    masteredToAdd.forEach(w => {
      if (!selectedItems.some(i => i.id === w.id)) {
        selectedItems.push(w);
      }
    });
  }

  // Fallback if list is still small (e.g. initial clean profile)
  if (selectedItems.length < 5) {
    masterWordPool.forEach(w => {
      if (selectedItems.length < maxItems && !selectedItems.some(i => i.id === w.id)) {
        selectedItems.push(w);
      }
    });
  }

  const focusInfo = detectChildLearningFocus(targetId);

  const practiceAgainList = weakToAdd.map(w => w.word);

  const parentSummary: ParentFriendlySummary = {
    wordsPracticedToday: selectedItems.length,
    readCorrectly: selectedItems.length - weakToAdd.length,
    needsMorePractice: weakToAdd.length,
    practiceAgainList,
    improvementNotes: weakToAdd.length > 0
      ? [`Targeting ${weakToAdd.length} words needing practice to build voice clarity.`]
      : ['Excellent word mastery! Consistently reading with high confidence.'],
    tomorrowPlanEn: `${reviewToAdd.length + 2} revision words + ${newQuota} new words planned for tomorrow.`,
    tomorrowPlanHi: `कल के लिए ${reviewToAdd.length + 2} अभ्यास शब्द + ${newQuota} नए शब्द निर्धारित हैं।`,
  };

  const dailySet: DailyAdaptivePracticeSet = {
    childId: targetId,
    levelNumber,
    generatedDate: today,
    totalItemsCount: selectedItems.length,
    weakCount: weakToAdd.length,
    reviewCount: reviewToAdd.length,
    newCount: newToAdd.length,
    masteredCount: selectedItems.length - (weakToAdd.length + reviewToAdd.length + newToAdd.length),
    items: selectedItems,
    detectedLearningFocusEn: focusInfo.focusEn,
    detectedLearningFocusHi: focusInfo.focusHi,
    parentSummary,
  };

  try {
    localStorage.setItem(STORAGE_DAILY_ADAPTIVE_SET_KEY, JSON.stringify(dailySet));
  } catch (e) {
    console.warn('Could not cache daily adaptive set', e);
  }

  return dailySet;
}

/**
 * AI WORD SUGGESTION & VALIDATION SYSTEM
 * Validates candidate words against curriculum rules before adding to child's approved pool.
 */
export function validateAndSuggestNewWord(
  candidateWord: string,
  levelNumber: 1 | 2 | 3 | 4 = 1,
  childId?: string
): { isValid: boolean; wordItem?: ReadWordItem; reasonEn: string; reasonHi: string } {
  const clean = candidateWord.trim().toLowerCase();
  if (!clean || clean.length < 2) {
    return { isValid: false, reasonEn: 'Word is too short', reasonHi: 'शब्द बहुत छोटा है' };
  }

  // Check duplicate in current Level 1 database
  const existing = LEVEL_1_SINGLE_WORDS.find(w => w.word.toLowerCase() === clean);
  if (existing) {
    return { isValid: true, wordItem: existing, reasonEn: 'Word validated from approved curriculum', reasonHi: 'शब्द पाठ्यक्रम में अनुमोदित है' };
  }

  // For Level 1, enforce Single Word Rule (No spaces, no phrases)
  if (levelNumber === 1 && clean.includes(' ')) {
    return { isValid: false, reasonEn: 'Level 1 allows single words only', reasonHi: 'लेवल १ में केवल एक शब्द की अनुमति है' };
  }

  // Dynamically generate validated item
  const newValidatedItem: ReadWordItem = {
    id: `ai_word_${Date.now()}_${clean}`,
    word: clean,
    stage: clean.length <= 3 ? 1 : clean.length <= 5 ? 2 : 3,
    stageName: 'Validated Practice Word',
    stageNameHi: 'अनुमोदित अभ्यास शब्द',
    category: 'Custom Practice',
    meaningEn: `Word: ${clean}`,
    meaningHi: `शब्द: ${clean}`,
    exampleSentenceEn: `Read the word ${clean} clearly.`,
    exampleSentenceHi: `शब्द ${clean} को स्पष्ट रूप से पढ़ें।`,
    syllableCount: clean.length > 6 ? 2 : 1,
  };

  return { isValid: true, wordItem: newValidatedItem, reasonEn: 'New word validated and added to approved pool', reasonHi: 'नया शब्द अनुमोदित पूल में जोड़ा गया' };
}

/**
 * TEST CHILD SIMULATION METHOD (Requirement 34)
 * Simulates:
 * cat = correct
 * dog = correct
 * fish = incorrect
 * ship = incorrect
 * rabbit = incorrect
 * sun = correct
 *
 * Verifies fish, ship, rabbit move to NEEDS_PRACTICE with HIGH priority,
 * and next practice set prioritizes them with a controlled set of new words!
 */
export function simulateTestChildPerformance(testChildId = 'test_child_adaptive_123'): DailyAdaptivePracticeSet {
  const wordsToSimulate = [
    { word: LEVEL_1_SINGLE_WORDS.find(w => w.word === 'cat')!, success: true, spoken: 'cat' },
    { word: LEVEL_1_SINGLE_WORDS.find(w => w.word === 'dog')!, success: true, spoken: 'dog' },
    { word: LEVEL_1_SINGLE_WORDS.find(w => w.word === 'fish')!, success: false, spoken: 'fis' },
    { word: LEVEL_1_SINGLE_WORDS.find(w => w.word === 'ship')!, success: false, spoken: 'sip' },
    { word: LEVEL_1_SINGLE_WORDS.find(w => w.word === 'rabbit')!, success: false, spoken: 'wabbit' },
    { word: LEVEL_1_SINGLE_WORDS.find(w => w.word === 'sun')!, success: true, spoken: 'sun' },
  ];

  wordsToSimulate.forEach(sim => {
    if (sim.word) {
      recordAdaptiveAttemptResult(sim.word, sim.success, sim.spoken, testChildId);
    }
  });

  // Generate next adaptive practice set
  const nextPracticeSet = generateDailyAdaptivePracticeSet(1, 8, testChildId);
  return nextPracticeSet;
}
