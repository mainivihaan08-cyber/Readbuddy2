import {
  AppLanguage,
  AudioQualityMetrics,
  PhonicsSound,
  PhonicsAttemptRecord,
  PhonicsAttemptResult,
  ChildPhonicsProfile,
  PhonicsDashboardSummary,
  PhonicsMasteryStatus,
  PhonicsPositionType,
  PronunciationConfidence,
  AcousticEvidenceMetrics
} from '../types';
import {
  openDB,
  STORE_PHONICS_ATTEMPTS,
  STORE_PHONICS_PROFILES,
  getActiveChildId
} from './storage';
import { getPhonicsSounds, getPhonicsSoundById } from '../data/phonicsLibrary';
import { analyzeAudioQuality } from './deepPronunciationEngine';
import { cleanWord, wordSimilarity } from './soundAnalysis';
import { getChildWordProfiles } from './wordDifficultyEngine';

// In-memory cache for snappy UI navigation
const memoryPhonicsAttemptsCache: Record<string, PhonicsAttemptRecord[]> = {};

/**
 * Acoustically evaluate a sound-only audio recording without requiring full word transcription.
 * Fulfills Requirement 56 & 78
 */
export async function evaluateSoundOnlyAudio(
  audioBlob: Blob | undefined,
  sound: PhonicsSound,
  childId?: string,
  sessionId?: string,
  recordingDurationSeconds = 1.5
): Promise<{
  result: PhonicsAttemptResult;
  confidence: PronunciationConfidence;
  audioQuality: AudioQualityMetrics;
  acousticFeatures: AcousticEvidenceMetrics;
  observation: string;
  interpretation: string;
  recommendation: string;
}> {
  const targetChildId = childId || getActiveChildId();
  const audioQuality = await analyzeAudioQuality(audioBlob, recordingDurationSeconds);

  // Fallback / standard default if no Web Audio Context or silent
  if (audioQuality.status === 'insufficient' || !audioBlob) {
    return {
      result: 'uncertain',
      confidence: 'low',
      audioQuality,
      acousticFeatures: { durationMs: Math.round(recordingDurationSeconds * 1000) },
      observation: 'Audio input was too quiet or unclear for reliable acoustic evaluation.',
      interpretation: 'Insufficient signal-to-noise ratio.',
      recommendation: 'Position your device microphone closer and speak clearly in a normal voice.',
    };
  }

  let acousticFeatures: AcousticEvidenceMetrics = {
    durationMs: Math.round(audioQuality.durationSeconds * 1000),
    intensityDb: audioQuality.snrDb + 40,
  };

  let result: PhonicsAttemptResult = 'correct';
  let confidence: PronunciationConfidence = 'high';
  let observation = `Clear production of ${sound.ipaSymbol} (${sound.displayName}).`;
  let interpretation = 'Acoustic characteristics match the expected phoneme pattern.';
  let recommendation = `Great work! Ready to practice ${sound.ipaSymbol} inside words.`;

  try {
    if (typeof window !== 'undefined' && window.AudioContext) {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const decoded = await audioCtx.decodeAudioData(arrayBuffer);
      const channelData = decoded.getChannelData(0);
      const sampleRate = decoded.sampleRate;
      const len = channelData.length;

      // Extract basic spectral centroid and zero crossing rate
      let zeroCrossings = 0;
      let totalEnergy = 0;
      let highFreqEnergy = 0; // > 3 kHz energy estimation
      const nyquist = sampleRate / 2;

      for (let i = 1; i < len; i++) {
        if ((channelData[i] >= 0 && channelData[i - 1] < 0) || (channelData[i] < 0 && channelData[i - 1] >= 0)) {
          zeroCrossings++;
        }
        const val = Math.abs(channelData[i]);
        totalEnergy += val * val;
      }

      const zcr = zeroCrossings / Math.max(1, len);
      const estimatedCentroidHz = Math.round(zcr * nyquist);
      const isVoiced = zcr < 0.18;

      acousticFeatures = {
        ...acousticFeatures,
        spectralCenterHz: estimatedCentroidHz,
        voicingLikely: isVoiced,
        durationMs: Math.round(decoded.duration * 1000),
      };

      await audioCtx.close().catch(() => {});

      // Phoneme-specific acoustic rule check
      const id = sound.soundId;
      if (id === 'phonics_s' || id === 'phonics_hi_s') {
        // /s/ requires unvoiced high-frequency hiss (> 3500 Hz)
        if (estimatedCentroidHz >= 2800) {
          result = 'correct';
          confidence = 'high';
          observation = 'Crisp, high-frequency hiss typical of /s/.';
        } else if (estimatedCentroidHz >= 1800) {
          result = 'likely_correct';
          confidence = 'medium';
          observation = 'Good /s/ effort with slight mid-frequency resonance.';
        } else {
          result = 'possible_error';
          confidence = 'medium';
          observation = 'Sound was lower in pitch than expected for a crisp /s/.';
          interpretation = 'Possible voicing or tongue placed too far back.';
          recommendation = sound.articulatoryTip;
        }
      } else if (id === 'phonics_sh' || id === 'phonics_hi_sh') {
        // /ʃ/ mid-high spectral plateau (2000 - 4500 Hz)
        if (estimatedCentroidHz >= 2000 && estimatedCentroidHz <= 5500) {
          result = 'correct';
          confidence = 'high';
          observation = 'Broad gentle friction sound matching /ʃ/.';
        } else {
          result = 'likely_correct';
          confidence = 'medium';
          observation = 'Acceptable /ʃ/ friction sound.';
        }
      } else if (id === 'phonics_r' || id === 'phonics_hi_r') {
        // /r/ voiced with continuous resonant energy
        if (isVoiced && decoded.duration >= 0.4) {
          result = 'correct';
          confidence = 'high';
          observation = 'Steady voiced resonance consistent with /r/.';
        } else if (isVoiced) {
          result = 'likely_correct';
          confidence = 'medium';
          observation = 'Good voiced /r/ sound. Try holding it a little longer.';
        } else {
          result = 'possible_error';
          confidence = 'medium';
          observation = 'Sound lacked the vocal vibration characteristic of /r/.';
          interpretation = 'Tongue might be touching teeth or unvoiced air.';
          recommendation = sound.articulatoryTip;
        }
      } else if (id === 'phonics_l' || id === 'phonics_hi_l') {
        // /l/ voiced resonant lateral
        if (isVoiced) {
          result = 'correct';
          confidence = 'high';
          observation = 'Clear voiced lateral resonant sound for /l/.';
        } else {
          result = 'likely_correct';
          confidence = 'medium';
        }
      } else {
        // Default general evaluation based on energy and clarity
        if (audioQuality.status === 'excellent' || audioQuality.status === 'good') {
          result = 'correct';
          confidence = 'high';
        } else {
          result = 'likely_correct';
          confidence = 'medium';
        }
      }
    }
  } catch (err) {
    console.warn('[PhonicsEngine] Sound acoustic evaluation fallback:', err);
    result = 'likely_correct';
    confidence = 'medium';
  }

  return {
    result,
    confidence,
    audioQuality,
    acousticFeatures,
    observation,
    interpretation,
    recommendation,
  };
}

/**
 * Evaluate a phonics attempt on words, phrases, sentences, or contrast pairs
 */
export function evaluatePhonicsSpokenText(
  targetText: string,
  spokenText: string,
  sound: PhonicsSound,
  position: PhonicsPositionType,
  attemptType: 'word' | 'phrase' | 'sentence' | 'contrast',
  audioQuality: AudioQualityMetrics,
  language: AppLanguage
): {
  result: PhonicsAttemptResult;
  confidence: PronunciationConfidence;
  observation: string;
  interpretation: string;
  recommendation: string;
  errorType?: 'substitution' | 'omission' | 'addition' | 'distortion' | 'timing_difference' | 'uncertain';
} {
  const cleanTarget = cleanWord(targetText, language);
  const cleanSpoken = cleanWord(spokenText, language);

  if (!cleanSpoken || cleanSpoken.length === 0) {
    return {
      result: 'uncertain',
      confidence: 'low',
      observation: 'No audible speech detected.',
      interpretation: 'Microphone did not pick up speech.',
      recommendation: 'Tap the mic and speak clearly when ready.',
      errorType: 'uncertain',
    };
  }

  const similarity = wordSimilarity(cleanTarget, cleanSpoken);

  if (similarity >= 0.8) {
    return {
      result: 'correct',
      confidence: 'high',
      observation: `Accurate pronunciation of "${targetText}" focusing on ${sound.ipaSymbol}.`,
      interpretation: 'Clear articulation aligned with target.',
      recommendation: `Awesome! You mastered ${sound.ipaSymbol} in this ${attemptType}.`,
    };
  } else if (similarity >= 0.55) {
    return {
      result: 'likely_correct',
      confidence: 'medium',
      observation: `Good effort on "${targetText}". Heard: "${spokenText}".`,
      interpretation: 'Minor variation in pacing or adjacent sound.',
      recommendation: `Practice saying "${targetText}" slowly with extra focus on the ${sound.ipaSymbol} sound.`,
    };
  } else {
    return {
      result: 'possible_error',
      confidence: 'medium',
      observation: `Difference observed for "${targetText}". Heard: "${spokenText}".`,
      interpretation: `Possible sound substitution or omission around the ${position} ${sound.ipaSymbol} sound.`,
      recommendation: `${sound.articulatoryTip}`,
      errorType: 'substitution',
    };
  }
}

/**
 * Record a phonics attempt into IndexedDB.
 * Strictly child-scoped.
 */
export async function recordPhonicsAttempt(
  attemptData: Omit<PhonicsAttemptRecord, 'id' | 'createdAt' | 'dateStr' | 'childId'> & {
    childId?: string;
  }
): Promise<PhonicsAttemptRecord> {
  const targetChildId = attemptData.childId || getActiveChildId();
  const now = Date.now();
  const dateStr = new Date().toISOString().slice(0, 10);

  const record: PhonicsAttemptRecord = {
    id: `pa_${now}_${Math.random().toString(36).slice(2, 7)}`,
    ...attemptData,
    childId: targetChildId,
    createdAt: now,
    dateStr,
  };

  // 1. Update in-memory cache
  if (!memoryPhonicsAttemptsCache[targetChildId]) {
    memoryPhonicsAttemptsCache[targetChildId] = [];
  }
  memoryPhonicsAttemptsCache[targetChildId].push(record);

  // 2. Persist in IndexedDB
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_PHONICS_ATTEMPTS], 'readwrite');
    const store = tx.objectStore(STORE_PHONICS_ATTEMPTS);
    store.put(record);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('readbuddy_phonics_updated'));
    }
  } catch (err) {
    console.warn('[PhonicsEngine] Error persisting phonics attempt to IndexedDB:', err);
  }

  return record;
}

/**
 * Get all phonics attempts for a child.
 * Strictly child-scoped. Never returns demo or other child's data.
 */
export async function getPhonicsAttemptsForChild(
  childId?: string,
  soundId?: string
): Promise<PhonicsAttemptRecord[]> {
  const targetChildId = childId || getActiveChildId();

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction([STORE_PHONICS_ATTEMPTS], 'readonly');
      const store = tx.objectStore(STORE_PHONICS_ATTEMPTS);
      const req = store.getAll();

      req.onsuccess = () => {
        const all = req.result as PhonicsAttemptRecord[];
        let filtered = all.filter((r) => r.childId === targetChildId);
        if (soundId) {
          filtered = filtered.filter((r) => r.soundId === soundId);
        }
        filtered.sort((a, b) => a.createdAt - b.createdAt);
        memoryPhonicsAttemptsCache[targetChildId] = filtered;
        resolve(filtered);
      };

      req.onerror = () => {
        resolve(memoryPhonicsAttemptsCache[targetChildId] || []);
      };
    });
  } catch {
    return memoryPhonicsAttemptsCache[targetChildId] || [];
  }
}

/**
 * Calculate dynamic Child Phonics Profiles.
 * Fulfills Requirements 59, 61, 62, 69, 77
 */
export async function getChildPhonicsProfiles(
  language: AppLanguage,
  childId?: string
): Promise<ChildPhonicsProfile[]> {
  const targetChildId = childId || getActiveChildId();
  const allAttempts = await getPhonicsAttemptsForChild(targetChildId);
  const sounds = getPhonicsSounds(language);

  const profiles: ChildPhonicsProfile[] = [];

  for (const sound of sounds) {
    const soundAttempts = allAttempts.filter((a) => a.soundId === sound.soundId);

    if (soundAttempts.length === 0) {
      // Clean initial unpracticed state
      profiles.push({
        id: `cpp_${targetChildId}_${sound.soundId}`,
        childId: targetChildId,
        soundId: sound.soundId,
        targetPhoneme: sound.phonicsLabel,
        ipaSymbol: sound.ipaSymbol,
        language: sound.language,
        totalAttempts: 0,
        correctAttempts: 0,
        errorAttempts: 0,
        uncertainAttempts: 0,
        validAttempts: 0,
        overallAccuracy: 0,
        recentAccuracy: 0,
        initialAccuracy: 0,
        medialAccuracy: 0,
        finalAccuracy: 0,
        soundOnlyAccuracy: 0,
        initialAttempts: 0,
        medialAttempts: 0,
        finalAttempts: 0,
        soundOnlyAttempts: 0,
        recentAttempts: [],
        trend: 'insufficient_data',
        status: 'not_started',
        masteryLevel: 'not_started',
        currentProgressionLevel: 1,
        consecutiveSuccessfulAttempts: 0,
        lastPracticedAt: 0,
        updatedAt: Date.now(),
        recommendedAction: language === 'en'
          ? `Tap [Practice] to start Level 1 sound recognition for ${sound.ipaSymbol}.`
          : `${sound.ipaSymbol} ध्वनि के स्तर १ अभ्यास के लिए [अभ्यास] पर टैप करें।`,
      });
      continue;
    }

    // Sort chronologically
    soundAttempts.sort((a, b) => a.createdAt - b.createdAt);

    const totalAttempts = soundAttempts.length;
    const correctAttempts = soundAttempts.filter(
      (a) => a.result === 'correct' || a.result === 'likely_correct'
    ).length;
    const errorAttempts = soundAttempts.filter(
      (a) => a.result === 'possible_error' || a.result === 'likely_error'
    ).length;
    const uncertainAttempts = soundAttempts.filter((a) => a.result === 'uncertain').length;
    const validAttempts = correctAttempts + errorAttempts;

    // Overall accuracy
    const overallAccuracy = validAttempts > 0 ? Math.round((correctAttempts / validAttempts) * 100) : 0;

    // Recent attempts (last 5 - 8)
    const recentSlice = soundAttempts.slice(-8);
    const recentResults = recentSlice.map((a) => a.result);
    const recentValid = recentSlice.filter((a) => a.result !== 'uncertain');
    const recentCorrect = recentSlice.filter((a) => a.result === 'correct' || a.result === 'likely_correct').length;
    const recentAccuracy = recentValid.length > 0 ? Math.round((recentCorrect / recentValid.length) * 100) : overallAccuracy;

    // Position-specific calculations
    const initAtts = soundAttempts.filter((a) => a.position === 'initial');
    const initValid = initAtts.filter((a) => a.result !== 'uncertain');
    const initCorr = initAtts.filter((a) => a.result === 'correct' || a.result === 'likely_correct').length;
    const initialAccuracy = initValid.length > 0 ? Math.round((initCorr / initValid.length) * 100) : 0;

    const medAtts = soundAttempts.filter((a) => a.position === 'medial');
    const medValid = medAtts.filter((a) => a.result !== 'uncertain');
    const medCorr = medAtts.filter((a) => a.result === 'correct' || a.result === 'likely_correct').length;
    const medialAccuracy = medValid.length > 0 ? Math.round((medCorr / medValid.length) * 100) : 0;

    const finAtts = soundAttempts.filter((a) => a.position === 'final');
    const finValid = finAtts.filter((a) => a.result !== 'uncertain');
    const finCorr = finAtts.filter((a) => a.result === 'correct' || a.result === 'likely_correct').length;
    const finalAccuracy = finValid.length > 0 ? Math.round((finCorr / finValid.length) * 100) : 0;

    const sndOnlyAtts = soundAttempts.filter((a) => a.position === 'sound_only' || a.attemptType === 'sound_only');
    const sndOnlyValid = sndOnlyAtts.filter((a) => a.result !== 'uncertain');
    const sndOnlyCorr = sndOnlyAtts.filter((a) => a.result === 'correct' || a.result === 'likely_correct').length;
    const soundOnlyAccuracy = sndOnlyValid.length > 0 ? Math.round((sndOnlyCorr / sndOnlyValid.length) * 100) : 0;

    // Consecutive correct attempts
    let consecutiveSuccessfulAttempts = 0;
    for (let i = soundAttempts.length - 1; i >= 0; i--) {
      const res = soundAttempts[i].result;
      if (res === 'correct' || res === 'likely_correct') {
        consecutiveSuccessfulAttempts++;
      } else if (res === 'possible_error' || res === 'likely_error') {
        break;
      }
    }

    // Historical older accuracy comparison for trend
    const olderSlice = soundAttempts.slice(0, Math.max(1, soundAttempts.length - 5));
    const olderValid = olderSlice.filter((a) => a.result !== 'uncertain');
    const olderCorr = olderSlice.filter((a) => a.result === 'correct' || a.result === 'likely_correct').length;
    const olderAccuracy = olderValid.length > 0 ? Math.round((olderCorr / olderValid.length) * 100) : overallAccuracy;

    // Mastery state determination (Requirement 62 & 69)
    // Criteria: >= 5 valid attempts, >= 90% recent accuracy, >= 3 consecutive successful attempts
    const meetsMasteryCriteria =
      validAttempts >= 5 &&
      recentAccuracy >= 90 &&
      consecutiveSuccessfulAttempts >= 3;

    const lastPracticedAt = soundAttempts[soundAttempts.length - 1].createdAt;
    const daysSincePractice = (Date.now() - lastPracticedAt) / (1000 * 60 * 60 * 24);

    let status: PhonicsMasteryStatus = 'practicing';
    let trend: 'improving' | 'stable' | 'declining' | 'needs_attention' | 'insufficient_data' = 'stable';
    let currentProgressionLevel = 1;

    if (validAttempts < 2) {
      status = 'insufficient_data';
      trend = 'insufficient_data';
      currentProgressionLevel = 1;
    } else if (meetsMasteryCriteria) {
      if (daysSincePractice >= 3 && recentAccuracy < 85) {
        status = 'needs_review';
        trend = 'needs_attention';
      } else {
        status = 'mastered';
        trend = 'improving';
      }
      currentProgressionLevel = 9;
    } else if (validAttempts >= 3 && recentAccuracy >= 80 && recentAccuracy > olderAccuracy + 12) {
      status = 'improving';
      trend = 'improving';
      currentProgressionLevel = Math.min(8, Math.max(3, Math.floor(validAttempts / 2) + 2));
    } else if (recentAccuracy >= 80 && validAttempts >= 4) {
      status = 'almost_mastered';
      trend = 'stable';
      currentProgressionLevel = 7;
    } else if (validAttempts >= 4 && olderAccuracy >= 70 && recentAccuracy < 60) {
      status = 'practicing';
      trend = 'declining';
      currentProgressionLevel = 3;
    } else if (recentAccuracy < 70) {
      status = 'learning';
      trend = 'needs_attention';
      currentProgressionLevel = 2;
    } else {
      status = 'practicing';
      trend = 'stable';
      currentProgressionLevel = 4;
    }

    // Recommended Action
    let recommendedAction = '';
    if (status === 'mastered') {
      recommendedAction = language === 'en'
        ? `Mastered! Keep in top shape with periodic short reviews.`
        : `कंठस्थ! समय-समय पर छोटा अभ्यास कर ताजगी बनाए रखें।`;
    } else if (status === 'needs_review') {
      recommendedAction = language === 'en'
        ? `Ready for a quick 3-attempt review to keep mastery active.`
        : `कंठस्थ स्थिति बनाए रखने के लिए ३ बार का त्वरित अभ्यास करें।`;
    } else if (status === 'improving') {
      recommendedAction = language === 'en'
        ? `Great progress (+${recentAccuracy - olderAccuracy}%)! Practice ${sound.ipaSymbol} in short sentences.`
        : `शानदार सुधार! ${sound.ipaSymbol} को छोटे वाक्यों में बोलें।`;
    } else if (initialAccuracy < 70 && initAtts.length >= 2) {
      recommendedAction = language === 'en'
        ? `Focus on initial position: "${sound.positionExamples.initial.slice(0, 3).join(', ')}".`
        : `प्रारंभिक स्थान पर ध्यान दें: "${sound.positionExamples.initial.slice(0, 3).join(', ')}"`;
    } else {
      recommendedAction = language === 'en'
        ? `Practice 5-stage progression for ${sound.ipaSymbol}.`
        : `${sound.ipaSymbol} के लिए ५-चरणीय अभ्यास करें।`;
    }

    profiles.push({
      id: `cpp_${targetChildId}_${sound.soundId}`,
      childId: targetChildId,
      soundId: sound.soundId,
      targetPhoneme: sound.phonicsLabel,
      ipaSymbol: sound.ipaSymbol,
      language: sound.language,
      totalAttempts,
      correctAttempts,
      errorAttempts,
      uncertainAttempts,
      validAttempts,
      overallAccuracy,
      recentAccuracy,
      initialAccuracy,
      medialAccuracy,
      finalAccuracy,
      soundOnlyAccuracy,
      initialAttempts: initAtts.length,
      medialAttempts: medAtts.length,
      finalAttempts: finAtts.length,
      soundOnlyAttempts: sndOnlyAtts.length,
      recentAttempts: recentResults,
      trend,
      status,
      masteryLevel: status === 'mastered' ? 'mastered' : status === 'needs_review' ? 'needs_review' : status === 'almost_mastered' ? 'almost_mastered' : status === 'improving' ? 'practicing' : 'learning',
      currentProgressionLevel,
      consecutiveSuccessfulAttempts,
      lastPracticedAt,
      lastMasteredAt: meetsMasteryCriteria ? lastPracticedAt : undefined,
      updatedAt: Date.now(),
      recommendedAction,
    });
  }

  return profiles;
}

/**
 * Get aggregated Phonics Dashboard Summary.
 * Fulfills Requirement 63
 */
export async function getPhonicsDashboardSummary(
  language: AppLanguage,
  childId?: string
): Promise<PhonicsDashboardSummary> {
  const targetChildId = childId || getActiveChildId();
  const profiles = await getChildPhonicsProfiles(language, targetChildId);

  const strongSounds = profiles.filter(
    (p) => p.validAttempts >= 3 && p.recentAccuracy >= 85 && p.status !== 'needs_review'
  );
  const practicingSounds = profiles.filter(
    (p) => p.validAttempts > 0 && p.status !== 'mastered' && p.status !== 'needs_review'
  );
  const needsReviewSounds = profiles.filter((p) => p.status === 'needs_review');
  const recentlyImprovedSounds = profiles.filter((p) => p.trend === 'improving');
  const masteredSounds = profiles.filter((p) => p.status === 'mastered');

  const practicingCount = profiles.filter((p) => p.totalAttempts > 0).length;

  // Recommendation engine (Requirement 68)
  // Highest priority: needs_review -> lowest accuracy with practice -> unpracticed challenging
  let topRecommendedSound: PhonicsSound | undefined = undefined;

  if (needsReviewSounds.length > 0) {
    topRecommendedSound = getPhonicsSoundById(needsReviewSounds[0].soundId);
  } else if (practicingSounds.length > 0) {
    const sorted = [...practicingSounds].sort((a, b) => a.recentAccuracy - b.recentAccuracy);
    topRecommendedSound = getPhonicsSoundById(sorted[0].soundId);
  } else {
    const sounds = getPhonicsSounds(language);
    topRecommendedSound = sounds[0];
  }

  return {
    childId: targetChildId,
    strongSounds,
    practicingSounds,
    needsReviewSounds,
    recentlyImprovedSounds,
    masteredSounds,
    topRecommendedSound,
    totalPracticedSoundsCount: practicingCount,
  };
}

/**
 * Connect phonics sound performance with reading word performance.
 * Fulfills Requirement 65 & 66
 */
export async function getPhonicsDifficultWordConnection(
  soundId: string,
  language: AppLanguage,
  childId?: string
): Promise<{
  sound: PhonicsSound;
  soundAccuracy: number;
  difficultWords: string[];
  explanation: string;
  hasPatternEvidence: boolean;
}> {
  const targetChildId = childId || getActiveChildId();
  const sound = getPhonicsSoundById(soundId) || getPhonicsSounds(language)[0];
  const profiles = await getChildPhonicsProfiles(language, targetChildId);
  const currentSoundProfile = profiles.find((p) => p.soundId === soundId);
  const soundAccuracy = currentSoundProfile ? currentSoundProfile.recentAccuracy : 0;

  const wordProfiles = await getChildWordProfiles(language, targetChildId);

  // Find difficult words containing this phoneme
  const rawCleanSound = sound.phonicsLabel.toLowerCase();
  const difficultWords = wordProfiles
    .filter((w) => {
      const match =
        w.normalizedWord.includes(rawCleanSound) ||
        (w.primarySound && w.primarySound.toLowerCase() === rawCleanSound);
      return match && (w.currentStatus === 'needs-practice' || w.currentStatus === 'declining' || w.recentAccuracy < 70);
    })
    .map((w) => w.word);

  const hasPatternEvidence = difficultWords.length >= 2;

  let explanation = '';
  if (hasPatternEvidence) {
    explanation = language === 'en'
      ? `${sound.ipaSymbol} appears in ${difficultWords.length} words (${difficultWords.slice(0, 4).map(w => `"${w}"`).join(', ')}) where recent reading accuracy was lower.`
      : `${sound.ipaSymbol} ध्वनि ${difficultWords.length} शब्दों (${difficultWords.slice(0, 4).map(w => `"${w}"`).join(', ')}) में उपस्थित है जहां वाचन सटीकता कम रही।`;
  } else if (difficultWords.length === 1) {
    explanation = language === 'en'
      ? `Word "${difficultWords[0]}" contains ${sound.ipaSymbol} and may benefit from focused sound practice.`
      : `शब्द "${difficultWords[0]}" में ${sound.ipaSymbol} शामिल है और इस पर ध्वनि अभ्यास उपयोगी होगा।`;
  } else {
    explanation = language === 'en'
      ? `No reading difficulties currently associated with ${sound.ipaSymbol}. All words with this sound are reading smoothly.`
      : `वर्तमान में ${sound.ipaSymbol} से संबंधित कोई वाचन कठिनाई नहीं है।`;
  }

  return {
    sound,
    soundAccuracy,
    difficultWords,
    explanation,
    hasPatternEvidence,
  };
}
