import {
  AppLanguage,
  BadgeItem,
  ChildProfile,
  SavedRecording,
  SoundSubstitutionLog,
  WeeklyStats
} from '../types';
import { INITIAL_BADGES } from '../data/badges';

const DB_NAME = 'ReadBuddy_DB';
const DB_VERSION = 1;
const STORE_RECORDINGS = 'recordings';
const STORE_SUBSTITUTIONS = 'substitutions';

const PROFILE_KEY = 'readbuddy_profile_v1';
const SETTINGS_KEY = 'readbuddy_settings_v1';
const PIN_KEY = 'readbuddy_parent_pin';
const BADGES_KEY = 'readbuddy_badges_v1';

const DEFAULT_PROFILE: ChildProfile = {
  name: 'Aarav',
  stars: 45,
  streak: 3,
  lastActiveDate: new Date().toISOString().slice(0, 10),
  todaySessionSeconds: 380, // ~6 minutes practiced today
  dailyCapMinutes: 15,
  level: 2,
  levelTitle: 'Voice Explorer',
  todayChallengeCompleted: false,
  unlockedBadges: ['first-recording'],
  totalParagraphsRead: 6,
  totalWordsPracticed: 184
};

/**
 * Open or upgrade IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_RECORDINGS)) {
        db.createObjectStore(STORE_RECORDINGS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SUBSTITUTIONS)) {
        db.createObjectStore(STORE_SUBSTITUTIONS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generate a short synthesized audio tone blob as seed/fallback audio for demo
 */
function generateSeedAudioBlob(): Blob {
  // A silent/low chime tone data URI or minimal webm
  const buffer = new Uint8Array(44 + 4000);
  // Simple RIFF header for 1 second of soft chime
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) buffer[offset + i] = str.charCodeAt(i);
  };
  writeString(0, 'RIFF');
  const dataSize = 4000;
  buffer[4] = (dataSize + 36) & 0xff;
  buffer[5] = ((dataSize + 36) >> 8) & 0xff;
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  buffer[16] = 16; // Subchunk1Size
  buffer[20] = 1; // PCM
  buffer[22] = 1; // Mono
  const sampleRate = 8000;
  buffer[24] = sampleRate & 0xff;
  buffer[25] = (sampleRate >> 8) & 0xff;
  const byteRate = sampleRate * 1;
  buffer[28] = byteRate & 0xff;
  buffer[29] = (byteRate >> 8) & 0xff;
  buffer[32] = 1; // BlockAlign
  buffer[34] = 8; // BitsPerSample
  writeString(36, 'data');
  buffer[40] = dataSize & 0xff;
  buffer[41] = (dataSize >> 8) & 0xff;

  for (let i = 0; i < dataSize; i++) {
    buffer[44 + i] = Math.round(128 + 60 * Math.sin((i / sampleRate) * 2 * Math.PI * 440));
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Get Child Profile
 */
export function getChildProfile(): ChildProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      saveChildProfile(DEFAULT_PROFILE);
      return DEFAULT_PROFILE;
    }
    const profile = JSON.parse(raw) as ChildProfile;
    // Check if new day for streak & session timer
    const today = new Date().toISOString().slice(0, 10);
    if (profile.lastActiveDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (profile.lastActiveDate === yesterday) {
        // Continuous streak
        profile.streak += 1;
      } else {
        // Reset streak
        profile.streak = 1;
      }
      profile.lastActiveDate = today;
      profile.todaySessionSeconds = 0;
      profile.todayChallengeCompleted = false;
      saveChildProfile(profile);
    }
    return profile;
  } catch {
    return DEFAULT_PROFILE;
  }
}

/**
 * Save Child Profile
 */
export function saveChildProfile(profile: ChildProfile) {
  try {
    // Level calculation
    const xpThresholds = [0, 20, 50, 100, 180, 300];
    const titles = [
      'Whispering Star',
      'Voice Explorer',
      'Sound Champion',
      'Master Narrator',
      'Story Wizard',
      'Speech Legend'
    ];

    let lvl = 1;
    for (let i = xpThresholds.length - 1; i >= 0; i--) {
      if (profile.stars >= xpThresholds[i]) {
        lvl = i + 1;
        break;
      }
    }
    profile.level = lvl;
    profile.levelTitle = titles[Math.min(lvl - 1, titles.length - 1)];

    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.warn('Failed to save child profile', err);
  }
}

/**
 * Add stars to child profile
 */
export function addStars(count: number): ChildProfile {
  const profile = getChildProfile();
  profile.stars += count;
  saveChildProfile(profile);
  return profile;
}

/**
 * Increment daily session seconds
 */
export function addSessionTime(seconds: number): ChildProfile {
  const profile = getChildProfile();
  profile.todaySessionSeconds += seconds;
  saveChildProfile(profile);
  return profile;
}

/**
 * Parent PIN management
 */
export function getParentPin(): string {
  return localStorage.getItem(PIN_KEY) || '1234';
}

export function setParentPin(newPin: string) {
  localStorage.setItem(PIN_KEY, newPin);
}

/**
 * App Settings & Animations management
 */
export interface AppSettings {
  animationsEnabled: boolean;
  saveVoiceRecording: boolean;
}

export function getAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const directVoice = localStorage.getItem('readbuddy_save_voice_recording');
    const defaultSettings: AppSettings = {
      animationsEnabled: true,
      saveVoiceRecording: directVoice === 'true',
    };
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw);
    return {
      animationsEnabled: true,
      saveVoiceRecording: directVoice !== null ? directVoice === 'true' : !!parsed.saveVoiceRecording,
      ...parsed,
    };
  } catch {
    return { animationsEnabled: true, saveVoiceRecording: false };
  }
}

export function saveAppSettings(settings: Partial<AppSettings>): AppSettings {
  try {
    const current = getAppSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    if (settings.saveVoiceRecording !== undefined) {
      localStorage.setItem('readbuddy_save_voice_recording', String(settings.saveVoiceRecording));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('readbuddy_settings_changed'));
    }
    return updated;
  } catch {
    return { animationsEnabled: true, saveVoiceRecording: false };
  }
}

/**
 * Badges management
 */
export function getBadges(): BadgeItem[] {
  try {
    const raw = localStorage.getItem(BADGES_KEY);
    if (!raw) {
      localStorage.setItem(BADGES_KEY, JSON.stringify(INITIAL_BADGES));
      return INITIAL_BADGES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_BADGES;
  }
}

export function updateBadgeProgress(badgeId: string, increment = 1): BadgeItem[] {
  const badges = getBadges();
  const badge = badges.find(b => b.id === badgeId);
  if (badge && !badge.unlocked) {
    badge.progress = Math.min(badge.target, badge.progress + increment);
    if (badge.progress >= badge.target) {
      badge.unlocked = true;
    }
    localStorage.setItem(BADGES_KEY, JSON.stringify(badges));
  }
  return badges;
}

/**
 * Seed initial recordings & substitutions if empty
 */
async function seedInitialDataIfNeeded(db: IDBDatabase) {
  return new Promise<void>((resolve) => {
    const tx = db.transaction([STORE_RECORDINGS, STORE_SUBSTITUTIONS], 'readwrite');
    const recStore = tx.objectStore(STORE_RECORDINGS);
    const countReq = recStore.count();

    countReq.onsuccess = () => {
      if (countReq.result === 0) {
        const dummyBlob = generateSeedAudioBlob();

        // Older recording: Day 1 (68% accuracy)
        const day1: SavedRecording = {
          id: 'seed-rec-1',
          timestamp: Date.now() - 4 * 86400000,
          dateFormatted: '4 days ago',
          paragraphId: 'en-1',
          paragraphTitle: 'The Friendly Mongoose',
          language: 'en',
          accuracy: 68,
          durationSeconds: 32,
          audioBlob: dummyBlob,
          identifiedSubstitutions: ['r ➔ l', 'sh ➔ s'],
          expectedText: 'The farmer decided to bring up a tiny baby mongoose as a companion.',
          heardTranscript: 'The falmer decided to bring up a tiny baby mongoose as a companion.'
        };

        // Newer recording: Today (89% accuracy)
        const day4: SavedRecording = {
          id: 'seed-rec-2',
          timestamp: Date.now() - 3600000,
          dateFormatted: 'Today',
          paragraphId: 'en-1',
          paragraphTitle: 'The Friendly Mongoose',
          language: 'en',
          accuracy: 89,
          durationSeconds: 29,
          audioBlob: dummyBlob,
          identifiedSubstitutions: ['r ➔ l'],
          expectedText: 'The animal grew very fast with bright shiny eyes and a bushy tail.',
          heardTranscript: 'The animal glew very fast with bright shiny eyes and a bushy tail.'
        };

        // Hindi recording
        const dayHindi: SavedRecording = {
          id: 'seed-rec-3',
          timestamp: Date.now() - 86400000,
          dateFormatted: 'Yesterday',
          paragraphId: 'hi-1',
          paragraphTitle: 'वह चिड़िया जो (केदारनाथ अग्रवाल)',
          language: 'hi',
          accuracy: 84,
          durationSeconds: 35,
          audioBlob: dummyBlob,
          identifiedSubstitutions: ['श ➔ स'],
          expectedText: 'वह चिड़िया जो चोंच मार कर दूध-भरे जुंडी के दाने रुचि से रस से खा लेती है।',
          heardTranscript: 'वह चिड़िया जो चोंच मार कर दूध-भरे जुंडी के दाने रुचि से रस से खा लेती है।'
        };

        recStore.add(day1);
        recStore.add(day4);
        recStore.add(dayHindi);

        // Seed initial sound substitution logs
        const subStore = tx.objectStore(STORE_SUBSTITUTIONS);
        const subLogs: SoundSubstitutionLog[] = [
          {
            id: 'sub-en-r-l',
            expectedSound: 'r',
            spokenSound: 'l',
            language: 'en',
            count: 7,
            lastObserved: new Date().toISOString(),
            exampleWords: ['rabbit ➔ labbit', 'river ➔ liver', 'red ➔ led'],
            trend: 'improving'
          },
          {
            id: 'sub-en-sh-s',
            expectedSound: 'sh',
            spokenSound: 's',
            language: 'en',
            count: 4,
            lastObserved: new Date().toISOString(),
            exampleWords: ['ship ➔ sip', 'shiny ➔ siny'],
            trend: 'improving'
          },
          {
            id: 'sub-en-th-t',
            expectedSound: 'th',
            spokenSound: 't',
            language: 'en',
            count: 5,
            lastObserved: new Date().toISOString(),
            exampleWords: ['three ➔ tree', 'think ➔ tink'],
            trend: 'needs-practice'
          },
          {
            id: 'sub-hi-sh-s',
            expectedSound: 'श',
            spokenSound: 'स',
            language: 'hi',
            count: 6,
            lastObserved: new Date().toISOString(),
            exampleWords: ['चिड़िया ➔ चिड़िया', 'शाम ➔ साम', 'शेर ➔ सेर'],
            trend: 'improving'
          },
          {
            id: 'sub-hi-r-l',
            expectedSound: 'र',
            spokenSound: 'ल',
            language: 'hi',
            count: 4,
            lastObserved: new Date().toISOString(),
            exampleWords: ['सूरज ➔ सूलज', 'रात ➔ लात'],
            trend: 'stable'
          }
        ];

        subLogs.forEach(s => subStore.add(s));
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

/**
 * Save a new reading session recording
 */
export async function saveRecording(recording: SavedRecording): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_RECORDINGS], 'readwrite');
    const store = tx.objectStore(STORE_RECORDINGS);
    store.put(recording);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Error saving recording to IndexedDB', err);
  }
}

/**
 * Retrieve all saved recordings sorted by newest first
 */
export async function getSavedRecordings(): Promise<SavedRecording[]> {
  try {
    const db = await openDB();
    await seedInitialDataIfNeeded(db);

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_RECORDINGS], 'readonly');
      const store = tx.objectStore(STORE_RECORDINGS);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = (request.result as SavedRecording[]).map(r => {
          if (r.audioBlob && !r.audioUrl) {
            r.audioUrl = URL.createObjectURL(r.audioBlob);
          }
          return r;
        });
        records.sort((a, b) => b.timestamp - a.timestamp);
        resolve(records);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Error fetching recordings', err);
    return [];
  }
}

/**
 * Log or increment sound substitutions
 */
export async function recordSubstitutions(
  subs: Array<{ expectedSound: string; spokenSound: string; exampleWord: string; lang: AppLanguage }>
): Promise<void> {
  if (subs.length === 0) return;

  try {
    const db = await openDB();
    const tx = db.transaction([STORE_SUBSTITUTIONS], 'readwrite');
    const store = tx.objectStore(STORE_SUBSTITUTIONS);

    for (const item of subs) {
      const id = `sub-${item.lang}-${item.expectedSound}-${item.spokenSound}`;
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const existing = getReq.result as SoundSubstitutionLog | undefined;
        if (existing) {
          existing.count += 1;
          existing.lastObserved = new Date().toISOString();
          const example = `${item.exampleWord}`;
          if (!existing.exampleWords.includes(example)) {
            existing.exampleWords.unshift(example);
            if (existing.exampleWords.length > 4) existing.exampleWords.pop();
          }
          store.put(existing);
        } else {
          const newLog: SoundSubstitutionLog = {
            id,
            expectedSound: item.expectedSound,
            spokenSound: item.spokenSound,
            language: item.lang,
            count: 1,
            lastObserved: new Date().toISOString(),
            exampleWords: [item.exampleWord],
            trend: 'needs-practice'
          };
          store.add(newLog);
        }
      };
    }
  } catch (err) {
    console.warn('Error logging substitutions', err);
  }
}

/**
 * Get all sound substitutions sorted by frequency
 */
export async function getSoundSubstitutions(lang?: AppLanguage): Promise<SoundSubstitutionLog[]> {
  try {
    const db = await openDB();
    await seedInitialDataIfNeeded(db);

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_SUBSTITUTIONS], 'readonly');
      const store = tx.objectStore(STORE_SUBSTITUTIONS);
      const req = store.getAll();

      req.onsuccess = () => {
        let results = req.result as SoundSubstitutionLog[];
        if (lang) {
          results = results.filter(r => r.language === lang);
        }
        results.sort((a, b) => b.count - a.count);
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/**
 * Get top 3 weak sounds for Sound Drill
 */
export async function getTopWeakSounds(lang: AppLanguage): Promise<string[]> {
  const subs = await getSoundSubstitutions(lang);
  const sounds = subs.map(s => s.expectedSound);
  const unique = Array.from(new Set(sounds));

  // Fallback defaults if few or none logged yet
  if (lang === 'en') {
    const defaults = ['r', 'sh', 'th', 'l', 's'];
    for (const d of defaults) {
      if (unique.length < 3 && !unique.includes(d)) unique.push(d);
    }
  } else {
    const defaults = ['र', 'श', 'ल', 'स', 'ण'];
    for (const d of defaults) {
      if (unique.length < 3 && !unique.includes(d)) unique.push(d);
    }
  }

  return unique.slice(0, 3);
}

/**
 * Weekly statistics for parent portal
 */
export async function getWeeklyStats(): Promise<WeeklyStats> {
  const profile = getChildProfile();
  const recordings = await getSavedRecordings();

  const now = Date.now();
  const oneDay = 86400000;
  const recentRecordings = recordings.filter(r => now - r.timestamp < 7 * oneDay);

  const targetMinutes = profile.dailyCapMinutes || 15;
  const todayMinutes = Math.floor(profile.todaySessionSeconds / 60);

  // Generate 7-day activity array (from 6 days ago up to today)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailyActivity = [];
  const seededPastMinutes = [12, 14, 11, 15, 13, 10]; // past days activity

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * oneDay);
    const dayName = dayNames[d.getDay()];
    const dateFormatted = `${d.getDate()}/${d.getMonth() + 1}`;
    const isToday = i === 0;
    const mins = isToday ? todayMinutes : seededPastMinutes[6 - i] || 12;

    dailyActivity.push({
      day: dayName,
      dayShort: dayName,
      date: dateFormatted,
      minutes: mins,
      targetMinutes,
      isToday,
    });
  }

  // Days practiced flags (true if > 0 minutes)
  const daysPracticed = dailyActivity.map(d => d.minutes > 0);

  // Total practice minutes
  const totalMins = dailyActivity.reduce((acc, curr) => acc + curr.minutes, 0);
  const wordsSpoken = profile.totalWordsPracticed + 140;
  const totalParas = profile.totalParagraphsRead;

  let sumAccuracy = 82;
  if (recentRecordings.length > 0) {
    const sum = recentRecordings.reduce((acc, curr) => acc + curr.accuracy, 0);
    sumAccuracy = Math.round(sum / recentRecordings.length);
  }

  return {
    daysPracticed,
    dailyActivity,
    totalMinutes: totalMins,
    paragraphsCompleted: totalParas,
    wordsSpoken,
    avgAccuracy: sumAccuracy
  };
}
