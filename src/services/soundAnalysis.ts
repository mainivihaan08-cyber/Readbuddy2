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

const ENGLISH_DIGITS: Record<string, string> = {
  '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
  '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
  '10': 'ten', '11': 'eleven', '12': 'twelve', '13': 'thirteen', '14': 'fourteen',
  '15': 'fifteen', '16': 'sixteen', '17': 'seventeen', '18': 'eighteen', '19': 'nineteen',
  '20': 'twenty', '21': 'twentyone', '22': 'twentytwo', '23': 'twentythree', '24': 'twentyfour',
  '25': 'twentyfive', '26': 'twentysix', '27': 'twentyseven', '28': 'twentyeight', '29': 'twentynine',
  '30': 'thirty', '31': 'thirtyone', '32': 'thirtytwo', '33': 'thirtythree', '34': 'thirtyfour',
  '35': 'thirtyfive', '36': 'thirtysix', '37': 'thirtyseven', '38': 'thirtyeight', '39': 'thirtynine',
  '40': 'forty', '41': 'fortyone', '42': 'fortytwo', '43': 'fortythree', '44': 'fortyfour',
  '45': 'fortyfive', '46': 'fortysix', '47': 'fortyseven', '48': 'fortyeight', '49': 'fortynine',
  '50': 'fifty', '51': 'fiftyone', '52': 'fiftytwo', '53': 'fiftythree', '54': 'fiftyfour',
  '55': 'fiftyfive', '56': 'fiftysix', '57': 'fiftyseven', '58': 'fiftyeight', '59': 'fiftynine',
  '60': 'sixty', '61': 'sixtyone', '62': 'sixtytwo', '63': 'sixtythree', '64': 'sixtyfour',
  '65': 'sixtyfive', '66': 'sixtysix', '67': 'sixtyseven', '68': 'sixtyeight', '69': 'sixtynine',
  '70': 'seventy', '71': 'seventyone', '72': 'seventytwo', '73': 'seventythree', '74': 'seventyfour',
  '75': 'seventyfive', '76': 'seventysix', '77': 'seventyseven', '78': 'seventyeight', '79': 'seventynine',
  '80': 'eighty', '81': 'eightyone', '82': 'eightytwo', '83': 'eightythree', '84': 'eightyfour',
  '85': 'eightyfive', '86': 'eightysix', '87': 'eightyseven', '88': 'eightyeight', '89': 'eightynine',
  '90': 'ninety', '91': 'ninetyone', '92': 'ninetytwo', '93': 'ninetythree', '94': 'ninetyfour',
  '95': 'ninetyfive', '96': 'ninetysix', '97': 'ninetyseven', '98': 'ninetyeight', '99': 'ninetynine',
  '100': 'hundred',
};

const HINDI_DIGITS: Record<string, string> = {
  '०': 'शून्य', '१': 'एक', '२': 'दो', '३': 'तीन', '४': 'चार',
  '५': 'पाँच', '६': 'छह', '७': 'सात', '८': 'आठ', '९': 'नौ',
  '१०': 'दस', '0': 'शून्य', '1': 'एक', '2': 'दो', '3': 'तीन', '4': 'चार',
  '5': 'पाँच', '6': 'छह', '7': 'सात', '8': 'आठ', '9': 'नौ', '10': 'दस',
  '20': 'बीस', '30': 'तीस', '40': 'चालीस', '50': 'पचास', '60': 'साठ',
  '70': 'सत्तर', '80': 'अस्सी', '90': 'नब्बे', '100': 'सौ',
};

const ENGLISH_HOMOPHONES: Record<string, string> = {
  'won': 'one',
  'to': 'two',
  'too': 'two',
  'for': 'four',
  'fore': 'four',
  'ate': 'eight',
  'son': 'sun',
  'sea': 'see',
  'bee': 'be',
  'buy': 'by',
  'bye': 'by',
  'hear': 'here',
  'their': 'there',
  'theyre': 'there',
  'know': 'no',
  'write': 'right',
  'meat': 'meet',
  'flour': 'flower',
};

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
 * Normalize word for comparison: convert digits (0-100) to word strings,
 * map homophones, lowercase, and remove punctuation.
 */
export function normalizeForCompare(word: string, lang: AppLanguage): string {
  if (!word) return '';
  const cleaned = cleanWord(word, lang);
  if (lang === 'en') {
    if (ENGLISH_DIGITS[cleaned]) {
      return ENGLISH_DIGITS[cleaned];
    }
    if (ENGLISH_HOMOPHONES[cleaned]) {
      return ENGLISH_HOMOPHONES[cleaned];
    }
    return cleaned;
  } else {
    if (HINDI_DIGITS[cleaned]) {
      return HINDI_DIGITS[cleaned];
    }
    return cleaned;
  }
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
 * Sequence Alignment (Needleman-Wunsch Dynamic Programming) of child's spoken
 * utterance against expected words.
 * Handles dropped words (gaps) without shifting subsequent words.
 */
export function analyzeSpokenText(
  expectedText: string,
  spokenTranscript: string,
  lang: AppLanguage,
  syllablesMap: Record<string, string> = {},
  isLiveListening: boolean = false
): WordAnalysis[] {
  const rawExpectedWords = expectedText.trim().split(/\s+/).filter(Boolean);
  const rawSpokenWords = spokenTranscript.trim().split(/\s+/).filter(Boolean);

  if (rawExpectedWords.length === 0) return [];

  const expectedNorm = rawExpectedWords.map((w) => normalizeForCompare(w, lang));
  const spokenNorm = rawSpokenWords.map((w) => normalizeForCompare(w, lang));

  const N = rawExpectedWords.length;
  const M = rawSpokenWords.length;

  // If no spoken words yet
  if (M === 0) {
    return rawExpectedWords.map((rawWord) => {
      const cleaned = cleanWord(rawWord, lang);
      return {
        expected: rawWord,
        cleaned,
        status: isLiveListening ? ('pending' as const) : ('not-heard' as const),
        syllables: syllablesMap[cleaned] || getAutoSyllables(cleaned, lang),
        alignmentType: isLiveListening ? ('pending' as const) : ('not-heard' as const),
      };
    });
  }

  // Dynamic Programming Alignment Matrix (Needleman-Wunsch with word similarity)
  const GAP_PENALTY = -0.4;
  const dp: number[][] = Array.from({ length: N + 1 }, () => Array(M + 1).fill(0));

  for (let i = 0; i <= N; i++) dp[i][0] = i * GAP_PENALTY;
  for (let j = 0; j <= M; j++) dp[0][j] = j * GAP_PENALTY;

  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= M; j++) {
      const exp = expectedNorm[i - 1];
      const spk = spokenNorm[j - 1];
      const sim = wordSimilarity(exp, spk);

      let matchScore = 0;
      if (sim >= 0.82) {
        matchScore = 2.0 * sim;
      } else if (sim >= 0.4) {
        matchScore = 0.8 * sim;
      } else {
        matchScore = -1.0;
      }

      const matchChoice = dp[i - 1][j - 1] + matchScore;
      const gapSpokenChoice = dp[i - 1][j] + GAP_PENALTY;
      const gapExpectedChoice = dp[i][j - 1] + GAP_PENALTY;

      dp[i][j] = Math.max(matchChoice, gapSpokenChoice, gapExpectedChoice);
    }
  }

  // Traceback
  let i = N;
  let j = M;
  const alignedSpokenForExpected: number[] = Array(N).fill(-1);

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const exp = expectedNorm[i - 1];
      const spk = spokenNorm[j - 1];
      const sim = wordSimilarity(exp, spk);
      let matchScore = 0;
      if (sim >= 0.82) {
        matchScore = 2.0 * sim;
      } else if (sim >= 0.4) {
        matchScore = 0.8 * sim;
      } else {
        matchScore = -1.0;
      }

      if (Math.abs(dp[i][j] - (dp[i - 1][j - 1] + matchScore)) < 1e-6) {
        alignedSpokenForExpected[i - 1] = j - 1;
        i--;
        j--;
        continue;
      }
    }

    if (i > 0 && Math.abs(dp[i][j] - (dp[i - 1][j] + GAP_PENALTY)) < 1e-6) {
      alignedSpokenForExpected[i - 1] = -1; // Gap in spoken (expected word not heard)
      i--;
    } else {
      // Gap in expected (extra spoken word)
      j--;
    }
  }

  // Determine last aligned spoken index for handling live listening pending state
  let maxAlignedExpectedIdx = -1;
  for (let k = 0; k < N; k++) {
    if (alignedSpokenForExpected[k] !== -1) {
      maxAlignedExpectedIdx = k;
    }
  }

  const results: WordAnalysis[] = [];

  for (let k = 0; k < N; k++) {
    const rawWord = rawExpectedWords[k];
    const cleaned = cleanWord(rawWord, lang);
    const customSyllables = syllablesMap[cleaned] || getAutoSyllables(cleaned, lang);
    const spkIdx = alignedSpokenForExpected[k];

    if (spkIdx !== -1) {
      const rawSpoken = rawSpokenWords[spkIdx];
      const expNorm = expectedNorm[k];
      const spkNorm = spokenNorm[spkIdx];
      const sim = wordSimilarity(expNorm, spkNorm);

      if (sim >= 0.82) {
        results.push({
          expected: rawWord,
          cleaned,
          status: 'correct',
          spoken: rawSpoken,
          syllables: customSyllables,
          alignmentType: 'matched',
          similarity: Math.round(sim * 100) / 100,
        });
      } else {
        const sub = detectSubstitution(cleanWord(rawWord, lang), cleanWord(rawSpoken, lang), lang);
        results.push({
          expected: rawWord,
          cleaned,
          status: 'needs-practice',
          spoken: rawSpoken,
          syllables: customSyllables,
          detectedSubstitution: sub || undefined,
          alignmentType: 'mismatch',
          similarity: Math.round(sim * 100) / 100,
        });
      }
    } else {
      // No aligned spoken word (gap / skipped by speech engine)
      if (isLiveListening && k > maxAlignedExpectedIdx) {
        results.push({
          expected: rawWord,
          cleaned,
          status: 'pending',
          syllables: customSyllables,
          alignmentType: 'pending',
        });
      } else {
        results.push({
          expected: rawWord,
          cleaned,
          status: 'not-heard',
          syllables: customSyllables,
          alignmentType: 'not-heard',
        });
      }
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
    const syllables: string[] = [];
    let current = '';
    const matras = /[\u093E-\u094C\u0901-\u0903\u094D]/;

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
