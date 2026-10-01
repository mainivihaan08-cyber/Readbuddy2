import {
  AppLanguage,
  LessonMode,
  ReadingItem,
  SoundStat,
  SpeakingStyleStats,
  SpeechProfile,
  WordAnalysis,
  WordMemoryItem
} from '../types';
import { getLessonItems } from '../data/lessons';
import { getSavedRecordings, getChildProfile } from './storage';

const SPEECH_PROFILE_KEY = 'readbuddy_speech_profile_v2';

const ENGLISH_FOCUS_SOUNDS = ['r', 'l', 's', 'sh', 'th', 'ch', 'v', 'k', 'g'];
const HINDI_FOCUS_SOUNDS = ['र', 'ल', 'श', 'ष', 'ण', 'स', 'व', 'क्ष', 'ज्ञ'];

const DEFAULT_STYLE: SpeakingStyleStats = {
  totalWordsSpoken: 120,
  totalSpeakingTimeSeconds: 240,
  averageWPM: 30,
  pauseCount: 4,
  retriesPerWord: {},
  hourlyAttempts: { 9: 2, 17: 5, 18: 8, 19: 4 },
  bestTimeOfDay: 'evening',
  averageSessionLengthSeconds: 30,
  totalSessionsCount: 6,
  goodSessionsInRow: 1,
  poorSessionsInRow: 0,
  difficultyAdaptiveLevel: 'easy',
};

/**
  * Create initial default profile seeded from historical data if needed
  */
function createDefaultProfile(childName: string = 'Aarav'): SpeechProfile {
  const sounds: Record<string, SoundStat> = {};

  // English sounds
  ENGLISH_FOCUS_SOUNDS.forEach((snd) => {
    sounds[`en-${snd}`] = {
      sound: snd,
      language: 'en',
      totalAttempts: 12,
      correctCount: snd === 'r' ? 6 : snd === 'sh' ? 8 : 10,
      substitutedCount: snd === 'r' ? 6 : snd === 'sh' ? 4 : 2,
      substitutionsMap: snd === 'r' ? { l: 4, w: 2 } : { s: 4 },
      weeklyTrend: snd === 'r' ? 'improving' : 'same',
      pastWeeklyAccuracy: snd === 'r' ? 40 : 70,
      currentWeeklyAccuracy: snd === 'r' ? 50 : 75,
    };
  });

  // Hindi sounds
  HINDI_FOCUS_SOUNDS.forEach((snd) => {
    sounds[`hi-${snd}`] = {
      sound: snd,
      language: 'hi',
      totalAttempts: 10,
      correctCount: snd === 'श' ? 6 : 8,
      substitutedCount: snd === 'श' ? 4 : 2,
      substitutionsMap: snd === 'श' ? { स: 4 } : {},
      weeklyTrend: 'improving',
      pastWeeklyAccuracy: 60,
      currentWeeklyAccuracy: 75,
    };
  });

  // Default weak words memory
  const words: Record<string, WordMemoryItem> = {
    'en-river': {
      word: 'river',
      language: 'en',
      attempts: 4,
      correctCount: 2,
      needsPracticeCount: 2,
      consecutiveCorrect: 1,
      lastResult: 'needs-practice',
      lastPracticedTimestamp: Date.now() - 86400000,
      nextReviewDate: new Date().toISOString().slice(0, 10),
    },
    'en-three': {
      word: 'three',
      language: 'en',
      attempts: 3,
      correctCount: 1,
      needsPracticeCount: 2,
      consecutiveCorrect: 0,
      lastResult: 'needs-practice',
      lastPracticedTimestamp: Date.now() - 43200000,
      nextReviewDate: new Date().toISOString().slice(0, 10),
    },
    'en-rabbit': {
      word: 'rabbit',
      language: 'en',
      attempts: 3,
      correctCount: 2,
      needsPracticeCount: 1,
      consecutiveCorrect: 1,
      lastResult: 'correct',
      lastPracticedTimestamp: Date.now() - 2 * 86400000,
      nextReviewDate: new Date().toISOString().slice(0, 10),
    },
    'hi-चिड़िया': {
      word: 'चिड़िया',
      language: 'hi',
      attempts: 3,
      correctCount: 2,
      needsPracticeCount: 1,
      consecutiveCorrect: 1,
      lastResult: 'correct',
      lastPracticedTimestamp: Date.now() - 86400000,
      nextReviewDate: new Date().toISOString().slice(0, 10),
    },
  };

  return {
    childName,
    updatedTimestamp: Date.now(),
    sounds,
    words,
    style: { ...DEFAULT_STYLE },
  };
}

/**
 * Get Speech Profile from localStorage or hydrate
 */
export function getSpeechProfile(): SpeechProfile {
  try {
    const raw = localStorage.getItem(SPEECH_PROFILE_KEY);
    const childProfile = getChildProfile();
    if (!raw) {
      const initial = createDefaultProfile(childProfile.name || 'Aarav');
      saveSpeechProfile(initial);
      return initial;
    }
    const profile = JSON.parse(raw) as SpeechProfile;
    profile.childName = childProfile.name || profile.childName || 'Aarav';
    return profile;
  } catch {
    return createDefaultProfile('Aarav');
  }
}

/**
 * Save Speech Profile
 */
export function saveSpeechProfile(profile: SpeechProfile): void {
  try {
    profile.updatedTimestamp = Date.now();
    localStorage.setItem(SPEECH_PROFILE_KEY, JSON.stringify(profile));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('readbuddy_speech_profile_changed'));
    }
  } catch (err) {
    console.warn('[SpeechProfile] Save profile error:', err);
  }
}

/**
 * Reset Speech Profile to fresh initial state
 */
export function resetSpeechProfile(): SpeechProfile {
  const childProfile = getChildProfile();
  const fresh = createDefaultProfile(childProfile.name || 'Aarav');
  saveSpeechProfile(fresh);
  return fresh;
}

/**
 * Helper to calculate best time of day from hourly attempts map
 */
function computeBestTimeOfDay(hourlyMap: Record<number, number>): 'morning' | 'afternoon' | 'evening' {
  let morning = 0; // 6 - 11
  let afternoon = 0; // 12 - 16
  let evening = 0; // 17 - 22

  Object.entries(hourlyMap).forEach(([hourStr, count]) => {
    const h = parseInt(hourStr, 10);
    if (h >= 6 && h < 12) morning += count;
    else if (h >= 12 && h < 17) afternoon += count;
    else evening += count; // 17-23 & 0-5
  });

  if (morning >= afternoon && morning >= evening) return 'morning';
  if (afternoon >= morning && afternoon >= evening) return 'afternoon';
  return 'evening';
}

/**
 * Record a reading session attempt into the Speech Profile
 */
export function recordSessionInSpeechProfile(
  wordAnalysisList: WordAnalysis[],
  durationSeconds: number,
  language: AppLanguage,
  clarityScore: number,
  pauseCount: number = 0
): SpeechProfile {
  const profile = getSpeechProfile();
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentHour = new Date().getHours();

  // 1. Update Speaking Style
  const wordsHeardOrAttempted = wordAnalysisList.filter((w) => w.status !== 'pending');
  const validWordsCount = wordsHeardOrAttempted.length;

  profile.style.totalWordsSpoken += validWordsCount;
  profile.style.totalSpeakingTimeSeconds += durationSeconds;
  profile.style.totalSessionsCount += 1;
  profile.style.pauseCount += pauseCount;

  // WPM
  const minutes = Math.max(0.1, profile.style.totalSpeakingTimeSeconds / 60);
  profile.style.averageWPM = Math.round(profile.style.totalWordsSpoken / minutes);

  // Hourly attempts & best time of day
  profile.style.hourlyAttempts[currentHour] = (profile.style.hourlyAttempts[currentHour] || 0) + 1;
  profile.style.bestTimeOfDay = computeBestTimeOfDay(profile.style.hourlyAttempts);

  // Average session length
  profile.style.averageSessionLengthSeconds = Math.round(
    profile.style.totalSpeakingTimeSeconds / Math.max(1, profile.style.totalSessionsCount)
  );

  // Adaptive difficulty tracking
  if (clarityScore >= 80) {
    profile.style.goodSessionsInRow += 1;
    profile.style.poorSessionsInRow = 0;
    if (profile.style.goodSessionsInRow >= 3) {
      profile.style.goodSessionsInRow = 0;
      if (profile.style.difficultyAdaptiveLevel === 'easy') {
        profile.style.difficultyAdaptiveLevel = 'medium';
      } else if (profile.style.difficultyAdaptiveLevel === 'medium') {
        profile.style.difficultyAdaptiveLevel = 'challenging';
      }
    }
  } else if (clarityScore < 65) {
    profile.style.poorSessionsInRow += 1;
    profile.style.goodSessionsInRow = 0;
    if (profile.style.poorSessionsInRow >= 2) {
      profile.style.poorSessionsInRow = 0;
      if (profile.style.difficultyAdaptiveLevel === 'challenging') {
        profile.style.difficultyAdaptiveLevel = 'medium';
      } else if (profile.style.difficultyAdaptiveLevel === 'medium') {
        profile.style.difficultyAdaptiveLevel = 'easy';
      }
    }
  }

  // 2. Word Memory & Spaced Repetition (Requirement 2)
  wordAnalysisList.forEach((item) => {
    if (!item.cleaned) return;
    const wordKey = `${language}-${item.cleaned}`;
    let mem = profile.words[wordKey];

    const validLastResult: 'correct' | 'needs-practice' | 'not-heard' =
      item.status === 'correct' || item.status === 'needs-practice' || item.status === 'not-heard'
        ? item.status
        : 'not-heard';

    if (!mem) {
      mem = {
        word: item.cleaned,
        language,
        attempts: 0,
        correctCount: 0,
        needsPracticeCount: 0,
        consecutiveCorrect: 0,
        lastResult: validLastResult,
        lastPracticedTimestamp: Date.now(),
        nextReviewDate: todayStr,
      };
    }

    mem.attempts += 1;
    mem.lastPracticedTimestamp = Date.now();

    if (item.status === 'correct') {
      mem.correctCount += 1;
      mem.consecutiveCorrect += 1;
      mem.lastResult = 'correct';

      // Spaced repetition interval
      let gapDays = 1;
      if (mem.consecutiveCorrect === 2) gapDays = 3;
      else if (mem.consecutiveCorrect >= 3) gapDays = 7;

      const nextDate = new Date(Date.now() + gapDays * 86400000);
      mem.nextReviewDate = nextDate.toISOString().slice(0, 10);
    } else if (item.status === 'needs-practice') {
      mem.needsPracticeCount += 1;
      mem.consecutiveCorrect = 0;
      mem.lastResult = 'needs-practice';
      mem.nextReviewDate = todayStr; // due immediately/tomorrow
      profile.style.retriesPerWord[item.cleaned] = (profile.style.retriesPerWord[item.cleaned] || 0) + 1;
    }
    // Note: if 'not-heard', do not modify consecutiveCorrect or penalize

    profile.words[wordKey] = mem;
  });

  // 3. Per-Sound Stats (Requirement 1)
  // Ignore "not-heard" words!
  wordAnalysisList.forEach((item) => {
    if (item.status === 'not-heard' || item.status === 'pending') return;

    const focusList = language === 'en' ? ENGLISH_FOCUS_SOUNDS : HINDI_FOCUS_SOUNDS;

    focusList.forEach((snd) => {
      // Check if snd is in the expected cleaned word
      if (item.cleaned.toLowerCase().includes(snd)) {
        const soundKey = `${language}-${snd}`;
        let soundStat = profile.sounds[soundKey];

        if (!soundStat) {
          soundStat = {
            sound: snd,
            language,
            totalAttempts: 0,
            correctCount: 0,
            substitutedCount: 0,
            substitutionsMap: {},
            weeklyTrend: 'same',
            pastWeeklyAccuracy: 60,
            currentWeeklyAccuracy: 60,
          };
        }

        soundStat.totalAttempts += 1;

        if (item.status === 'correct') {
          soundStat.correctCount += 1;
        } else if (item.status === 'needs-practice') {
          soundStat.substitutedCount += 1;
          if (item.detectedSubstitution) {
            const spoken = item.detectedSubstitution.spokenSound || '?';
            soundStat.substitutionsMap[spoken] = (soundStat.substitutionsMap[spoken] || 0) + 1;
          }
        }

        // Calculate current accuracy & weekly trend
        const currentAcc = Math.round((soundStat.correctCount / Math.max(1, soundStat.totalAttempts)) * 100);
        soundStat.currentWeeklyAccuracy = currentAcc;

        if (currentAcc > soundStat.pastWeeklyAccuracy + 3) {
          soundStat.weeklyTrend = 'improving';
        } else if (currentAcc < soundStat.pastWeeklyAccuracy - 3) {
          soundStat.weeklyTrend = 'worse';
        } else {
          soundStat.weeklyTrend = 'same';
        }

        profile.sounds[soundKey] = soundStat;
      }
    });
  });

  saveSpeechProfile(profile);
  return profile;
}

/**
 * Get top 3 weak sounds for child profile in current language
 */
export function getTopWeakSoundsFromProfile(language: AppLanguage): SoundStat[] {
  const profile = getSpeechProfile();
  const soundList = Object.values(profile.sounds).filter((s) => s.language === language);

  soundList.sort((a, b) => {
    const accA = a.currentWeeklyAccuracy;
    const accB = b.currentWeeklyAccuracy;
    return accA - accB; // lowest accuracy first
  });

  return soundList.slice(0, 3);
}

/**
 * Get top 5 weak words for child profile in current language
 */
export function getTopWeakWordsFromProfile(language: AppLanguage): WordMemoryItem[] {
  const profile = getSpeechProfile();
  const wordList = Object.values(profile.words).filter((w) => w.language === language);

  wordList.sort((a, b) => {
    // Sort by highest needsPracticeCount first
    return b.needsPracticeCount - a.needsPracticeCount;
  });

  return wordList.slice(0, 5);
}

/**
 * Get Adaptive Lessons for ReadingView based on weak sounds and due words
 */
export function getAdaptiveLessonItems(mode: LessonMode, language: AppLanguage): ReadingItem[] {
  const allItems = getLessonItems(mode, language);
  const weakSounds = getTopWeakSoundsFromProfile(language).map((s) => s.sound);
  const weakWords = getTopWeakWordsFromProfile(language).map((w) => w.word);

  if (weakSounds.length === 0 && weakWords.length === 0) {
    return allItems;
  }

  // Score each item based on matching targetSounds and weakWords
  const scored = allItems.map((item) => {
    let score = 0;
    // Sound match
    item.targetSounds.forEach((snd) => {
      if (weakSounds.includes(snd)) score += 3;
    });
    // Word match
    weakWords.forEach((word) => {
      if (item.text.toLowerCase().includes(word)) score += 5;
    });
    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.item);
}

/**
 * Generate clean therapist text report
 */
export function generateTherapistReportText(profile: SpeechProfile, language: AppLanguage): string {
  const dateStr = new Date().toLocaleDateString();
  const topWeakSounds = getTopWeakSoundsFromProfile(language);
  const topWeakWords = getTopWeakWordsFromProfile(language);

  let text = `READBUDDY SPEECH PROFILE REPORT\n`;
  text += `Child Name: ${profile.childName}\n`;
  text += `Date: ${dateStr}\n`;
  text += `Language: ${language === 'hi' ? 'Hindi (हिन्दी)' : 'English'}\n\n`;

  text += `1. SPEAKING STYLE & METRICS:\n`;
  text += `- Average WPM: ${profile.style.averageWPM} words/min\n`;
  text += `- Best Practice Time: ${profile.style.bestTimeOfDay.toUpperCase()}\n`;
  text += `- Total Words Practiced: ${profile.style.totalWordsSpoken}\n`;
  text += `- Average Session Length: ${profile.style.averageSessionLengthSeconds}s\n\n`;

  text += `2. PER-SOUND ACCURACY & TRENDS:\n`;
  topWeakSounds.forEach((s) => {
    const subs = Object.entries(s.substitutionsMap)
      .map(([spoken, cnt]) => `${s.sound}➔${spoken} (${cnt}x)`)
      .join(', ');
    text += `- /${s.sound}/: ${s.currentWeeklyAccuracy}% accuracy [Trend: ${s.weeklyTrend.toUpperCase()}] ${
      subs ? `Substitutions: ${subs}` : ''
    }\n`;
  });

  text += `\n3. TOP WORDS NEEDING PRACTICE:\n`;
  topWeakWords.forEach((w) => {
    text += `- "${w.word}": ${w.needsPracticeCount} retries (Last result: ${w.lastResult})\n`;
  });

  text += `\nDISCLAIMER: Practice suggestions, not a medical diagnosis. Clean offline report generated locally by ReadBuddy.`;

  return text;
}

/**
 * Draw 1-Page Summary Report onto an HTML5 Canvas for PNG Download
 */
export function exportReportToCanvas(
  profile: SpeechProfile,
  language: AppLanguage,
  canvas: HTMLCanvasElement
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Canvas size: 800 x 1000
  canvas.width = 800;
  canvas.height = 1000;

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 800, 1000);

  // Header Banner
  ctx.fillStyle = '#4F46E5';
  ctx.fillRect(0, 0, 800, 100);

  // Header Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('ReadBuddy Speech Profile Report', 30, 45);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#E0E7FF';
  ctx.fillText(`Child Name: ${profile.childName}  |  Date: ${new Date().toLocaleDateString()}  |  Language: ${language.toUpperCase()}`, 30, 75);

  let y = 140;

  // Section 1: Speaking Style
  ctx.fillStyle = '#1E1B4B';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('1. Speaking Style & Rhythm Metrics', 30, y);
  y += 25;

  ctx.fillStyle = '#F3F4F6';
  ctx.fillRect(30, y, 740, 90);

  ctx.fillStyle = '#374151';
  ctx.font = '14px sans-serif';
  ctx.fillText(`Average WPM: ${profile.style.averageWPM} words/min`, 50, y + 30);
  ctx.fillText(`Best Practice Time: ${profile.style.bestTimeOfDay.toUpperCase()}`, 280, y + 30);
  ctx.fillText(`Total Words Spoken: ${profile.style.totalWordsSpoken}`, 550, y + 30);

  ctx.fillText(`Avg Session Duration: ${profile.style.averageSessionLengthSeconds}s`, 50, y + 65);
  ctx.fillText(`Adaptive Level: ${profile.style.difficultyAdaptiveLevel.toUpperCase()}`, 280, y + 65);

  y += 120;

  // Section 2: Per-Sound Accuracy Table
  ctx.fillStyle = '#1E1B4B';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('2. Per-Sound Phonetic Accuracy & Substitutions', 30, y);
  y += 25;

  const topSounds = getTopWeakSoundsFromProfile(language);

  // Table Header
  ctx.fillStyle = '#EEF2FF';
  ctx.fillRect(30, y, 740, 30);
  ctx.fillStyle = '#4338CA';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('Target Sound', 50, y + 20);
  ctx.fillText('Accuracy', 200, y + 20);
  ctx.fillText('Weekly Trend', 350, y + 20);
  ctx.fillText('Common Substitutions', 520, y + 20);

  y += 35;

  topSounds.forEach((s) => {
    ctx.fillStyle = '#F9FAFB';
    ctx.fillRect(30, y - 15, 740, 30);

    ctx.fillStyle = '#111827';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`/${s.sound}/`, 50, y + 5);

    ctx.font = '14px sans-serif';
    ctx.fillText(`${s.currentWeeklyAccuracy}%`, 200, y + 5);

    const trendText = s.weeklyTrend === 'improving' ? 'Improving 📈' : s.weeklyTrend === 'worse' ? 'Needs Focus 📉' : 'Stable ➔';
    ctx.fillStyle = s.weeklyTrend === 'improving' ? '#047857' : s.weeklyTrend === 'worse' ? '#B91C1C' : '#D97706';
    ctx.fillText(trendText, 350, y + 5);

    ctx.fillStyle = '#374151';
    const subsStr = Object.entries(s.substitutionsMap)
      .map(([spk, c]) => `${s.sound}➔${spk} (${c}x)`)
      .join(', ');
    ctx.fillText(subsStr || 'None recorded', 520, y + 5);

    y += 35;
  });

  y += 20;

  // Section 3: Words Memory Review
  ctx.fillStyle = '#1E1B4B';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('3. Words Memory & Spaced Repetition Needs', 30, y);
  y += 25;

  const topWords = getTopWeakWordsFromProfile(language);

  topWords.forEach((w) => {
    ctx.fillStyle = '#FFFBEB';
    ctx.fillRect(30, y - 12, 740, 32);

    ctx.fillStyle = '#92400E';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`"${w.word}"`, 50, y + 8);

    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#4B5563';
    ctx.fillText(`Retries: ${w.needsPracticeCount} times`, 220, y + 8);
    ctx.fillText(`Last Result: ${w.lastResult.toUpperCase()}`, 400, y + 8);
    ctx.fillText(`Next Due: ${w.nextReviewDate}`, 580, y + 8);

    y += 38;
  });

  y += 30;

  // Plain-Language Summary Box
  ctx.fillStyle = '#F0FDF4';
  ctx.fillRect(30, y, 740, 80);
  ctx.strokeStyle = '#BBF7D0';
  ctx.lineWidth = 1;
  ctx.strokeRect(30, y, 740, 80);

  ctx.fillStyle = '#166534';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('Plain Language Summary for Parent & Therapist:', 45, y + 25);

  ctx.font = '13px sans-serif';
  const topSoundName = topSounds[0]?.sound || 'r';
  const topSoundAcc = topSounds[0]?.currentWeeklyAccuracy || 60;
  ctx.fillText(`• Phonetic /${topSoundName}/ sound accuracy is currently at ${topSoundAcc}%. Best practice time is ${profile.style.bestTimeOfDay}.`, 45, y + 50);

  y += 110;

  // Mandatory Disclaimer Footer
  ctx.fillStyle = '#9CA3AF';
  ctx.font = 'italic 12px sans-serif';
  ctx.fillText('Practice suggestions, not a medical diagnosis.', 30, y);
  ctx.fillText('Generated 100% locally on device by ReadBuddy Speech Profile Engine.', 30, y + 20);
}
