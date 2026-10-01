import { AppLanguage, WordAnalysis, WordStatus } from '../types';

/**
 * Common articulation patterns for speech clarity in children
 */
interface SubstitutionRule {
  expected: string;
  alternatives: string[];
}

const ENGLISH_SUBSTITUTIONS: SubstitutionRule[] = [
  { expected: 'r', alternatives: ['l', 'w'] },
  { expected: 'sh', alternatives: ['s', 'ch'] },
  { expected: 'th', alternatives: ['t', 'd', 'f', 's'] },
  { expected: 'ch', alternatives: ['s', 'sh', 't'] },
  { expected: 'l', alternatives: ['w', 'y', 'r'] },
  { expected: 's', alternatives: ['th', 'sh'] },
  { expected: 'v', alternatives: ['b', 'w'] },
  { expected: 'k', alternatives: ['t'] },
  { expected: 'g', alternatives: ['d'] }
];

const HINDI_SUBSTITUTIONS: SubstitutionRule[] = [
  { expected: 'र', alternatives: ['ल', 'ड'] },
  { expected: 'ल', alternatives: ['र'] },
  { expected: 'श', alternatives: ['स'] },
  { expected: 'ष', alternatives: ['स'] },
  { expected: 'ण', alternatives: ['न'] },
  { expected: 'व', alternatives: ['ब'] },
  { expected: 'क्ष', alternatives: ['छ', 'ख'] },
  { expected: 'ज्ञ', alternatives: ['ग्य'] },
  { expected: 'ऋ', alternatives: ['रि'] }
];

/**
 * Clean a word for comparison (remove punctuation, lowercasing)
 */
export function cleanWord(raw: string, lang: AppLanguage): string {
  if (!raw) return '';
  if (lang === 'en') {
    return raw
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, '')
      .trim();
  }
  // Hindi cleaning
  return raw
    .replace(/[।.,/#!$%^&*;:{}=\-_`~()?"'’]/g, '')
    .trim();
}

/**
 * Standard Levenshtein distance for fuzzy/lenient speech evaluation
 */
export function levenshteinDistance(a: string, b: string): number {
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity between 0 and 1
 */
export function wordSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(a, b);
  return Math.max(0, 1 - dist / maxLen);
}

/**
 * Detect if mismatch corresponds to an expected sound substitution
 */
export function detectSubstitution(
  expectedClean: string,
  spokenClean: string,
  lang: AppLanguage
): { expectedSound: string; spokenSound: string } | null {
  const rules = lang === 'en' ? ENGLISH_SUBSTITUTIONS : HINDI_SUBSTITUTIONS;

  let bestMatch: { expectedSound: string; spokenSound: string; similarity: number } | null = null;

  for (const rule of rules) {
    if (expectedClean.includes(rule.expected)) {
      for (const alt of rule.alternatives) {
        // If replacing expected with alt brings it close to spokenClean
        const simulated = expectedClean.split(rule.expected).join(alt);
        const sim = wordSimilarity(simulated, spokenClean);
        const containsAlt = spokenClean.includes(alt);
        if (sim >= 0.7 && containsAlt) {
          if (!bestMatch || sim > bestMatch.similarity) {
            bestMatch = {
              expectedSound: rule.expected,
              spokenSound: alt,
              similarity: sim,
            };
          }
        }
      }
    }
  }

  if (bestMatch) {
    return {
      expectedSound: bestMatch.expectedSound,
      spokenSound: bestMatch.spokenSound,
    };
  }

  // Fallback: check first character difference
  if (expectedClean.length > 0 && spokenClean.length > 0 && expectedClean[0] !== spokenClean[0]) {
    return {
      expectedSound: expectedClean[0],
      spokenSound: spokenClean[0],
    };
  }

  return null;
}

/**
 * Lenient comparison of child's spoken utterance against paragraph words
 */
export function analyzeSpokenText(
  expectedText: string,
  spokenTranscript: string,
  lang: AppLanguage,
  syllablesMap: Record<string, string> = {}
): WordAnalysis[] {
  // Tokenize expected text preserving punctuation for display
  const rawWords = expectedText.trim().split(/\s+/);
  const spokenWordsRaw = spokenTranscript.trim().split(/\s+/);
  const spokenCleanList = spokenWordsRaw.map(w => cleanWord(w, lang)).filter(Boolean);

  let spokenIndex = 0;
  const results: WordAnalysis[] = [];

  for (let i = 0; i < rawWords.length; i++) {
    const rawWord = rawWords[i];
    const cleaned = cleanWord(rawWord, lang);
    const customSyllables = syllablesMap[cleaned] || getAutoSyllables(cleaned, lang);

    if (spokenIndex >= spokenCleanList.length) {
      // Not yet spoken
      results.push({
        expected: rawWord,
        cleaned,
        status: 'pending',
        syllables: customSyllables
      });
      continue;
    }

    // Look ahead window of 3 words in spoken stream to be forgiving of skips or stutter
    let bestSpokenMatch = '';
    let bestSimilarity = 0;
    let bestIndexOffset = -1;

    for (let look = 0; look < Math.min(3, spokenCleanList.length - spokenIndex); look++) {
      const candidate = spokenCleanList[spokenIndex + look];
      const sim = wordSimilarity(cleaned, candidate);
      if (sim > bestSimilarity) {
        bestSimilarity = sim;
        bestSpokenMatch = candidate;
        bestIndexOffset = look;
      }
    }

    // Very lenient threshold (Class 6 with unclear speech, 65% or higher considered "close enough")
    const isLenientCorrect = bestSimilarity >= 0.65;

    if (bestSimilarity >= 0.4) {
      spokenIndex += bestIndexOffset + 1;

      if (isLenientCorrect) {
        results.push({
          expected: rawWord,
          cleaned,
          status: 'correct',
          spoken: bestSpokenMatch,
          syllables: customSyllables
        });
      } else {
        // Needs practice (orange) - never red!
        const sub = detectSubstitution(cleaned, bestSpokenMatch, lang);
        results.push({
          expected: rawWord,
          cleaned,
          status: 'needs-practice',
          spoken: bestSpokenMatch,
          syllables: customSyllables,
          detectedSubstitution: sub || undefined
        });
      }
    } else {
      // Low similarity, mark needs-practice
      results.push({
        expected: rawWord,
        cleaned,
        status: 'needs-practice',
        spoken: spokenCleanList[spokenIndex] || '',
        syllables: customSyllables,
        detectedSubstitution: detectSubstitution(cleaned, spokenCleanList[spokenIndex] || '', lang) || undefined
      });
      spokenIndex++;
    }
  }

  return results;
}

/**
 * Syllable breakdown generator with hyphen separation (e.g. e-le-phant)
 */
export function getAutoSyllables(word: string, lang: AppLanguage): string {
  if (!word || word.length <= 3) return word;

  if (lang === 'hi') {
    // Hindi Devanagari syllabification
    // Group consonants + attached matras, anusvara, visarga
    const syllables: string[] = [];
    let current = '';
    const matras = /[\u093E-\u094C\u0901-\u0903\u094D]/; // vowel signs & virama

    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      if (current.length > 0 && !matras.test(char) && word[i - 1] !== '\u094D') {
        syllables.push(current);
        current = char;
      } else {
        current += char;
      }
    }
    if (current) syllables.push(current);
    return syllables.join('-');
  }

  // English rule-based syllable splitter
  const vowels = /[aeiouy]/i;
  const syllables: string[] = [];
  let current = '';

  for (let i = 0; i < word.length; i++) {
    current += word[i];
    // Check for syllable cut
    if (
      vowels.test(word[i]) &&
      i < word.length - 2 &&
      !vowels.test(word[i + 1]) &&
      vowels.test(word[i + 2])
    ) {
      syllables.push(current);
      current = '';
    } else if (
      !vowels.test(word[i]) &&
      i < word.length - 1 &&
      !vowels.test(word[i + 1]) &&
      current.length >= 2 &&
      vowels.test(current)
    ) {
      syllables.push(current);
      current = '';
    }
  }
  if (current) syllables.push(current);

  return syllables.length > 1 ? syllables.join('-') : word;
}
