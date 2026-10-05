import {
  AppLanguage,
  BadgeItem,
  ChildProfile,
  SavedRecording,
  SoundSubstitutionLog,
  SpeechCoachReportItem,
  WeeklyStats,
  ReadingItem
} from '../types';
import { INITIAL_BADGES } from '../data/badges';

const DB_NAME = 'ReadBuddy_DB_v2';
const DB_VERSION = 5;
const STORE_RECORDINGS = 'recordings';
const STORE_SUBSTITUTIONS = 'substitutions';
export const STORE_WORD_ATTEMPTS = 'word_attempts';
export const STORE_PHONEME_ATTEMPTS = 'phoneme_attempts';
export const STORE_PHONEME_PROFILES = 'phoneme_profiles';
export const STORE_PHONICS_ATTEMPTS = 'phonics_attempts';
export const STORE_PHONICS_PROFILES = 'phonics_profiles';
export const STORE_SPEECH_CAPTURE_ATTEMPTS = 'speech_capture_attempts';

const PROFILES_REGISTRY_KEY = 'readbuddy_profiles_registry_v3';
const ACTIVE_CHILD_ID_KEY = 'readbuddy_active_child_id_v3';
const SPEECH_REPORTS_KEY = 'readbuddy_speech_reports_v3';
const SETTINGS_KEY = 'readbuddy_settings_v3';
const PIN_KEY = 'readbuddy_parent_pin';
const BADGES_KEY_PREFIX = 'readbuddy_badges_v3_';

/**
 * Generate permanent unique internal child_id
 * Ensures every child has an isolated, unguessable internal identifier
 */
export function generateChildId(): string {
  return `child_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create a pristine, empty child profile.
 * Starts with 0 stars, 0 sessions, 0 stories, 0 words.
 * No mock data, no fake percentages, no demo child identity.
 */
function createCleanInitialProfile(name = 'Learner', mobile = ''): ChildProfile {
  return {
    childId: generateChildId(),
    name: name.trim(),
    mobileNumber: normalizeMobileNumber(mobile),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    stars: 0,
    streak: 1,
    lastActiveDate: new Date().toISOString().slice(0, 10),
    todaySessionSeconds: 0,
    dailyCapMinutes: 15,
    level: 1,
    levelTitle: 'Whispering Star',
    todayChallengeCompleted: false,
    unlockedBadges: [],
    totalParagraphsRead: 0,
    totalWordsPracticed: 0,
    authType: 'mobile_direct',
  };
}

/**
 * Normalize mobile number to clean 10 digits (handles +91, 0, spaces, dashes)
 */
export function normalizeMobileNumber(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  // Indian 12-digit format starting with 91
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  // 11-digit format starting with 0
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

/**
 * Mask mobile number to never expose plain-text phone numbers in UI, logs, or analytics
 * e.g. 9876543210 -> "+91 98••••••10"
 */
export function maskMobileNumber(raw: string): string {
  const norm = normalizeMobileNumber(raw);
  if (!norm || norm.length < 4) return '••••••••••';
  if (norm.length >= 10) {
    const firstTwo = norm.slice(0, 2);
    const lastTwo = norm.slice(-2);
    return `+91 ${firstTwo}••••••${lastTwo}`;
  }
  return `${norm.slice(0, 1)}••••${norm.slice(-1)}`;
}

/**
 * Get all child profiles stored on this device from registry
 */
export function getAllChildProfiles(): ChildProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_REGISTRY_KEY);
    if (!raw) {
      return [];
    }
    const map = JSON.parse(raw) as Record<string, ChildProfile>;
    return Object.values(map);
  } catch {
    return [];
  }
}

/**
 * Get current active child ID
 */
export function getActiveChildId(): string {
  try {
    const active = localStorage.getItem(ACTIVE_CHILD_ID_KEY);
    if (active) return active;
    const profiles = getAllChildProfiles();
    if (profiles.length > 0) {
      const id = profiles[0].childId;
      localStorage.setItem(ACTIVE_CHILD_ID_KEY, id);
      return id;
    }
    // No profiles exist yet: create clean initial learner
    const initial = createCleanInitialProfile('Learner', '');
    saveChildProfile(initial);
    return initial.childId;
  } catch {
    return 'child_default_clean';
  }
}

/**
 * Set active child ID session and dispatch profile change event
 */
export function setActiveChildId(childId: string): void {
  try {
    localStorage.setItem(ACTIVE_CHILD_ID_KEY, childId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('readbuddy_profile_changed'));
    }
  } catch (err) {
    console.warn('Failed to set active child ID', err);
  }
}

export interface ChildLoginResult {
  profile: ChildProfile;
  isReturningUser: boolean;
  message: string;
}

/**
 * Log in or create child profile using Child Name & Mobile Number (NO OTP MANDATORY)
 * Returning user: loads existing profile & all historical data without overwrite
 * New user: creates a new unique child_id and clean empty state
 */
export function loginOrCreateChild(name: string, rawMobile: string): ChildLoginResult {
  const normalizedMobile = normalizeMobileNumber(rawMobile);
  if (!normalizedMobile || normalizedMobile.length < 10) {
    throw new Error('Please enter a valid 10-digit mobile number.');
  }

  const cleanName = (name || '').trim();
  if (!cleanName) {
    throw new Error('Please enter the child name.');
  }

  const profiles = getAllChildProfiles();
  // Check if mobile number already exists in registry
  const existing = profiles.find((p) => normalizeMobileNumber(p.mobileNumber) === normalizedMobile);

  if (existing) {
    // RETURNING USER:
    // Update name if changed, keep childId and all historical stats/data intact!
    if (cleanName && cleanName !== existing.name) {
      existing.name = cleanName;
    }
    existing.updatedAt = Date.now();
    saveChildProfile(existing);
    setActiveChildId(existing.childId);

    return {
      profile: existing,
      isReturningUser: true,
      message: `Welcome back, ${existing.name}! Loaded your saved recordings, reports, and stars.`
    };
  } else {
    // NEW USER:
    // Generate fresh unique child_id with 0 stars, 0 sessions, clean empty slate!
    const newProfile = createCleanInitialProfile(cleanName, normalizedMobile);

    saveChildProfile(newProfile);
    setActiveChildId(newProfile.childId);

    return {
      profile: newProfile,
      isReturningUser: false,
      message: `Welcome to ReadBuddy, ${cleanName}! Your personal learning profile has been created.`
    };
  }
}

/**
 * Switch active child profile on this device
 */
export function switchChildProfile(childId: string): ChildProfile | null {
  const profiles = getAllChildProfiles();
  const target = profiles.find((p) => p.childId === childId);
  if (target) {
    setActiveChildId(target.childId);
    saveChildProfile(target);
    return target;
  }
  return null;
}

/**
 * Save a 31-step AI Speech & Voice Coach report permanently for child_id
 */
export function saveSpeechCoachReport(report: {
  targetText: string;
  transcribedText: string;
  reportMarkdown: string;
  childId?: string;
  recordingId?: string;
  sessionId?: string;
}): SpeechCoachReportItem {
  try {
    const activeId = report.childId || getActiveChildId();
    const newReport: SpeechCoachReportItem = {
      id: `report_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      childId: activeId,
      recordingId: report.recordingId,
      sessionId: report.sessionId,
      timestamp: Date.now(),
      dateFormatted: new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      targetText: report.targetText,
      transcribedText: report.transcribedText,
      reportMarkdown: report.reportMarkdown,
    };

    const raw = localStorage.getItem(SPEECH_REPORTS_KEY);
    const list: SpeechCoachReportItem[] = raw ? JSON.parse(raw) : [];
    list.unshift(newReport);
    if (list.length > 50) list.pop();
    localStorage.setItem(SPEECH_REPORTS_KEY, JSON.stringify(list));

    return newReport;
  } catch (err) {
    console.warn('Failed to save speech report', err);
    return {
      id: `report_${Date.now()}`,
      childId: report.childId || getActiveChildId(),
      recordingId: report.recordingId,
      sessionId: report.sessionId,
      timestamp: Date.now(),
      dateFormatted: 'Today',
      targetText: report.targetText,
      transcribedText: report.transcribedText,
      reportMarkdown: report.reportMarkdown,
    };
  }
}

/**
 * Get all 31-step AI Speech & Voice Coach reports for active child_id (STRICTLY CHILD-SCOPED)
 */
export function getSpeechCoachReports(childId?: string): SpeechCoachReportItem[] {
  try {
    const raw = localStorage.getItem(SPEECH_REPORTS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as SpeechCoachReportItem[];
    const targetId = childId || getActiveChildId();
    // STRICT FILTER: Only return reports belonging to this specific child!
    return list.filter((r) => r.childId === targetId);
  } catch {
    return [];
  }
}

/**
 * Open or upgrade IndexedDB
 */
export function openDB(): Promise<IDBDatabase> {
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
      if (!db.objectStoreNames.contains(STORE_WORD_ATTEMPTS)) {
        const store = db.createObjectStore(STORE_WORD_ATTEMPTS, { keyPath: 'id' });
        store.createIndex('childId', 'childId', { unique: false });
        store.createIndex('normalizedWord', 'normalizedWord', { unique: false });
        store.createIndex('childId_normalizedWord', ['childId', 'normalizedWord'], { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_PHONEME_ATTEMPTS)) {
        const pStore = db.createObjectStore(STORE_PHONEME_ATTEMPTS, { keyPath: 'id' });
        pStore.createIndex('childId', 'childId', { unique: false });
        pStore.createIndex('phoneme', 'phoneme', { unique: false });
        pStore.createIndex('childId_phoneme', ['childId', 'phoneme'], { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_PHONEME_PROFILES)) {
        const profStore = db.createObjectStore(STORE_PHONEME_PROFILES, { keyPath: 'id' });
        profStore.createIndex('childId', 'childId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_PHONICS_ATTEMPTS)) {
        const phStore = db.createObjectStore(STORE_PHONICS_ATTEMPTS, { keyPath: 'id' });
        phStore.createIndex('childId', 'childId', { unique: false });
        phStore.createIndex('soundId', 'soundId', { unique: false });
        phStore.createIndex('childId_soundId', ['childId', 'soundId'], { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_PHONICS_PROFILES)) {
        const phProfStore = db.createObjectStore(STORE_PHONICS_PROFILES, { keyPath: 'id' });
        phProfStore.createIndex('childId', 'childId', { unique: false });
        phProfStore.createIndex('soundId', 'soundId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_SPEECH_CAPTURE_ATTEMPTS)) {
        const scStore = db.createObjectStore(STORE_SPEECH_CAPTURE_ATTEMPTS, { keyPath: 'id' });
        scStore.createIndex('childId', 'childId', { unique: false });
        scStore.createIndex('sessionId', 'sessionId', { unique: false });
        scStore.createIndex('attemptId', 'attemptId', { unique: true });
        scStore.createIndex('childId_targetId', ['childId', 'targetId'], { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get active Child Profile with daily streak management
 */
export function getChildProfile(): ChildProfile {
  try {
    const activeId = getActiveChildId();
    const profiles = getAllChildProfiles();
    let profile = profiles.find((p) => p.childId === activeId);

    if (!profile) {
      profile = createCleanInitialProfile('Learner', '');
      saveChildProfile(profile);
      return profile;
    }

    // Check if new day for streak & session timer
    const today = new Date().toISOString().slice(0, 10);
    if (profile.lastActiveDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (profile.lastActiveDate === yesterday) {
        profile.streak += 1;
      } else {
        profile.streak = 1;
      }
      profile.lastActiveDate = today;
      profile.todaySessionSeconds = 0;
      profile.todayChallengeCompleted = false;
      saveChildProfile(profile);
    }
    return profile;
  } catch {
    return createCleanInitialProfile('Learner', '');
  }
}

/**
 * Save Child Profile & synchronize registry
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
    profile.updatedAt = Date.now();

    // Save in registry map
    const raw = localStorage.getItem(PROFILES_REGISTRY_KEY);
    const map: Record<string, ChildProfile> = raw ? JSON.parse(raw) : {};
    map[profile.childId] = profile;
    localStorage.setItem(PROFILES_REGISTRY_KEY, JSON.stringify(map));

    // Save active id
    localStorage.setItem(ACTIVE_CHILD_ID_KEY, profile.childId);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('readbuddy_profile_changed'));
    }
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
  notificationsEnabled: boolean;
}

export function getAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const directVoice = localStorage.getItem('readbuddy_save_voice_recording');
    const defaultSettings: AppSettings = {
      animationsEnabled: true,
      saveVoiceRecording: directVoice === 'true',
      notificationsEnabled: localStorage.getItem('readbuddy_notifications_enabled') !== 'false',
    };
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw);
    return {
      animationsEnabled: true,
      saveVoiceRecording: directVoice !== null ? directVoice === 'true' : !!parsed.saveVoiceRecording,
      notificationsEnabled: localStorage.getItem('readbuddy_notifications_enabled') !== 'false',
      ...parsed,
    };
  } catch {
    return { animationsEnabled: true, saveVoiceRecording: false, notificationsEnabled: true };
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
    if (settings.notificationsEnabled !== undefined) {
      localStorage.setItem('readbuddy_notifications_enabled', String(settings.notificationsEnabled));
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('readbuddy_settings_changed'));
    }
    return updated;
  } catch {
    return { animationsEnabled: true, saveVoiceRecording: false, notificationsEnabled: true };
  }
}

export function saveCustomReadingItem(item: ReadingItem) {
  try {
    const raw = localStorage.getItem('readbuddy_custom_reading_items');
    const items: ReadingItem[] = raw ? JSON.parse(raw) : [];
    items.push(item);
    localStorage.setItem('readbuddy_custom_reading_items', JSON.stringify(items));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('readbuddy_custom_lessons_changed'));
    }
  } catch (err) {
    console.error('Error saving custom reading item:', err);
  }
}

export function getCustomReadingItems(language: AppLanguage): ReadingItem[] {
  try {
    const raw = localStorage.getItem('readbuddy_custom_reading_items');
    if (!raw) return [];
    const items: ReadingItem[] = JSON.parse(raw);
    return items.filter((i) => i.language === language);
  } catch {
    return [];
  }
}

/**
 * Child-specific Badges management (isolated by childId)
 */
export function getBadges(childId?: string): BadgeItem[] {
  try {
    const targetId = childId || getActiveChildId();
    const key = `${BADGES_KEY_PREFIX}${targetId}`;
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(INITIAL_BADGES));
      return INITIAL_BADGES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_BADGES;
  }
}

export function updateBadgeProgress(badgeId: string, increment = 1, childId?: string): BadgeItem[] {
  const targetId = childId || getActiveChildId();
  const badges = getBadges(targetId);
  const badge = badges.find(b => b.id === badgeId);
  if (badge && !badge.unlocked) {
    badge.progress = Math.min(badge.target, badge.progress + increment);
    if (badge.progress >= badge.target) {
      badge.unlocked = true;
    }
    const key = `${BADGES_KEY_PREFIX}${targetId}`;
    localStorage.setItem(key, JSON.stringify(badges));
  }
  return badges;
}

/**
 * Save a new reading session recording strictly associated with childId
 */
export async function saveRecording(recording: SavedRecording): Promise<void> {
  try {
    if (!recording.childId) {
      recording.childId = getActiveChildId();
    }
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
 * Retrieve saved recordings for active child sorted by newest first (PURE CHILD-SCOPED)
 * Returns EMPTY array if this child has not recorded any sessions yet.
 * NEVER returns another child's recordings or demo recordings!
 */
export async function getSavedRecordings(childId?: string): Promise<SavedRecording[]> {
  try {
    const db = await openDB();
    const targetId = childId || getActiveChildId();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_RECORDINGS], 'readonly');
      const store = tx.objectStore(STORE_RECORDINGS);
      const request = store.getAll();

      request.onsuccess = () => {
        const allRecords = (request.result as SavedRecording[]).map(r => {
          if (r.audioBlob && !r.audioUrl) {
            r.audioUrl = URL.createObjectURL(r.audioBlob);
          }
          return r;
        });

        // STRICT CHILD FILTER: Only return recordings for this specific child
        const childRecords = allRecords.filter(r => r.childId === targetId);
        childRecords.sort((a, b) => b.timestamp - a.timestamp);
        resolve(childRecords);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Error fetching recordings', err);
    return [];
  }
}

/**
 * Log or increment sound substitutions strictly scoped by childId
 */
export async function recordSubstitutions(
  subs: Array<{ expectedSound: string; spokenSound: string; exampleWord: string; lang: AppLanguage }>,
  childId?: string
): Promise<void> {
  if (subs.length === 0) return;
  const targetId = childId || getActiveChildId();

  try {
    const db = await openDB();
    const tx = db.transaction([STORE_SUBSTITUTIONS], 'readwrite');
    const store = tx.objectStore(STORE_SUBSTITUTIONS);

    for (const item of subs) {
      const id = `${targetId}_sub_${item.lang}_${item.expectedSound}_${item.spokenSound}`;
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
            childId: targetId,
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
 * Get all sound substitutions sorted by frequency (PURE CHILD-SCOPED)
 * Returns EMPTY array if no substitutions logged for this child yet.
 */
export async function getSoundSubstitutions(lang?: AppLanguage, childId?: string): Promise<SoundSubstitutionLog[]> {
  try {
    const db = await openDB();
    const targetId = childId || getActiveChildId();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_SUBSTITUTIONS], 'readonly');
      const store = tx.objectStore(STORE_SUBSTITUTIONS);
      const req = store.getAll();

      req.onsuccess = () => {
        const allSubs = req.result as SoundSubstitutionLog[];
        let results = allSubs.filter(r => r.childId === targetId);
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
 * Get top 3 weak sounds for Sound Drill (child-scoped with curriculum focus fallbacks)
 */
export async function getTopWeakSounds(lang: AppLanguage, childId?: string): Promise<string[]> {
  const subs = await getSoundSubstitutions(lang, childId);
  const sounds = subs.map(s => s.expectedSound);
  const unique = Array.from(new Set(sounds));

  // Fallback curriculum focus sounds if child has no logged substitutions yet
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
 * Weekly statistics for parent portal (PURE CHILD-SCOPED)
 * Calculates strictly from active child's actual data.
 * If new child has 0 sessions: returns 0 minutes, 0 accuracy, empty days, no fake data!
 */
export async function getWeeklyStats(childId?: string): Promise<WeeklyStats> {
  const targetId = childId || getActiveChildId();
  const profiles = getAllChildProfiles();
  const profile = profiles.find(p => p.childId === targetId) || getChildProfile();
  const recordings = await getSavedRecordings(targetId);

  const now = Date.now();
  const oneDay = 86400000;
  const recentRecordings = recordings.filter(r => now - r.timestamp < 7 * oneDay);

  const targetMinutes = profile.dailyCapMinutes || 15;
  const todayMinutes = Math.floor(profile.todaySessionSeconds / 60);

  // Generate 7-day activity array strictly from real recordings and daily session timers
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailyActivity = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * oneDay);
    const dayName = dayNames[d.getDay()];
    const dateFormatted = `${d.getDate()}/${d.getMonth() + 1}`;
    const isToday = i === 0;

    // Calculate real practice time on that calendar day from recordings
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayEnd = dayStart + oneDay;
    const dayRecs = recordings.filter(r => r.timestamp >= dayStart && r.timestamp < dayEnd);
    const dayRecsMinutes = Math.round(dayRecs.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0) / 60);

    const mins = isToday ? Math.max(todayMinutes, dayRecsMinutes) : dayRecsMinutes;

    dailyActivity.push({
      day: dayName,
      dayShort: dayName,
      date: dateFormatted,
      minutes: mins,
      targetMinutes,
      isToday,
    });
  }

  const daysPracticed = dailyActivity.map(d => d.minutes > 0);
  const totalMins = dailyActivity.reduce((acc, curr) => acc + curr.minutes, 0);
  const wordsSpoken = profile.totalWordsPracticed;
  const totalParas = profile.totalParagraphsRead;

  // Real average clarity from actual recordings (0 if no recordings yet)
  let sumAccuracy = 0;
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
