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
import { getChildProfile, getActiveChildId, getAllChildProfiles, getCustomReadingItems } from './storage';

const ENGLISH_FOCUS_SOUNDS = ['r', 'l', 's', 'sh', 'th', 'ch', 'v', 'k', 'g'];
const HINDI_FOCUS_SOUNDS = ['र', 'ल', 'श', 'ष', 'ण', 'स', 'व', 'क्ष', 'ज्ञ'];

/**
 * Create a completely clean, pristine, EMPTY speech profile for a child.
 * No mock data, no fake percentages, no fake words.
 */
export function createEmptyProfile(childId: string, childName: string): SpeechProfile {
  return {
    childId,
    childName: childName || 'Learner',
    updatedTimestamp: Date.now(),
    sounds: {},
    words: {},
    style: {
      totalWordsSpoken: 0,
      totalSpeakingTimeSeconds: 0,
      averageWPM: 0,
      pauseCount: 0,
      retriesPerWord: {},
      hourlyAttempts: {},
      bestTimeOfDay: 'morning',
      averageSessionLengthSeconds: 0,
      totalSessionsCount: 0,
      goodSessionsInRow: 0,
      poorSessionsInRow: 0,
      difficultyAdaptiveLevel: 'easy',
    },
  };
}

/**
 * Get Speech Profile for a specific child (isolated by childId)
 */
export function getSpeechProfile(childId?: string): SpeechProfile {
  try {
    const targetChildId = childId || getActiveChildId();
    const profiles = getAllChildProfiles();
    const activeChild = profiles.find((p) => p.childId === targetChildId) || getChildProfile();
    const key = `readbuddy_speech_profile_${targetChildId}`;

    const raw = localStorage.getItem(key);
    if (!raw) {
      const empty = createEmptyProfile(targetChildId, activeChild.name || 'Learner');
      saveSpeechProfile(empty, targetChildId);
      return empty;
    }

    const parsed = JSON.parse(raw) as SpeechProfile;
    // Keep child name synced with profile
    if (activeChild.name) {
      parsed.childName = activeChild.name;
    }
    parsed.childId = targetChildId;
    return parsed;
  } catch (err) {
    console.warn('[SpeechProfile] Error reading profile:', err);
    const targetChildId = childId || getActiveChildId();
    return createEmptyProfile(targetChildId, 'Learner');
  }
}

/**
 * Save Speech Profile strictly scoped by childId
 */
export function saveSpeechProfile(profile: SpeechProfile, childId?: string): void {
  try {
    const targetChildId = childId || profile.childId || getActiveChildId();
    profile.childId = targetChildId;
    profile.updatedTimestamp = Date.now();

    const key = `readbuddy_speech_profile_${targetChildId}`;
    localStorage.setItem(key, JSON.stringify(profile));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('readbuddy_speech_profile_changed'));
    }
  } catch (err) {
    console.warn('[SpeechProfile] Save profile error:', err);
  }
}

/**
 * Reset Speech Profile to fresh empty state for active child
 */
export function resetSpeechProfile(childId?: string): SpeechProfile {
  const targetChildId = childId || getActiveChildId();
  const profiles = getAllChildProfiles();
  const activeChild = profiles.find((p) => p.childId === targetChildId) || getChildProfile();
  const fresh = createEmptyProfile(targetChildId, activeChild.name || 'Learner');
  saveSpeechProfile(fresh, targetChildId);
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
    else evening += count;
  });

  if (morning === 0 && afternoon === 0 && evening === 0) return 'morning';
  if (morning >= afternoon && morning >= evening) return 'morning';
  if (afternoon >= morning && afternoon >= evening) return 'afternoon';
  return 'evening';
}

/**
 * Record a reading session attempt into the Speech Profile for the current child
 */
export function recordSessionInSpeechProfile(
  wordAnalysisList: WordAnalysis[],
  durationSeconds: number,
  language: AppLanguage,
  clarityScore: number,
  pauseCount: number = 0,
  childId?: string
): SpeechProfile {
  const profile = getSpeechProfile(childId);
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
  const minutes = Math.max(0.01, profile.style.totalSpeakingTimeSeconds / 60);
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

  // 2. Word Memory & Spaced Repetition
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

      let gapDays = 1;
      if (mem.consecutiveCorrect === 2) gapDays = 3;
      else if (mem.consecutiveCorrect >= 3) gapDays = 7;

      const nextDate = new Date(Date.now() + gapDays * 86400000);
      mem.nextReviewDate = nextDate.toISOString().slice(0, 10);
    } else if (item.status === 'needs-practice') {
      mem.needsPracticeCount += 1;
      mem.consecutiveCorrect = 0;
      mem.lastResult = 'needs-practice';
      mem.nextReviewDate = todayStr;
      profile.style.retriesPerWord[item.cleaned] = (profile.style.retriesPerWord[item.cleaned] || 0) + 1;
    }

    profile.words[wordKey] = mem;
  });

  // 3. Per-Sound Stats
  wordAnalysisList.forEach((item) => {
    if (item.status === 'not-heard' || item.status === 'pending') return;

    const focusList = language === 'en' ? ENGLISH_FOCUS_SOUNDS : HINDI_FOCUS_SOUNDS;

    focusList.forEach((snd) => {
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
            pastWeeklyAccuracy: 0,
            currentWeeklyAccuracy: 0,
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

        const currentAcc = Math.round((soundStat.correctCount / Math.max(1, soundStat.totalAttempts)) * 100);
        soundStat.currentWeeklyAccuracy = currentAcc;

        if (soundStat.pastWeeklyAccuracy > 0) {
          if (currentAcc > soundStat.pastWeeklyAccuracy + 3) {
            soundStat.weeklyTrend = 'improving';
          } else if (currentAcc < soundStat.pastWeeklyAccuracy - 3) {
            soundStat.weeklyTrend = 'worse';
          } else {
            soundStat.weeklyTrend = 'same';
          }
        } else {
          soundStat.weeklyTrend = 'same';
          soundStat.pastWeeklyAccuracy = currentAcc;
        }

        profile.sounds[soundKey] = soundStat;
      }
    });
  });

  saveSpeechProfile(profile, childId);
  return profile;
}

/**
 * Get top weak sounds for child profile in current language (ONLY from actual attempts)
 */
export function getTopWeakSoundsFromProfile(language: AppLanguage, childId?: string): SoundStat[] {
  const profile = getSpeechProfile(childId);
  const soundList = Object.values(profile.sounds).filter(
    (s) => s.language === language && s.totalAttempts > 0
  );

  soundList.sort((a, b) => {
    const accA = a.currentWeeklyAccuracy;
    const accB = b.currentWeeklyAccuracy;
    return accA - accB; // lowest accuracy first
  });

  return soundList.slice(0, 3);
}

/**
 * Get top weak words for child profile in current language (ONLY from actual attempts needing practice)
 */
export function getTopWeakWordsFromProfile(language: AppLanguage, childId?: string): WordMemoryItem[] {
  const profile = getSpeechProfile(childId);
  const wordList = Object.values(profile.words).filter(
    (w) => w.language === language && w.needsPracticeCount > 0
  );

  wordList.sort((a, b) => {
    return b.needsPracticeCount - a.needsPracticeCount;
  });

  return wordList.slice(0, 5);
}

/**
 * Get Adaptive Lessons for ReadingView based on weak sounds and due words
 */
export function getAdaptiveLessonItems(mode: LessonMode, language: AppLanguage, childId?: string): ReadingItem[] {
  const standardItems = getLessonItems(mode, language);
  const customItems = getCustomReadingItems(language).filter((item) => item.mode === mode);
  const allItems = [...customItems, ...standardItems];

  const weakSounds = getTopWeakSoundsFromProfile(language, childId).map((s) => s.sound);
  const weakWords = getTopWeakWordsFromProfile(language, childId).map((w) => w.word);

  if (weakSounds.length === 0 && weakWords.length === 0) {
    return allItems;
  }

  const scored = allItems.map((item) => {
    let score = 0;
    item.targetSounds.forEach((snd) => {
      if (weakSounds.includes(snd)) score += 3;
    });
    weakWords.forEach((word) => {
      if (item.text.toLowerCase().includes(word)) score += 5;
    });
    // Boost custom items so they always stay on top
    if (item.id.startsWith('custom-')) {
      score += 100;
    }
    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.item);
}

/**
 * Generate clean therapist text report for active child
 */
export function generateTherapistReportText(profile: SpeechProfile, language: AppLanguage): string {
  const dateStr = new Date().toLocaleDateString();

  if (profile.style.totalSessionsCount === 0) {
    return `READBUDDY SPEECH PROFILE REPORT\nChild Name: ${profile.childName}\nDate: ${dateStr}\n\nStatus: No practice sessions completed yet.\nStart your first reading practice to build the clinical speech profile.`;
  }

  const topWeakSounds = getTopWeakSoundsFromProfile(language, profile.childId);
  const topWeakWords = getTopWeakWordsFromProfile(language, profile.childId);

  let text = `READBUDDY SPEECH PROFILE REPORT\n`;
  text += `Child Name: ${profile.childName}\n`;
  text += `Date: ${dateStr}\n`;
  text += `Language: ${language === 'hi' ? 'Hindi (हिन्दी)' : 'English'}\n\n`;

  text += `1. SPEAKING STYLE & METRICS:\n`;
  text += `- Average WPM: ${profile.style.averageWPM} words/min\n`;
  text += `- Best Practice Time: ${profile.style.bestTimeOfDay.toUpperCase()}\n`;
  text += `- Total Words Practiced: ${profile.style.totalWordsSpoken}\n`;
  text += `- Total Sessions: ${profile.style.totalSessionsCount}\n`;
  text += `- Average Session Length: ${profile.style.averageSessionLengthSeconds}s\n\n`;

  text += `2. PER-SOUND ACCURACY & TRENDS:\n`;
  if (topWeakSounds.length === 0) {
    text += `- No focus sounds recorded yet.\n`;
  } else {
    topWeakSounds.forEach((s) => {
      const subs = Object.entries(s.substitutionsMap)
        .map(([spoken, cnt]) => `${s.sound}➔${spoken} (${cnt}x)`)
        .join(', ');
      text += `- /${s.sound}/: ${s.currentWeeklyAccuracy}% accuracy [Trend: ${s.weeklyTrend.toUpperCase()}] ${
        subs ? `Substitutions: ${subs}` : ''
      }\n`;
    });
  }
  text += `\n`;

  text += `3. TOP WORDS NEEDING PRACTICE:\n`;
  if (topWeakWords.length === 0) {
    text += `- No problematic words recorded yet.\n`;
  } else {
    topWeakWords.forEach((w) => {
      text += `- "${w.word}": ${w.needsPracticeCount} retries (Status: ${w.lastResult})\n`;
    });
  }

  text += `\nNote: Practice suggestions, not a medical diagnosis.`;
  return text;
}

/**
 * Export report to visual canvas
 */
export function exportReportToCanvas(
  profile: SpeechProfile,
  language: AppLanguage,
  canvas: HTMLCanvasElement
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = 800;
  canvas.height = 700;

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 800, 700);

  // Top header banner
  ctx.fillStyle = '#4F46E5';
  ctx.fillRect(0, 0, 800, 90);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('ReadBuddy - Speech & Reading Profile', 30, 42);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#C7D2FE';
  ctx.fillText(`Child Name: ${profile.childName} | Date: ${new Date().toLocaleDateString()}`, 30, 70);

  let y = 125;

  if (profile.style.totalSessionsCount === 0) {
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('No practice sessions completed yet.', 50, y + 40);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#6B7280';
    ctx.fillText('Complete your first reading session to see detailed speech analytics and trends.', 50, y + 70);
    return;
  }

  // Section 1: Style
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

  const topSounds = getTopWeakSoundsFromProfile(language, profile.childId);

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

  if (topSounds.length === 0) {
    ctx.fillStyle = '#6B7280';
    ctx.font = 'italic 13px sans-serif';
    ctx.fillText('No focus sounds recorded yet.', 50, y + 10);
    y += 30;
  } else {
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
  }

  y += 20;

  // Section 3: Words Memory Review
  ctx.fillStyle = '#1E1B4B';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('3. Words Memory & Practice Needs', 30, y);
  y += 25;

  const topWords = getTopWeakWordsFromProfile(language, profile.childId);

  if (topWords.length === 0) {
    ctx.fillStyle = '#6B7280';
    ctx.font = 'italic 13px sans-serif';
    ctx.fillText('No words needing practice yet.', 50, y + 10);
  } else {
    topWords.forEach((w) => {
      ctx.fillStyle = '#FFFBEB';
      ctx.fillRect(30, y - 12, 740, 32);

      ctx.fillStyle = '#92400E';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`"${w.word}"`, 50, y + 8);

      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#B45309';
      ctx.fillText(`Retries: ${w.needsPracticeCount}x`, 280, y + 8);
      ctx.fillText(`Status: ${w.lastResult.toUpperCase()}`, 520, y + 8);

      y += 36;
    });
  }
}
