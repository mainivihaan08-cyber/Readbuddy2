import {
  AppLanguage,
  WordAnalysis,
  WordAttemptRecord,
  WordAttemptResult,
  WordErrorType,
  WordDifficultyStatus,
  WordDifficultyTrend,
  ChildWordProfile,
  DailyWordProgress,
  WeeklyWordProgress,
  AdaptiveWordPracticeSet
} from '../types';
import { openDB, STORE_WORD_ATTEMPTS, getActiveChildId } from './storage';

// In-memory cache for fast responsive lookups during active session
const memoryWordAttemptsCache: Record<string, WordAttemptRecord[]> = {};

/**
 * Phoneme mappings for English and Hindi
 */
const ENGLISH_PHONEME_PATTERNS: Array<{
  sound: string;
  name: string;
  regex: RegExp;
  vowelPairExample: string;
  simpleWord: string;
  practiceTip: string;
}> = [
  { sound: 'r', name: '/r/ (Rolling R)', regex: /r/i, vowelPairExample: 'ra · ree · ro', simpleWord: 'red', practiceTip: 'Curl tongue tip gently up towards the roof of your mouth without touching teeth.' },
  { sound: 'th', name: '/θ/ (Voiceless TH)', regex: /th/i, vowelPairExample: 'tha · thee · tho', simpleWord: 'thin', practiceTip: 'Place tongue tip lightly between teeth and blow gentle air.' },
  { sound: 'sh', name: '/ʃ/ (SH Sound)', regex: /sh/i, vowelPairExample: 'sha · shee · sho', simpleWord: 'ship', practiceTip: 'Round lips forward and make a gentle quiet "hushing" sound.' },
  { sound: 'ch', name: '/tʃ/ (CH Sound)', regex: /ch/i, vowelPairExample: 'cha · chee · cho', simpleWord: 'chin', practiceTip: 'Stop air briefly behind teeth then release with an energetic puff.' },
  { sound: 's', name: '/s/ (Hissing S)', regex: /s/i, vowelPairExample: 'sa · see · so', simpleWord: 'sun', practiceTip: 'Keep teeth lightly together and let steady air hiss down the center of tongue.' },
  { sound: 'l', name: '/l/ (Light L)', regex: /l/i, vowelPairExample: 'la · lee · lo', simpleWord: 'leg', practiceTip: 'Touch tongue tip firmly to the ridge behind top front teeth.' },
  { sound: 'v', name: '/v/ (Biting V)', regex: /v/i, vowelPairExample: 'va · vee · vo', simpleWord: 'van', practiceTip: 'Touch top teeth gently to bottom lip and turn on your vocal buzz.' },
  { sound: 'w', name: '/w/ (Rounding W)', regex: /w/i, vowelPairExample: 'wa · wee · wo', simpleWord: 'wet', practiceTip: 'Pucker lips tightly into a circle then open smoothly into the vowel.' },
  { sound: 'k', name: '/k/ (Back K)', regex: /k|ck|c(?=[aou])/i, vowelPairExample: 'ka · kee · ko', simpleWord: 'cat', practiceTip: 'Raise back of tongue to soft palate and release a sharp burst of air.' },
  { sound: 'g', name: '/ɡ/ (Voiced G)', regex: /g/i, vowelPairExample: 'ga · gee · go', simpleWord: 'go', practiceTip: 'Raise back of tongue and add vocal vibration on release.' },
];

const HINDI_PHONEME_PATTERNS: Array<{
  sound: string;
  name: string;
  regex: RegExp;
  vowelPairExample: string;
  simpleWord: string;
  practiceTip: string;
}> = [
  { sound: 'र', name: 'र (Rolling R)', regex: /र|ृ|्र|र्/i, vowelPairExample: 'रा · री · रो', simpleWord: 'रात', practiceTip: 'जीभ की नोक को तालू के पास थोड़ा घुमाकर कंपन पैदा करें।' },
  { sound: 'श', name: 'श (Talavya Sha)', regex: /श/i, vowelPairExample: 'शा · शी · शो', simpleWord: 'शहर', practiceTip: 'जीभ के बीच के भाग को तालू के पास ले जाकर हल्की फुसफुसाहट निकालें।' },
  { sound: 'ष', name: 'ष (Murdhanya Sha)', regex: /ष/i, vowelPairExample: 'षा · षी · षो', simpleWord: 'भाषा', practiceTip: 'जीभ को थोड़ा पीछे मोड़कर हवा को बाहर छोड़ें।' },
  { sound: 'स', name: 'स (Dantya Sa)', regex: /स/i, vowelPairExample: 'सा · सी · सो', simpleWord: 'सूरज', practiceTip: 'दांतों को हल्का मिलाकर जीभ के बीच से सीटी जैसी ध्वनि निकालें।' },
  { sound: 'ल', name: 'ल (La)', regex: /ल/i, vowelPairExample: 'ला · ली · लो', simpleWord: 'लाल', practiceTip: 'जीभ की नोक को ऊपरी मसूड़े से छूकर हवा दोनों तरफ से निकालें।' },
  { sound: 'ण', name: 'ण (Nna)', regex: /ण/i, vowelPairExample: 'णा · णी · णो', simpleWord: 'बाण', practiceTip: 'जीभ को तालू के पिछले हिस्से में स्पर्श कराकर नासिका से ध्वनि निकालें।' },
  { sound: 'व', name: 'व (Va)', regex: /व/i, vowelPairExample: 'वा · वी · वो', simpleWord: 'वन', practiceTip: 'ऊपरी दांतों को निचले होंठ से हल्का स्पर्श कराएं।' },
  { sound: 'क्ष', name: 'क्ष (Ksha)', regex: /क्ष/i, vowelPairExample: 'क्षा · क्षी · क्षो', simpleWord: 'कक्षा', practiceTip: '"क्" और "ष्" को जोड़कर तेजी से बोलें।' },
  { sound: 'ज्ञ', name: 'ज्ञ (Gya)', regex: /ज्ञ/i, vowelPairExample: 'ज्ञा · ज्ञी · ज्ञो', simpleWord: 'ज्ञान', practiceTip: '"ज्" और "ञ" (ग्य) की मिलीजुली स्पष्ट ध्वनि निकालें।' },
];

/**
 * Clean & normalize a word for uniform matching
 */
export function normalizeTargetWord(word: string): string {
  if (!word) return '';
  return word
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'।?!]/g, '')
    .trim();
}

/**
 * Identify primary phoneme sound for a word
 */
export function detectPrimarySound(word: string, language: AppLanguage): string {
  const norm = normalizeTargetWord(word);
  if (language === 'hi') {
    for (const p of HINDI_PHONEME_PATTERNS) {
      if (p.regex.test(norm)) return p.sound;
    }
    return norm.charAt(0) || 'ध्वनि';
  } else {
    for (const p of ENGLISH_PHONEME_PATTERNS) {
      if (p.regex.test(norm)) return p.sound;
    }
    return norm.charAt(0) || 'sound';
  }
}

/**
 * Estimate syllable breakdown for child practice
 */
export function getWordSyllables(word: string, language: AppLanguage): string {
  const norm = normalizeTargetWord(word);
  if (language === 'hi') {
    // Hindi syllable chunking roughly by aksharas
    return norm.split('').join(' · ');
  }
  // English common syllable chunking heuristics
  if (norm.length <= 3) return norm;
  if (norm.length <= 5) return norm.slice(0, 3) + ' · ' + norm.slice(3);
  if (norm.length <= 7) return norm.slice(0, 3) + ' · ' + norm.slice(3, 5) + ' · ' + norm.slice(5);
  return norm.slice(0, 3) + ' · ' + norm.slice(3, 6) + ' · ' + norm.slice(6);
}

/**
 * Record word attempts into permanent IndexedDB store
 * Strictly scoped to childId
 */
export async function recordWordAttempts(
  wordAnalysisList: WordAnalysis[],
  sessionId: string,
  recordingId: string | undefined,
  language: AppLanguage,
  childId?: string
): Promise<WordAttemptRecord[]> {
  const targetChildId = childId || getActiveChildId();
  const todayStr = new Date().toISOString().slice(0, 10);
  const now = Date.now();

  const newAttempts: WordAttemptRecord[] = [];

  // Track within-session word repetition to calculate in-session retry counts
  const wordOccurrenceInSession: Record<string, number> = {};

  for (let i = 0; i < wordAnalysisList.length; i++) {
    const item = wordAnalysisList[i];
    if (item.status === 'pending') continue;

    const rawTarget = item.expected || item.cleaned || '';
    const norm = normalizeTargetWord(rawTarget);
    if (!norm) continue;

    wordOccurrenceInSession[norm] = (wordOccurrenceInSession[norm] || 0) + 1;
    const attemptNumber = wordOccurrenceInSession[norm];

    // Determine Result & Confidence (distinguishing ASR from genuine pronunciation evidence)
    let result: WordAttemptResult = 'correct';
    let confidence = 0.95;
    let errorType: WordErrorType | undefined = undefined;

    if (item.status === 'correct') {
      result = 'correct';
      confidence = 0.95;
    } else if (item.status === 'needs-practice') {
      if (item.detectedSubstitution) {
        result = 'incorrect';
        errorType = 'substitution';
        confidence = 0.88;
      } else if (item.spoken && item.spoken.length > 0) {
        result = 'incorrect';
        errorType = 'distortion';
        confidence = 0.82;
      } else {
        result = 'uncertain';
        errorType = 'unclear';
        confidence = 0.40;
      }
    } else if (item.status === 'not-heard') {
      result = 'incorrect';
      errorType = 'omission';
      confidence = 0.75;
    }

    const primarySound = detectPrimarySound(norm, language);

    const record: WordAttemptRecord = {
      id: `wa_${now}_${Math.random().toString(36).slice(2, 7)}_${i}`,
      childId: targetChildId,
      sessionId,
      recordingId,
      targetWord: rawTarget,
      normalizedWord: norm,
      language,
      attemptNumber,
      result,
      confidence,
      observedText: item.spoken,
      errorType,
      primarySound,
      createdAt: now + i,
      dateStr: todayStr,
    };

    newAttempts.push(record);
  }

  if (newAttempts.length === 0) return [];

  // 1. Update in-memory cache
  if (!memoryWordAttemptsCache[targetChildId]) {
    memoryWordAttemptsCache[targetChildId] = [];
  }
  memoryWordAttemptsCache[targetChildId].push(...newAttempts);

  // 2. Persist in IndexedDB
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_WORD_ATTEMPTS], 'readwrite');
    const store = tx.objectStore(STORE_WORD_ATTEMPTS);

    for (const rec of newAttempts) {
      store.put(rec);
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('readbuddy_word_difficulty_updated'));
    }
  } catch (err) {
    console.warn('[WordDifficultyEngine] Error persisting word attempts to IndexedDB:', err);
  }

  return newAttempts;
}

/**
 * Fetch raw word attempt records from IndexedDB for a child
 * Strictly child-scoped. Never returns demo or other child's data.
 */
export async function getWordAttemptsForChild(
  childId?: string,
  targetWord?: string
): Promise<WordAttemptRecord[]> {
  const targetChildId = childId || getActiveChildId();

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_WORD_ATTEMPTS], 'readonly');
      const store = tx.objectStore(STORE_WORD_ATTEMPTS);
      const req = store.getAll();

      req.onsuccess = () => {
        const all = req.result as WordAttemptRecord[];
        let filtered = all.filter((r) => r.childId === targetChildId);
        if (targetWord) {
          const norm = normalizeTargetWord(targetWord);
          filtered = filtered.filter((r) => r.normalizedWord === norm);
        }
        filtered.sort((a, b) => a.createdAt - b.createdAt);
        // Sync cache
        memoryWordAttemptsCache[targetChildId] = filtered;
        resolve(filtered);
      };

      req.onerror = () => {
        resolve(memoryWordAttemptsCache[targetChildId] || []);
      };
    });
  } catch {
    return memoryWordAttemptsCache[targetChildId] || [];
  }
}

/**
 * Calculate dynamic aggregated Word Profiles for a child
 * Fulfills Requirements 4, 5, 6, 7, 8, 9, 10, 12, 13, 26
 */
export async function getChildWordProfiles(
  language?: AppLanguage,
  childId?: string
): Promise<ChildWordProfile[]> {
  const targetChildId = childId || getActiveChildId();
  const allAttempts = await getWordAttemptsForChild(targetChildId);

  if (allAttempts.length === 0) {
    return [];
  }

  // Filter by language if specified
  const filteredAttempts = language ? allAttempts.filter((a) => a.language === language) : allAttempts;

  // Group attempts by normalized word
  const wordGroups: Record<string, WordAttemptRecord[]> = {};
  for (const att of filteredAttempts) {
    if (!wordGroups[att.normalizedWord]) {
      wordGroups[att.normalizedWord] = [];
    }
    wordGroups[att.normalizedWord].push(att);
  }

  const profiles: ChildWordProfile[] = [];

  for (const [normWord, attempts] of Object.entries(wordGroups)) {
    if (attempts.length === 0) continue;

    // Sort chronologically
    attempts.sort((a, b) => a.createdAt - b.createdAt);

    const firstAtt = attempts[0];
    const lastAtt = attempts[attempts.length - 1];
    const lang = firstAtt.language;
    const rawWord = lastAtt.targetWord || normWord;

    const totalAttempts = attempts.length;
    const correctAttempts = attempts.filter((a) => a.result === 'correct').length;
    const incorrectAttempts = attempts.filter((a) => a.result === 'incorrect').length;
    const uncertainAttempts = attempts.filter((a) => a.result === 'uncertain').length;
    const validAttempts = correctAttempts + incorrectAttempts;

    // 1. Lifetime Accuracy
    const accuracy = validAttempts > 0 ? Math.round((correctAttempts / validAttempts) * 100) : 0;

    // 2. Recent Performance (Last 5 to 8 attempts with recency weighting)
    const recentSlice = attempts.slice(-8);
    const recentResults = recentSlice.map((a) => a.result);
    const recentValid = recentSlice.filter((a) => a.result !== 'uncertain');
    const recentCorrect = recentSlice.filter((a) => a.result === 'correct').length;
    const recentAccuracy = recentValid.length > 0 ? Math.round((recentCorrect / recentValid.length) * 100) : accuracy;

    // 3. Consecutive correct attempts at the end
    let consecutiveCorrect = 0;
    for (let i = attempts.length - 1; i >= 0; i--) {
      if (attempts[i].result === 'correct') {
        consecutiveCorrect += 1;
      } else if (attempts[i].result === 'incorrect') {
        break;
      }
    }

    // 4. In-session retries count (attempts > 1 within same session)
    const sessionGroup: Record<string, number> = {};
    let retryCount = 0;
    for (const a of attempts) {
      sessionGroup[a.sessionId] = (sessionGroup[a.sessionId] || 0) + 1;
      if (sessionGroup[a.sessionId] > 1) {
        retryCount += 1;
      }
    }

    // 5. Older vs Recent trend calculation
    const olderAttempts = attempts.slice(0, Math.max(1, attempts.length - 5));
    const olderValid = olderAttempts.filter((a) => a.result !== 'uncertain');
    const olderCorrect = olderValid.filter((a) => a.result === 'correct').length;
    const olderAccuracy = olderValid.length > 0 ? Math.round((olderCorrect / olderValid.length) * 100) : accuracy;

    // 6. Mastery System (Requirement 10)
    // Mastered requires: min 5 valid attempts, recent accuracy >= 90%, at least 3 consecutive correct, no repeated recent failures
    const isMastered =
      validAttempts >= 5 &&
      recentAccuracy >= 90 &&
      consecutiveCorrect >= 3 &&
      recentSlice.slice(-2).every((a) => a.result === 'correct');

    let currentStatus: WordDifficultyStatus = 'stable';
    let trend: WordDifficultyTrend = 'stable';

    if (validAttempts < 2) {
      currentStatus = 'insufficient-data';
      trend = 'insufficient-data';
    } else if (isMastered) {
      currentStatus = 'mastered';
      trend = 'mastered';
    } else if (validAttempts >= 3 && recentAccuracy >= 75 && recentAccuracy > olderAccuracy + 12) {
      currentStatus = 'improving';
      trend = 'improving';
    } else if (validAttempts >= 4 && olderAccuracy >= 70 && recentAccuracy < 60) {
      currentStatus = 'declining';
      trend = 'declining';
    } else if (recentAccuracy < 70 || retryCount >= 2 || (validAttempts >= 2 && correctAttempts === 0)) {
      currentStatus = 'needs-practice';
      trend = 'needs-attention';
    } else {
      currentStatus = 'stable';
      trend = 'stable';
    }

    // 7. Difficulty Priority Calculation (Requirement 12)
    // Balances error rate, total attempts, recent errors, retries, recency, trend, confidence
    const recentErrors = recentSlice.filter((a) => a.result === 'incorrect').length;
    const evidenceScaling = Math.min(1.0, validAttempts / 3.5);
    const errorPenalty = (100 - recentAccuracy) * 0.45;
    const failureVolume = incorrectAttempts * 2.5;
    const retryVolume = retryCount * 1.8;
    const recentErrorVolume = recentErrors * 4.0;
    const consecutiveDiscount = consecutiveCorrect * 6.0;

    let priorityScore =
      (errorPenalty + failureVolume + retryVolume + recentErrorVolume) * evidenceScaling - consecutiveDiscount;

    if (isMastered) {
      priorityScore = 0;
    }
    const difficultyPriority = Math.max(0, Math.round(priorityScore * 10) / 10);

    const primarySound = detectPrimarySound(normWord, lang);
    const syllables = getWordSyllables(rawWord, lang);

    // 8. Recommended Action Formulation (Non-medical, constructive)
    let recommendedAction = '';
    if (isMastered) {
      recommendedAction = lang === 'en' ? 'Mastered! Review periodically.' : 'कंठस्थ! समय-समय पर दोहराएं।';
    } else if (currentStatus === 'improving') {
      recommendedAction = lang === 'en' ? 'Keep momentum! Practice in short sentences.' : 'प्रगति जारी रखें! वाक्यों में प्रयोग करें।';
    } else if (currentStatus === 'declining') {
      recommendedAction = lang === 'en' ? `Revisit /${primarySound}/ sound cards slowly.` : `/${primarySound}/ ध्वनि को पुनः धीरे-धीरे दोहराएं।`;
    } else if (currentStatus === 'needs-practice') {
      recommendedAction = lang === 'en' ? `Focus on /${primarySound}/ breakdown: "${syllables}".` : `/${primarySound}/ ध्वनि और टुकड़े: "${syllables}" पर ध्यान दें।`;
    } else {
      recommendedAction = lang === 'en' ? 'Continue reading in daily passages.' : 'दैनिक पाठ में अभ्यास जारी रखें।';
    }

    const profile: ChildWordProfile = {
      id: `cwp_${targetChildId}_${lang}_${normWord}`,
      childId: targetChildId,
      word: rawWord,
      normalizedWord: normWord,
      language: lang,
      totalAttempts,
      correctAttempts,
      incorrectAttempts,
      uncertainAttempts,
      validAttempts,
      accuracy,
      recentAccuracy,
      retryCount,
      recentAttempts: recentResults,
      currentStatus,
      trend,
      masteryLevel: isMastered ? 'mastered' : currentStatus === 'improving' ? 'learning' : currentStatus === 'needs-practice' ? 'struggling' : 'new',
      primarySound,
      soundFamily: `/${primarySound}/`,
      difficultyPriority,
      firstPracticedAt: firstAtt.createdAt,
      lastPracticedAt: lastAtt.createdAt,
      lastResult: lastAtt.result,
      recommendedAction,
      syllables,
    };

    profiles.push(profile);
  }

  // Sort default by difficulty priority descending
  profiles.sort((a, b) => b.difficultyPriority - a.difficultyPriority);
  return profiles;
}

/**
 * Get top difficult words needing practice (child-scoped)
 * Fulfills Requirement 12
 */
export async function getTopDifficultWords(
  language?: AppLanguage,
  childId?: string,
  limit = 5
): Promise<ChildWordProfile[]> {
  const allProfiles = await getChildWordProfiles(language, childId);
  // Filter only words that actually need practice and have sufficient evidence
  const difficultWords = allProfiles.filter(
    (p) =>
      p.currentStatus === 'needs-practice' ||
      p.currentStatus === 'declining' ||
      (p.currentStatus === 'insufficient-data' && p.incorrectAttempts > 0)
  );

  difficultWords.sort((a, b) => b.difficultyPriority - a.difficultyPriority);
  return difficultWords.slice(0, limit);
}

/**
 * Phoneme pattern analysis across difficult words
 * Fulfills Requirements 13 & 14
 */
export function getSoundPatternAnalysis(
  profiles: ChildWordProfile[],
  language: AppLanguage
): {
  topProblemSound?: string;
  affectedWords: string[];
  explanation: string;
  suggestedFocus: string;
} {
  const difficult = profiles.filter(
    (p) => p.currentStatus === 'needs-practice' || p.currentStatus === 'declining' || p.difficultyPriority > 15
  );

  if (difficult.length === 0) {
    return {
      topProblemSound: undefined,
      affectedWords: [],
      explanation:
        language === 'en'
          ? 'No recurring phoneme difficulties detected yet. All practiced words are on track.'
          : 'अभी तक कोई बार-बार होने वाली ध्वनि कठिनाई नहीं मिली है। सभी अभ्यास सही चल रहे हैं।',
      suggestedFocus: language === 'en' ? 'Continue general reading fluency' : 'सामान्य वाचन अभ्यास जारी रखें',
    };
  }

  const soundCount: Record<string, string[]> = {};
  for (const p of difficult) {
    if (p.primarySound) {
      if (!soundCount[p.primarySound]) soundCount[p.primarySound] = [];
      soundCount[p.primarySound].push(p.word);
    }
  }

  let topSound: string | undefined = undefined;
  let maxCount = 0;
  for (const [snd, words] of Object.entries(soundCount)) {
    if (words.length > maxCount) {
      maxCount = words.length;
      topSound = snd;
    }
  }

  if (!topSound || maxCount === 0) {
    return {
      topProblemSound: undefined,
      affectedWords: [],
      explanation:
        language === 'en'
          ? 'Speech attempts are spread evenly without a single dominant phoneme hurdle.'
          : 'अभ्यास में कोई एक मुख्य ध्वनि बाधा नहीं दिखाई दी है।',
      suggestedFocus: language === 'en' ? 'Balanced daily reading' : 'संतुलित दैनिक पठन',
    };
  }

  const words = soundCount[topSound] || [];
  const wordsListFormatted = words.slice(0, 4).map((w) => `"${w}"`).join(', ');

  const explanation =
    language === 'en'
      ? `Several words needing practice (${wordsListFormatted}) contain the /${topSound}/ sound pattern.`
      : `अभ्यास योग्य कई शब्दों (${wordsListFormatted}) में /${topSound}/ ध्वनि का प्रतिरूप देखा गया है।`;

  const suggestedFocus =
    language === 'en'
      ? `Dedicated /${topSound}/ sound drills & syllable pacing`
      : `/${topSound}/ ध्वनि अभ्यास एवं शब्दांश विभाजन`;

  return {
    topProblemSound: topSound,
    affectedWords: words,
    explanation,
    suggestedFocus,
  };
}

/**
 * Calculate Daily Word Progress for today
 * Fulfills Requirement 21
 */
export async function getDailyWordProgress(
  language: AppLanguage,
  childId?: string
): Promise<DailyWordProgress> {
  const targetChildId = childId || getActiveChildId();
  const todayStr = new Date().toISOString().slice(0, 10);
  const allAttempts = await getWordAttemptsForChild(targetChildId);

  const todayAttempts = allAttempts.filter(
    (a) => a.dateStr === todayStr && (!language || a.language === language)
  );

  const uniqueWordsPracticed = Array.from(new Set(todayAttempts.map((a) => a.normalizedWord)));
  const correctCount = todayAttempts.filter((a) => a.result === 'correct').length;

  const profiles = await getChildWordProfiles(language, targetChildId);

  const needsAttentionWords = profiles
    .filter((p) => p.currentStatus === 'needs-practice' && todayAttempts.some((a) => a.normalizedWord === p.normalizedWord))
    .map((p) => p.word);

  const improvedToday = profiles
    .filter((p) => p.currentStatus === 'improving' && todayAttempts.some((a) => a.normalizedWord === p.normalizedWord))
    .map((p) => p.word);

  const masteredToday = profiles
    .filter((p) => p.currentStatus === 'mastered' && todayAttempts.some((a) => a.normalizedWord === p.normalizedWord))
    .map((p) => p.word);

  const pattern = getSoundPatternAnalysis(profiles, language);

  return {
    date: todayStr,
    wordsPracticed: uniqueWordsPracticed.length,
    correctCount,
    needsAttentionWords,
    improvedToday,
    masteredToday,
    mostRepeatedDifficultySound: pattern.topProblemSound,
  };
}

/**
 * Calculate Weekly Word Progress (7 days)
 * Fulfills Requirement 22
 */
export async function getWeeklyWordProgress(
  language: AppLanguage,
  childId?: string
): Promise<WeeklyWordProgress> {
  const targetChildId = childId || getActiveChildId();
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 86400000;
  const allAttempts = await getWordAttemptsForChild(targetChildId);

  const weeklyAttempts = allAttempts.filter(
    (a) => a.createdAt >= sevenDaysAgo && (!language || a.language === language)
  );

  const uniqueWords = Array.from(new Set(weeklyAttempts.map((a) => a.normalizedWord)));
  const profiles = await getChildWordProfiles(language, targetChildId);

  const wordsImproved = profiles.filter((p) => p.currentStatus === 'improving').length;
  const wordsNeedingContinuedPractice = profiles.filter((p) => p.currentStatus === 'needs-practice').length;
  const wordsMastered = profiles.filter((p) => p.currentStatus === 'mastered').length;
  const wordsDeclining = profiles.filter((p) => p.currentStatus === 'declining').length;

  const topRecurringDifficultWords = await getTopDifficultWords(language, targetChildId, 5);
  const pattern = getSoundPatternAnalysis(profiles, language);

  return {
    wordsPracticed: uniqueWords.length,
    wordsImproved,
    wordsNeedingContinuedPractice,
    wordsMastered,
    wordsDeclining,
    topRecurringDifficultWords,
    recurringSoundPattern: pattern.topProblemSound,
    recurringSoundExampleWords: pattern.affectedWords,
  };
}

/**
 * Generate a 5-Level Adaptive Practice Set for any difficult word
 * Fulfills Requirements 18, 19, 20
 * Level 1: Sound alone
 * Level 2: Sound + vowel
 * Level 3: Simple word
 * Level 4: Target word with syllable breakdown
 * Level 5: Short sentence in context
 */
export function generateAdaptivePracticeSet(
  targetWord: string,
  language: AppLanguage,
  detectedSound?: string
): AdaptiveWordPracticeSet {
  const norm = normalizeTargetWord(targetWord);
  const primarySound = detectedSound || detectPrimarySound(norm, language);
  const syllables = getWordSyllables(targetWord, language);

  if (language === 'hi') {
    const pattern = HINDI_PHONEME_PATTERNS.find((p) => p.sound === primarySound) || HINDI_PHONEME_PATTERNS[0];
    return {
      word: targetWord,
      language: 'hi',
      primarySound,
      level1Sound: {
        sound: `/${primarySound}/`,
        description: pattern.practiceTip,
      },
      level2SoundVowel: {
        text: pattern.vowelPairExample,
        audioHelp: 'मात्राओं के साथ स्पष्ट उच्चारण का अभ्यास करें',
      },
      level3SimpleWord: {
        text: pattern.simpleWord,
        meaning: `सरल उदाहरण शब्द: ${pattern.simpleWord}`,
      },
      level4TargetWord: {
        text: targetWord,
        syllables,
        slowAudioTip: `टुकड़ों में धीरे-धीरे बोलें: ${syllables}`,
      },
      level5Sentence: {
        text: `हम सब मिलकर "${targetWord}" का शुद्ध और स्पष्ट वाचन करते हैं।`,
        highlightWord: targetWord,
      },
    };
  } else {
    const pattern = ENGLISH_PHONEME_PATTERNS.find((p) => p.sound === primarySound) || ENGLISH_PHONEME_PATTERNS[0];
    return {
      word: targetWord,
      language: 'en',
      primarySound,
      level1Sound: {
        sound: `/${primarySound}/`,
        description: pattern.practiceTip,
      },
      level2SoundVowel: {
        text: pattern.vowelPairExample,
        audioHelp: 'Blend the sound smoothly with open vowels.',
      },
      level3SimpleWord: {
        text: pattern.simpleWord,
        meaning: `Foundation word: "${pattern.simpleWord}"`,
      },
      level4TargetWord: {
        text: targetWord,
        syllables,
        slowAudioTip: `Break into clear syllables: "${syllables}".`,
      },
      level5Sentence: {
        text: `We practice speaking "${targetWord}" with clear and confident voice.`,
        highlightWord: targetWord,
      },
    };
  }
}
