import { LessonMode, ReadingItem, AppLanguage } from '../types';
import { PARAGRAPHS } from './paragraphs';

// ============================================================================
// 1. SINGLE WORD LESSONS (Sorted Easy to Hard, target sounds: r, l, s, sh, th, ch, v, etc.)
// ============================================================================

export const SINGLE_WORD_LESSONS: ReadingItem[] = [
  // --- ENGLISH SINGLE WORDS (22 items >= 20) ---
  {
    id: 'w-en-1',
    title: 'Red',
    language: 'en',
    category: 'Single Word',
    grade: 'Class 6 Starter',
    difficulty: 'easy',
    mode: 'word',
    text: 'red',
    targetSounds: ['r'],
    syllablesMap: { red: 'red' }
  },
  {
    id: 'w-en-2',
    title: 'Sun',
    language: 'en',
    category: 'Single Word',
    grade: 'Class 6 Starter',
    difficulty: 'easy',
    mode: 'word',
    text: 'sun',
    targetSounds: ['s'],
    syllablesMap: { sun: 'sun' }
  },
  {
    id: 'w-en-3',
    title: 'Lip',
    language: 'en',
    category: 'Single Word',
    grade: 'Class 6 Starter',
    difficulty: 'easy',
    mode: 'word',
    text: 'lip',
    targetSounds: ['l', 'p'],
    syllablesMap: { lip: 'lip' }
  },
  {
    id: 'w-en-4',
    title: 'Bell',
    language: 'en',
    category: 'Single Word',
    grade: 'Class 6 Starter',
    difficulty: 'easy',
    mode: 'word',
    text: 'bell',
    targetSounds: ['l', 'b'],
    syllablesMap: { bell: 'bell' }
  },
  {
    id: 'w-en-5',
    title: 'Ship',
    language: 'en',
    category: 'Single Word',
    grade: 'Class 6 Starter',
    difficulty: 'easy',
    mode: 'word',
    text: 'ship',
    targetSounds: ['sh', 'p'],
    syllablesMap: { ship: 'ship' }
  },
  {
    id: 'w-en-6',
    title: 'Thin',
    language: 'en',
    category: 'Single Word',
    grade: 'Class 6 Starter',
    difficulty: 'easy',
    mode: 'word',
    text: 'thin',
    targetSounds: ['th'],
    syllablesMap: { thin: 'thin' }
  },
  {
    id: 'w-en-7',
    title: 'Ring',
    language: 'en',
    category: 'Single Word',
    grade: 'Class 6 Starter',
    difficulty: 'easy',
    mode: 'word',
    text: 'ring',
    targetSounds: ['r'],
    syllablesMap: { ring: 'ring' }
  },
  {
    id: 'w-en-8',
    title: 'Fish',
    language: 'en',
    category: 'Single Word',
    grade: 'Class 6 Starter',
    difficulty: 'easy',
    mode: 'word',
    text: 'fish',
    targetSounds: ['sh', 'f'],
    syllablesMap: { fish: 'fish' }
  },
  {
    id: 'w-en-9',
    title: 'River',
    language: 'en',
    category: 'Single Word',
    grade: 'Class 6 Intermediate',
    difficulty: 'medium',
    mode: 'word',
    text: 'river',
    targetSounds: ['r', 'v'],
    syllablesMap: { river: 'riv-er' }
  },
  {
    id: 'w-en-10',
    title: 'Little',
    language: 'en',
    category: 'Single Word',
    grade: 'Class 6 Intermediate',
    difficulty: 'medium',
    mode: 'word',
    text: 'little',
    targetSounds: ['l', 't'],
    syllablesMap: { little: 'lit-tle' }
  },
  {
    id: 'w-en-11',
    title: 'Rabbit',
    language: 'en',
    category: 'Single Word',
    grade: 'Class 6 Intermediate',
    difficulty: 'medium',
    mode: 'word',
    text: 'rabbit',
    targetSounds: ['r', 'b'],
    syllablesMap: { rabbit: 'rab-bit' }
  },
  {
    id: 'w-en-12',
    title: 'Shadow',
    language: 'en',
    category: 'Single Word',
    grade: 'Class 6 Intermediate',
    difficulty: 'medium',
    mode: 'word',
    text: 'shadow',
    targetSounds: ['sh', 'd'],
    syllablesMap: { shadow: 'shad-ow' }
  },
  {
    id: 'w-en-13',
    title: 'Silver',
    language: 'en',
    category: 'Single Word',
    grade: 'Class 6 Intermediate',
    difficulty: 'medium',
    mode: 'word',
    text: 'silver',
    targetSounds: ['s', 'l', 'v'],
    syllablesMap: { silver: 'sil-ver' }
  },
  {
    id: 'w-en-14',
    title: 'Yellow',
    language: 'en',
    category: 'Single Word',
    grade: 'Class 6 Intermediate',
    difficulty: 'medium',
    mode: 'word',
    text: 'yellow',
    targetSounds: ['l', 'y'],
    syllablesMap: { yellow: 'yel-low' }
  },
  {
    id: 'w-en-15',
    title: 'Thunder',
    language: 'en',
    category: 'Single Word',
    grade: 'Class 6 Intermediate',
    difficulty: 'medium',
    mode: 'word',
    text: 'thunder',
    targetSounds: ['th', 'r'],
    syllablesMap: { thunder: 'thun-der' }
  },
  {
    id: 'w-en-16',
    title: 'Children',
    language: 'en',
    category: 'Single Word',
    grade: 'Class 6 Advanced',
    difficulty: 'challenging',
    mode: 'word',
    text: 'children',
    targetSounds: ['ch', 'l', 'r'],
    syllablesMap: { children: 'chil-dren' }
  },
  {
    id: 'w-en-17',
    title: 'Shoulder',
    language: 'en',
    category: 'Single Word',
    grade: 'Class 6 Advanced',
    difficulty: 'challenging',
    mode: 'word',
    text: 'shoulder',
    targetSounds: ['sh', 'l', 'd', 'r'],
    syllablesMap: { shoulder: 'shoul-der' }
  },
  {
    id: 'w-en-18',
    title: 'Flutter',
    language: 'en',
    category: 'Single Word',
    grade: 'Class 6 Advanced',
    difficulty: 'challenging',
    mode: 'word',
    text: 'flutter',
    targetSounds: ['f', 'l', 'r'],
    syllablesMap: { flutter: 'flut-ter' }
  },
  {
    id: 'w-en-19',
    title: 'Brother',
    language: 'en',
    category: 'Single Word',
    grade: 'Class 6 Advanced',
    difficulty: 'challenging',
    mode: 'word',
    text: 'brother',
    targetSounds: ['b', 'r', 'th'],
    syllablesMap: { brother: 'broth-er' }
  },
  {
    id: 'w-en-20',
    title: 'Sparkle',
    language: 'en',
    category: 'Single Word',
    grade: 'Class 6 Advanced',
    difficulty: 'challenging',
    mode: 'word',
    text: 'sparkle',
    targetSounds: ['s', 'p', 'r', 'l'],
    syllablesMap: { sparkle: 'spar-kle' }
  },
  {
    id: 'w-en-21',
    title: 'Treasure',
    language: 'en',
    category: 'Single Word',
    grade: 'Class 6 Advanced',
    difficulty: 'challenging',
    mode: 'word',
    text: 'treasure',
    targetSounds: ['tr', 'sh', 'r'],
    syllablesMap: { treasure: 'treas-ure' }
  },
  {
    id: 'w-en-22',
    title: 'Umbrella',
    language: 'en',
    category: 'Single Word',
    grade: 'Class 6 Advanced',
    difficulty: 'challenging',
    mode: 'word',
    text: 'umbrella',
    targetSounds: ['r', 'l'],
    syllablesMap: { umbrella: 'um-brel-la' }
  },

  // --- HINDI SINGLE WORDS (22 items >= 20) ---
  {
    id: 'w-hi-1',
    title: 'रस',
    language: 'hi',
    category: 'एक शब्द',
    grade: 'कक्षा ६ बुनियादी',
    difficulty: 'easy',
    mode: 'word',
    text: 'रस',
    targetSounds: ['र', 'स'],
    syllablesMap: { 'रस': 'र-स' }
  },
  {
    id: 'w-hi-2',
    title: 'लाल',
    language: 'hi',
    category: 'एक शब्द',
    grade: 'कक्षा ६ बुनियादी',
    difficulty: 'easy',
    mode: 'word',
    text: 'लाल',
    targetSounds: ['ल'],
    syllablesMap: { 'लाल': 'ला-ल' }
  },
  {
    id: 'w-hi-3',
    title: 'शेर',
    language: 'hi',
    category: 'एक शब्द',
    grade: 'कक्षा ६ बुनियादी',
    difficulty: 'easy',
    mode: 'word',
    text: 'शेर',
    targetSounds: ['श', 'र'],
    syllablesMap: { 'शेर': 'शे-र' }
  },
  {
    id: 'w-hi-4',
    title: 'सच',
    language: 'hi',
    category: 'एक शब्द',
    grade: 'कक्षा ६ बुनियादी',
    difficulty: 'easy',
    mode: 'word',
    text: 'सच',
    targetSounds: ['स', 'च'],
    syllablesMap: { 'सच': 'स-च' }
  },
  {
    id: 'w-hi-5',
    title: 'वन',
    language: 'hi',
    category: 'एक शब्द',
    grade: 'कक्षा ६ बुनियादी',
    difficulty: 'easy',
    mode: 'word',
    text: 'वन',
    targetSounds: ['व', 'न'],
    syllablesMap: { 'वन': 'व-न' }
  },
  {
    id: 'w-hi-6',
    title: 'रात',
    language: 'hi',
    category: 'एक शब्द',
    grade: 'कक्षा ६ बुनियादी',
    difficulty: 'easy',
    mode: 'word',
    text: 'रात',
    targetSounds: ['र', 'त'],
    syllablesMap: { 'रात': 'रा-त' }
  },
  {
    id: 'w-hi-7',
    title: 'फल',
    language: 'hi',
    category: 'एक शब्द',
    grade: 'कक्षा ६ बुनियादी',
    difficulty: 'easy',
    mode: 'word',
    text: 'फल',
    targetSounds: ['फ', 'ल'],
    syllablesMap: { 'फल': 'फ-ल' }
  },
  {
    id: 'w-hi-8',
    title: 'शीश',
    language: 'hi',
    category: 'एक शब्द',
    grade: 'कक्षा ६ बुनियादी',
    difficulty: 'easy',
    mode: 'word',
    text: 'शीश',
    targetSounds: ['श'],
    syllablesMap: { 'शीश': 'शी-श' }
  },
  {
    id: 'w-hi-9',
    title: 'सूरज',
    language: 'hi',
    category: 'एक शब्द',
    grade: 'कक्षा ६ मध्यवर्ती',
    difficulty: 'medium',
    mode: 'word',
    text: 'सूरज',
    targetSounds: ['स', 'र', 'ज'],
    syllablesMap: { 'सूरज': 'सू-र-ज' }
  },
  {
    id: 'w-hi-10',
    title: 'चिड़िया',
    language: 'hi',
    category: 'एक शब्द',
    grade: 'कक्षा ६ मध्यवर्ती',
    difficulty: 'medium',
    mode: 'word',
    text: 'चिड़िया',
    targetSounds: ['च', 'ड़', 'य'],
    syllablesMap: { 'चिड़िया': 'चि-डि़-या' }
  },
  {
    id: 'w-hi-11',
    title: 'बादल',
    language: 'hi',
    category: 'एक शब्द',
    grade: 'कक्षा ६ मध्यवर्ती',
    difficulty: 'medium',
    mode: 'word',
    text: 'बादल',
    targetSounds: ['ब', 'द', 'ल'],
    syllablesMap: { 'बादल': 'बा-द-ल' }
  },
  {
    id: 'w-hi-12',
    title: 'शहर',
    language: 'hi',
    category: 'एक शब्द',
    grade: 'कक्षा ६ मध्यवर्ती',
    difficulty: 'medium',
    mode: 'word',
    text: 'शहर',
    targetSounds: ['श', 'ह', 'र'],
    syllablesMap: { 'शहर': 'श-ह-र' }
  },
  {
    id: 'w-hi-13',
    title: 'कोमल',
    language: 'hi',
    category: 'एक शब्द',
    grade: 'कक्षा ६ मध्यवर्ती',
    difficulty: 'medium',
    mode: 'word',
    text: 'कोमल',
    targetSounds: ['क', 'म', 'ल'],
    syllablesMap: { 'कोमल': 'को-म-ल' }
  },
  {
    id: 'w-hi-14',
    title: 'वीणा',
    language: 'hi',
    category: 'एक शब्द',
    grade: 'कक्षा ६ मध्यवर्ती',
    difficulty: 'medium',
    mode: 'word',
    text: 'वीणा',
    targetSounds: ['व', 'ण'],
    syllablesMap: { 'वीणा': 'वी-णा' }
  },
  {
    id: 'w-hi-15',
    title: 'सड़क',
    language: 'hi',
    category: 'एक शब्द',
    grade: 'कक्षा ६ मध्यवर्ती',
    difficulty: 'medium',
    mode: 'word',
    text: 'सड़क',
    targetSounds: ['स', 'ड़', 'क'],
    syllablesMap: { 'सड़क': 'स-ड़-क' }
  },
  {
    id: 'w-hi-16',
    title: 'तितली',
    language: 'hi',
    category: 'एक शब्द',
    grade: 'कक्षा ६ मध्यवर्ती',
    difficulty: 'medium',
    mode: 'word',
    text: 'तितली',
    targetSounds: ['त', 'त', 'ल'],
    syllablesMap: { 'तितली': 'तित-ली' }
  },
  {
    id: 'w-hi-17',
    title: 'वृक्ष',
    language: 'hi',
    category: 'एक शब्द',
    grade: 'कक्षा ६ प्रवीण',
    difficulty: 'challenging',
    mode: 'word',
    text: 'वृक्ष',
    targetSounds: ['व', 'ऋ', 'क्ष'],
    syllablesMap: { 'वृक्ष': 'वृ-क्ष' }
  },
  {
    id: 'w-hi-18',
    title: 'किरण',
    language: 'hi',
    category: 'एक शब्द',
    grade: 'कक्षा ६ प्रवीण',
    difficulty: 'challenging',
    mode: 'word',
    text: 'किरण',
    targetSounds: ['क', 'र', 'ण'],
    syllablesMap: { 'किरण': 'कि-र-ण' }
  },
  {
    id: 'w-hi-19',
    title: 'बारिश',
    language: 'hi',
    category: 'एक शब्द',
    grade: 'कक्षा ६ प्रवीण',
    difficulty: 'challenging',
    mode: 'word',
    text: 'बारिश',
    targetSounds: ['ब', 'र', 'श'],
    syllablesMap: { 'बारिश': 'बा-रि-श' }
  },
  {
    id: 'w-hi-20',
    title: 'प्रकाश',
    language: 'hi',
    category: 'एक शब्द',
    grade: 'कक्षा ६ प्रवीण',
    difficulty: 'challenging',
    mode: 'word',
    text: 'प्रकाश',
    targetSounds: ['प', 'र', 'क', 'श'],
    syllablesMap: { 'प्रकाश': 'प्र-का-श' }
  },
  {
    id: 'w-hi-21',
    title: 'ज्ञानी',
    language: 'hi',
    category: 'एक शब्द',
    grade: 'कक्षा ६ प्रवीण',
    difficulty: 'challenging',
    mode: 'word',
    text: 'ज्ञानी',
    targetSounds: ['ज्ञ', 'न'],
    syllablesMap: { 'ज्ञानी': 'ज्ञा-नी' }
  },
  {
    id: 'w-hi-22',
    title: 'श्रवण',
    language: 'hi',
    category: 'एक शब्द',
    grade: 'कक्षा ६ प्रवीण',
    difficulty: 'challenging',
    mode: 'word',
    text: 'श्रवण',
    targetSounds: ['श', 'र', 'व', 'ण'],
    syllablesMap: { 'श्रवण': 'श्र-व-ण' }
  },
];

// ============================================================================
// 2. TWO WORDS LESSONS (Sorted Easy to Hard, target sounds pairs)
// ============================================================================

export const TWO_WORDS_LESSONS: ReadingItem[] = [
  // --- ENGLISH TWO WORDS (16 items >= 15) ---
  {
    id: 'tw-en-1',
    title: 'Red Rose',
    language: 'en',
    category: 'Two Words',
    grade: 'Class 6 Starter',
    difficulty: 'easy',
    mode: 'two-words',
    text: 'red rose',
    targetSounds: ['r', 's'],
    syllablesMap: { red: 'red', rose: 'rose' }
  },
  {
    id: 'tw-en-2',
    title: 'Blue Lake',
    language: 'en',
    category: 'Two Words',
    grade: 'Class 6 Starter',
    difficulty: 'easy',
    mode: 'two-words',
    text: 'blue lake',
    targetSounds: ['l', 'b', 'k'],
    syllablesMap: { blue: 'blue', lake: 'lake' }
  },
  {
    id: 'tw-en-3',
    title: 'Shiny Sun',
    language: 'en',
    category: 'Two Words',
    grade: 'Class 6 Starter',
    difficulty: 'easy',
    mode: 'two-words',
    text: 'shiny sun',
    targetSounds: ['sh', 's'],
    syllablesMap: { shiny: 'shi-ny', sun: 'sun' }
  },
  {
    id: 'tw-en-4',
    title: 'Soft Grass',
    language: 'en',
    category: 'Two Words',
    grade: 'Class 6 Starter',
    difficulty: 'easy',
    mode: 'two-words',
    text: 'soft grass',
    targetSounds: ['s', 'r', 'f'],
    syllablesMap: { soft: 'soft', grass: 'grass' }
  },
  {
    id: 'tw-en-5',
    title: 'Three Birds',
    language: 'en',
    category: 'Two Words',
    grade: 'Class 6 Starter',
    difficulty: 'easy',
    mode: 'two-words',
    text: 'three birds',
    targetSounds: ['th', 'r', 'b'],
    syllablesMap: { three: 'three', birds: 'birds' }
  },
  {
    id: 'tw-en-6',
    title: 'Little Rabbit',
    language: 'en',
    category: 'Two Words',
    grade: 'Class 6 Intermediate',
    difficulty: 'medium',
    mode: 'two-words',
    text: 'little rabbit',
    targetSounds: ['l', 'r', 'b'],
    syllablesMap: { little: 'lit-tle', rabbit: 'rab-bit' }
  },
  {
    id: 'tw-en-7',
    title: 'Green Leaves',
    language: 'en',
    category: 'Two Words',
    grade: 'Class 6 Intermediate',
    difficulty: 'medium',
    mode: 'two-words',
    text: 'green leaves',
    targetSounds: ['r', 'l', 'v'],
    syllablesMap: { green: 'green', leaves: 'leaves' }
  },
  {
    id: 'tw-en-8',
    title: 'Silver Spoon',
    language: 'en',
    category: 'Two Words',
    grade: 'Class 6 Intermediate',
    difficulty: 'medium',
    mode: 'two-words',
    text: 'silver spoon',
    targetSounds: ['s', 'l', 'v', 'p'],
    syllablesMap: { silver: 'sil-ver', spoon: 'spoon' }
  },
  {
    id: 'tw-en-9',
    title: 'Running River',
    language: 'en',
    category: 'Two Words',
    grade: 'Class 6 Intermediate',
    difficulty: 'medium',
    mode: 'two-words',
    text: 'running river',
    targetSounds: ['r', 'n', 'v'],
    syllablesMap: { running: 'run-ning', river: 'riv-er' }
  },
  {
    id: 'tw-en-10',
    title: 'Fresh Breeze',
    language: 'en',
    category: 'Two Words',
    grade: 'Class 6 Intermediate',
    difficulty: 'medium',
    mode: 'two-words',
    text: 'fresh breeze',
    targetSounds: ['f', 'r', 'sh', 'b'],
    syllablesMap: { fresh: 'fresh', breeze: 'breeze' }
  },
  {
    id: 'tw-en-11',
    title: 'Bright Star',
    language: 'en',
    category: 'Two Words',
    grade: 'Class 6 Intermediate',
    difficulty: 'medium',
    mode: 'two-words',
    text: 'bright star',
    targetSounds: ['b', 'r', 's', 't'],
    syllablesMap: { bright: 'bright', star: 'star' }
  },
  {
    id: 'tw-en-12',
    title: 'Golden Sunshine',
    language: 'en',
    category: 'Two Words',
    grade: 'Class 6 Advanced',
    difficulty: 'challenging',
    mode: 'two-words',
    text: 'golden sunshine',
    targetSounds: ['g', 'l', 's', 'sh'],
    syllablesMap: { golden: 'gold-en', sunshine: 'sun-shine' }
  },
  {
    id: 'tw-en-13',
    title: 'Cheerful Children',
    language: 'en',
    category: 'Two Words',
    grade: 'Class 6 Advanced',
    difficulty: 'challenging',
    mode: 'two-words',
    text: 'cheerful children',
    targetSounds: ['ch', 'r', 'f', 'l'],
    syllablesMap: { cheerful: 'cheer-ful', children: 'chil-dren' }
  },
  {
    id: 'tw-en-14',
    title: 'Thrilling Story',
    language: 'en',
    category: 'Two Words',
    grade: 'Class 6 Advanced',
    difficulty: 'challenging',
    mode: 'two-words',
    text: 'thrilling story',
    targetSounds: ['th', 'r', 'l', 's', 't'],
    syllablesMap: { thrilling: 'thril-ling', story: 'sto-ry' }
  },
  {
    id: 'tw-en-15',
    title: 'Whisper Softly',
    language: 'en',
    category: 'Two Words',
    grade: 'Class 6 Advanced',
    difficulty: 'challenging',
    mode: 'two-words',
    text: 'whisper softly',
    targetSounds: ['w', 'sh', 'p', 's', 'f', 'l'],
    syllablesMap: { whisper: 'whis-per', softly: 'soft-ly' }
  },
  {
    id: 'tw-en-16',
    title: 'Courageous Traveler',
    language: 'en',
    category: 'Two Words',
    grade: 'Class 6 Advanced',
    difficulty: 'challenging',
    mode: 'two-words',
    text: 'courageous traveler',
    targetSounds: ['r', 'g', 'sh', 't', 'v', 'l'],
    syllablesMap: { courageous: 'cou-ra-geous', traveler: 'trav-el-er' }
  },

  // --- HINDI TWO WORDS (16 items >= 15) ---
  {
    id: 'tw-hi-1',
    title: 'लाल गुलाब',
    language: 'hi',
    category: 'दो शब्द',
    grade: 'कक्षा ६ बुनियादी',
    difficulty: 'easy',
    mode: 'two-words',
    text: 'लाल गुलाब',
    targetSounds: ['ल', 'ग', 'र'],
    syllablesMap: { 'लाल': 'ला-ल', 'गुलाब': 'गु-ला-ब' }
  },
  {
    id: 'tw-hi-2',
    title: 'नीला गगन',
    language: 'hi',
    category: 'दो शब्द',
    grade: 'कक्षा ६ बुनियादी',
    difficulty: 'easy',
    mode: 'two-words',
    text: 'नीला गगन',
    targetSounds: ['न', 'ल', 'ग'],
    syllablesMap: { 'नीला': 'नी-ला', 'गगन': 'ग-ग-न' }
  },
  {
    id: 'tw-hi-3',
    title: 'मीठा रस',
    language: 'hi',
    category: 'दो शब्द',
    grade: 'कक्षा ६ बुनियादी',
    difficulty: 'easy',
    mode: 'two-words',
    text: 'मीठा रस',
    targetSounds: ['म', 'ठ', 'र', 'स'],
    syllablesMap: { 'मीठा': 'मी-ठा', 'रस': 'र-स' }
  },
  {
    id: 'tw-hi-4',
    title: 'शीतल पवन',
    language: 'hi',
    category: 'दो शब्द',
    grade: 'कक्षा ६ बुनियादी',
    difficulty: 'easy',
    mode: 'two-words',
    text: 'शीतल पवन',
    targetSounds: ['श', 'त', 'ल', 'व', 'न'],
    syllablesMap: { 'शीतल': 'शी-त-ल', 'पवन': 'प-व-न' }
  },
  {
    id: 'tw-hi-5',
    title: 'हरा पेड़',
    language: 'hi',
    category: 'दो शब्द',
    grade: 'कक्षा ६ बुनियादी',
    difficulty: 'easy',
    mode: 'two-words',
    text: 'हरा पेड़',
    targetSounds: ['ह', 'र', 'प', 'ड़'],
    syllablesMap: { 'हरा': 'ह-रा', 'पेड़': 'पे-ड़' }
  },
  {
    id: 'tw-hi-6',
    title: 'सुंदर चिड़िया',
    language: 'hi',
    category: 'दो शब्द',
    grade: 'कक्षा ६ मध्यवर्ती',
    difficulty: 'medium',
    mode: 'two-words',
    text: 'सुंदर चिड़िया',
    targetSounds: ['स', 'न', 'द', 'र', 'ड़'],
    syllablesMap: { 'सुंदर': 'सुन्-दर', 'चिड़िया': 'चि-डि़-या' }
  },
  {
    id: 'tw-hi-7',
    title: 'कोमल पत्ती',
    language: 'hi',
    category: 'दो शब्द',
    grade: 'कक्षा ६ मध्यवर्ती',
    difficulty: 'medium',
    mode: 'two-words',
    text: 'कोमल पत्ती',
    targetSounds: ['क', 'म', 'ल', 'प', 'त'],
    syllablesMap: { 'कोमल': 'को-म-ल', 'पत्ती': 'पत-ती' }
  },
  {
    id: 'tw-hi-8',
    title: 'चंचल नदी',
    language: 'hi',
    category: 'दो शब्द',
    grade: 'कक्षा ६ मध्यवर्ती',
    difficulty: 'medium',
    mode: 'two-words',
    text: 'चंचल नदी',
    targetSounds: ['च', 'ल', 'न', 'द'],
    syllablesMap: { 'चंचल': 'चन्-चल', 'नदी': 'न-दी' }
  },
  {
    id: 'tw-hi-9',
    title: 'बहती धारा',
    language: 'hi',
    category: 'दो शब्द',
    grade: 'कक्षा ६ मध्यवर्ती',
    difficulty: 'medium',
    mode: 'two-words',
    text: 'बहती धारा',
    targetSounds: ['ब', 'ह', 'त', 'ध', 'र'],
    syllablesMap: { 'बहती': 'बह-ती', 'धारा': 'धा-रा' }
  },
  {
    id: 'tw-hi-10',
    title: 'चमकता तारा',
    language: 'hi',
    category: 'दो शब्द',
    grade: 'कक्षा ६ मध्यवर्ती',
    difficulty: 'medium',
    mode: 'two-words',
    text: 'चमकता तारा',
    targetSounds: ['च', 'म', 'क', 'त', 'र'],
    syllablesMap: { 'चमकता': 'च-मक-ता', 'तारा': 'ता-रा' }
  },
  {
    id: 'tw-hi-11',
    title: 'विशाल वृक्ष',
    language: 'hi',
    category: 'दो शब्द',
    grade: 'कक्षा ६ मध्यवर्ती',
    difficulty: 'medium',
    mode: 'two-words',
    text: 'विशाल वृक्ष',
    targetSounds: ['व', 'श', 'ल', 'क', 'ष'],
    syllablesMap: { 'विशाल': 'वि-शा-ल', 'वृक्ष': 'वृ-क्ष' }
  },
  {
    id: 'tw-hi-12',
    title: 'मीठी वाणी',
    language: 'hi',
    category: 'दो शब्द',
    grade: 'कक्षा ६ प्रवीण',
    difficulty: 'challenging',
    mode: 'two-words',
    text: 'मीठी वाणी',
    targetSounds: ['म', 'ठ', 'व', 'ण'],
    syllablesMap: { 'मीठी': 'मी-ठी', 'वाणी': 'वा-णी' }
  },
  {
    id: 'tw-hi-13',
    title: 'सच्चा मित्र',
    language: 'hi',
    category: 'दो शब्द',
    grade: 'कक्षा ६ प्रवीण',
    difficulty: 'challenging',
    mode: 'two-words',
    text: 'सच्चा मित्र',
    targetSounds: ['स', 'च', 'म', 'त', 'र'],
    syllablesMap: { 'सच्चा': 'सच-चा', 'मित्र': 'मि-त्र' }
  },
  {
    id: 'tw-hi-14',
    title: 'वर्षा की बूँदें',
    language: 'hi',
    category: 'दो शब्द',
    grade: 'कक्षा ६ प्रवीण',
    difficulty: 'challenging',
    mode: 'two-words',
    text: 'वर्षा बूँदें',
    targetSounds: ['व', 'र', 'ष', 'ब', 'द'],
    syllablesMap: { 'वर्षा': 'वर्-षा', 'बूँदें': 'बूँ-दें' }
  },
  {
    id: 'tw-hi-15',
    title: 'श्रेष्ठ विचार',
    language: 'hi',
    category: 'दो शब्द',
    grade: 'कक्षा ६ प्रवीण',
    difficulty: 'challenging',
    mode: 'two-words',
    text: 'श्रेष्ठ विचार',
    targetSounds: ['श', 'र', 'ष', 'ठ', 'व', 'च', 'र'],
    syllablesMap: { 'श्रेष्ठ': 'श्रेष्ठ', 'विचार': 'वि-चा-र' }
  },
  {
    id: 'tw-hi-16',
    title: 'ज्ञान का प्रकाश',
    language: 'hi',
    category: 'दो शब्द',
    grade: 'कक्षा ६ प्रवीण',
    difficulty: 'challenging',
    mode: 'two-words',
    text: 'ज्ञान प्रकाश',
    targetSounds: ['ज्ञ', 'न', 'प', 'र', 'क', 'श'],
    syllablesMap: { 'ज्ञान': 'ज्ञा-न', 'प्रकाश': 'प्र-का-श' }
  },
];

// ============================================================================
// 3. ONE LINE LESSONS (Sorted Easy to Hard, single sentences with focus sounds)
// ============================================================================

export const ONE_LINE_LESSONS: ReadingItem[] = [
  // --- ENGLISH ONE LINE (16 items >= 15) ---
  {
    id: 'ln-en-1',
    title: 'Morning Sun',
    language: 'en',
    category: 'One Line',
    grade: 'Class 6 Starter',
    difficulty: 'easy',
    mode: 'line',
    text: 'The sun shines bright and warm.',
    targetSounds: ['s', 'sh', 'b', 'r'],
    syllablesMap: {
      shines: 'shines',
      bright: 'bright',
      warm: 'warm'
    }
  },
  {
    id: 'ln-en-2',
    title: 'Birds in the Tree',
    language: 'en',
    category: 'One Line',
    grade: 'Class 6 Starter',
    difficulty: 'easy',
    mode: 'line',
    text: 'Red birds sing in the green tree.',
    targetSounds: ['r', 'b', 's', 'g'],
    syllablesMap: {
      birds: 'birds',
      green: 'green',
      tree: 'tree'
    }
  },
  {
    id: 'ln-en-3',
    title: 'Frogs at the Lake',
    language: 'en',
    category: 'One Line',
    grade: 'Class 6 Starter',
    difficulty: 'easy',
    mode: 'line',
    text: 'Little frogs leap across the lake.',
    targetSounds: ['l', 'f', 'r', 'k'],
    syllablesMap: {
      little: 'lit-tle',
      frogs: 'frogs',
      across: 'a-cross',
      lake: 'lake'
    }
  },
  {
    id: 'ln-en-4',
    title: 'The Flowing River',
    language: 'en',
    category: 'One Line',
    grade: 'Class 6 Starter',
    difficulty: 'easy',
    mode: 'line',
    text: 'The river flows softly past our home.',
    targetSounds: ['r', 'f', 'l', 's', 'p'],
    syllablesMap: {
      river: 'riv-er',
      flows: 'flows',
      softly: 'soft-ly'
    }
  },
  {
    id: 'ln-en-5',
    title: 'Sweet Apples',
    language: 'en',
    category: 'One Line',
    grade: 'Class 6 Starter',
    difficulty: 'easy',
    mode: 'line',
    text: 'Three sweet apples fell on the grass.',
    targetSounds: ['th', 's', 'l', 'r'],
    syllablesMap: {
      three: 'three',
      apples: 'ap-ples',
      grass: 'grass'
    }
  },
  {
    id: 'ln-en-6',
    title: 'Hopping Rabbit',
    language: 'en',
    category: 'One Line',
    grade: 'Class 6 Intermediate',
    difficulty: 'medium',
    mode: 'line',
    text: 'A fluffy white rabbit hopped on the lawn.',
    targetSounds: ['f', 'l', 'r', 'b'],
    syllablesMap: {
      fluffy: 'fluf-fy',
      rabbit: 'rab-bit',
      hopped: 'hopped',
      lawn: 'lawn'
    }
  },
  {
    id: 'ln-en-7',
    title: 'Thrilling Story',
    language: 'en',
    category: 'One Line',
    grade: 'Class 6 Intermediate',
    difficulty: 'medium',
    mode: 'line',
    text: 'Grandmother told us a thrilling story today.',
    targetSounds: ['r', 'th', 'l', 's', 't'],
    syllablesMap: {
      grandmother: 'grand-moth-er',
      thrilling: 'thril-ling',
      story: 'sto-ry',
      today: 'to-day'
    }
  },
  {
    id: 'ln-en-8',
    title: 'Shady Oak Tree',
    language: 'en',
    category: 'One Line',
    grade: 'Class 6 Intermediate',
    difficulty: 'medium',
    mode: 'line',
    text: 'Children were laughing under the shady tree.',
    targetSounds: ['ch', 'l', 'r', 'sh'],
    syllablesMap: {
      children: 'chil-dren',
      laughing: 'laugh-ing',
      under: 'un-der',
      shady: 'shad-y'
    }
  },
  {
    id: 'ln-en-9',
    title: 'Gentle Raindrops',
    language: 'en',
    category: 'One Line',
    grade: 'Class 6 Intermediate',
    difficulty: 'medium',
    mode: 'line',
    text: 'Gentle raindrops tapped softly on the window.',
    targetSounds: ['g', 'l', 'r', 'd', 's', 'w'],
    syllablesMap: {
      gentle: 'gen-tle',
      raindrops: 'rain-drops',
      softly: 'soft-ly',
      window: 'win-dow'
    }
  },
  {
    id: 'ln-en-10',
    title: 'Sparkling Stars',
    language: 'en',
    category: 'One Line',
    grade: 'Class 6 Intermediate',
    difficulty: 'medium',
    mode: 'line',
    text: 'The sparkling stars glow in the dark blue sky.',
    targetSounds: ['s', 'p', 'r', 'k', 'l', 'g'],
    syllablesMap: {
      sparkling: 'spar-kling',
      stars: 'stars',
      dark: 'dark'
    }
  },
  {
    id: 'ln-en-11',
    title: 'Mountain Breeze',
    language: 'en',
    category: 'One Line',
    grade: 'Class 6 Intermediate',
    difficulty: 'medium',
    mode: 'line',
    text: 'Fresh mountain breeze whispered through the tall pines.',
    targetSounds: ['f', 'r', 'sh', 'b', 'w', 's', 'p', 'l'],
    syllablesMap: {
      mountain: 'moun-tain',
      breeze: 'breeze',
      whispered: 'whis-pered',
      through: 'through'
    }
  },
  {
    id: 'ln-en-12',
    title: 'Brave Explorers',
    language: 'en',
    category: 'One Line',
    grade: 'Class 6 Advanced',
    difficulty: 'challenging',
    mode: 'line',
    text: 'Brave explorers walked along the slippery river bank.',
    targetSounds: ['b', 'r', 'v', 'p', 'l', 's'],
    syllablesMap: {
      explorers: 'ex-plor-ers',
      along: 'a-long',
      slippery: 'slip-per-y',
      river: 'riv-er'
    }
  },
  {
    id: 'ln-en-13',
    title: 'Yellow Butterflies',
    language: 'en',
    category: 'One Line',
    grade: 'Class 6 Advanced',
    difficulty: 'challenging',
    mode: 'line',
    text: 'Brilliant yellow butterflies fluttered around the rose bushes.',
    targetSounds: ['b', 'r', 'l', 'y', 'f', 't', 'sh'],
    syllablesMap: {
      brilliant: 'bril-liant',
      yellow: 'yel-low',
      butterflies: 'but-ter-flies',
      fluttered: 'flut-tered',
      around: 'a-round',
      bushes: 'bush-es'
    }
  },
  {
    id: 'ln-en-14',
    title: 'Hardworking Students',
    language: 'en',
    category: 'One Line',
    grade: 'Class 6 Advanced',
    difficulty: 'challenging',
    mode: 'line',
    text: 'The teacher smiled kindly at the hardworking students.',
    targetSounds: ['t', 'ch', 'r', 's', 'm', 'l', 'h', 'd'],
    syllablesMap: {
      teacher: 'teach-er',
      smiled: 'smiled',
      kindly: 'kind-ly',
      hardworking: 'hard-work-ing',
      students: 'stu-dents'
    }
  },
  {
    id: 'ln-en-15',
    title: 'Rhythm and Melody',
    language: 'en',
    category: 'One Line',
    grade: 'Class 6 Advanced',
    difficulty: 'challenging',
    mode: 'line',
    text: 'Rhythm and melody echoed throughout the quiet valley.',
    targetSounds: ['r', 'th', 'm', 'l', 'd', 'q', 'v'],
    syllablesMap: {
      rhythm: 'rhyth-m',
      melody: 'mel-o-dy',
      echoed: 'ech-oed',
      throughout: 'through-out',
      valley: 'val-ley'
    }
  },
  {
    id: 'ln-en-16',
    title: 'Crystal Clear',
    language: 'en',
    category: 'One Line',
    grade: 'Class 6 Advanced',
    difficulty: 'challenging',
    mode: 'line',
    text: 'She thoughtfully practiced every sound until it was crystal clear.',
    targetSounds: ['sh', 'th', 'f', 'l', 'p', 'r', 'c', 'k', 's'],
    syllablesMap: {
      thoughtfully: 'thought-ful-ly',
      practiced: 'prac-ticed',
      every: 'ev-ery',
      crystal: 'crys-tal',
      clear: 'clear'
    }
  },

  // --- HINDI ONE LINE (16 items >= 15) ---
  {
    id: 'ln-hi-1',
    title: 'सुबह का सूरज',
    language: 'hi',
    category: 'एक पंक्ति',
    grade: 'कक्षा ६ बुनियादी',
    difficulty: 'easy',
    mode: 'line',
    text: 'सूरज पूर्व दिशा से निकलता है।',
    targetSounds: ['स', 'र', 'ज', 'व', 'श', 'ल'],
    syllablesMap: {
      'सूरज': 'सू-र-ज',
      'पूर्व': 'पूर्-व',
      'दिशा': 'दि-शा',
      'निकलता': 'नि-कल-ता'
    }
  },
  {
    id: 'ln-hi-2',
    title: 'हरी घास',
    language: 'hi',
    category: 'एक पंक्ति',
    grade: 'कक्षा ६ बुनियादी',
    difficulty: 'easy',
    mode: 'line',
    text: 'हरी घास पर सुंदर फूल खिले हैं।',
    targetSounds: ['ह', 'र', 'घ', 'स', 'द', 'फ', 'ल'],
    syllablesMap: {
      'हरी': 'ह-री',
      'घास': 'घा-स',
      'सुंदर': 'सुन्-दर',
      'खिले': 'खि-ले'
    }
  },
  {
    id: 'ln-hi-3',
    title: 'चिड़िया का गान',
    language: 'hi',
    category: 'एक पंक्ति',
    grade: 'कक्षा ६ बुनियादी',
    difficulty: 'easy',
    mode: 'line',
    text: 'चिड़िया डाल पर बैठकर मीठा गाती है।',
    targetSounds: ['च', 'ड़', 'ब', 'ठ', 'र', 'म', 'ठ'],
    syllablesMap: {
      'चिड़िया': 'चि-डि़-या',
      'बैठकर': 'बैठ-कर',
      'मीठा': 'मी-ठा',
      'गाती': 'गा-ती'
    }
  },
  {
    id: 'ln-hi-4',
    title: 'शीतल जल',
    language: 'hi',
    category: 'एक पंक्ति',
    grade: 'कक्षा ६ बुनियादी',
    difficulty: 'easy',
    mode: 'line',
    text: 'नदी का जल बहुत शीतल और साफ है।',
    targetSounds: ['न', 'द', 'ज', 'ल', 'श', 'त', 'स'],
    syllablesMap: {
      'नदी': 'न-दी',
      'शीतल': 'शी-त-ल',
      'बहुत': 'ब-हुत',
      'साफ': 'सा-फ'
    }
  },
  {
    id: 'ln-hi-5',
    title: 'पेड़ की छाया',
    language: 'hi',
    category: 'एक पंक्ति',
    grade: 'कक्षा ६ बुनियादी',
    difficulty: 'easy',
    mode: 'line',
    text: 'पेड़ की छाया में सब आराम करते हैं।',
    targetSounds: ['प', 'ड़', 'छ', 'य', 'र', 'म', 'क'],
    syllablesMap: {
      'छाया': 'छा-या',
      'आराम': 'आ-रा-म',
      'करते': 'कर-ते'
    }
  },
  {
    id: 'ln-hi-6',
    title: 'नन्हा खरगोश',
    language: 'hi',
    category: 'एक पंक्ति',
    grade: 'कक्षा ६ मध्यवर्ती',
    difficulty: 'medium',
    mode: 'line',
    text: 'नन्हे खरगोश ने गाजर खुशी से खाई।',
    targetSounds: ['ख', 'र', 'ग', 'श', 'ज', 'ख', 'श'],
    syllablesMap: {
      'खरगोश': 'खर-गो-श',
      'गाजर': 'गा-ज-र',
      'खुशी': 'खु-शी'
    }
  },
  {
    id: 'ln-hi-7',
    title: 'सुंदर बादल',
    language: 'hi',
    category: 'एक पंक्ति',
    grade: 'कक्षा ६ मध्यवर्ती',
    difficulty: 'medium',
    mode: 'line',
    text: 'आसमान में रंग-बिरंगे सुंदर बादल छाए।',
    targetSounds: ['स', 'म', 'न', 'र', 'ग', 'ब', 'द', 'ल'],
    syllablesMap: {
      'आसमान': 'आस-मा-न',
      'रंग-बिरंगे': 'रंग-बि-रं-गे',
      'सुंदर': 'सुन्-दर',
      'बादल': 'बा-द-ल'
    }
  },
  {
    id: 'ln-hi-8',
    title: 'रोचक कहानी',
    language: 'hi',
    category: 'एक पंक्ति',
    grade: 'कक्षा ६ मध्यवर्ती',
    difficulty: 'medium',
    mode: 'line',
    text: 'बच्चों ने मिलकर एक नई रोचक कहानी सुनी।',
    targetSounds: ['ब', 'च', 'म', 'ल', 'र', 'क', 'न', 'ह'],
    syllablesMap: {
      'बच्चों': 'बच्-चों',
      'मिलकर': 'मिल-कर',
      'रोचक': 'रो-च-क',
      'कहानी': 'क-हा-नी'
    }
  },
  {
    id: 'ln-hi-9',
    title: 'वर्षा की बूँदें',
    language: 'hi',
    category: 'एक पंक्ति',
    grade: 'कक्षा ६ मध्यवर्ती',
    difficulty: 'medium',
    mode: 'line',
    text: 'वर्षा की नन्हीं बूँदें पत्तों पर गिरीं।',
    targetSounds: ['व', 'र', 'ष', 'ब', 'द', 'प', 'त', 'ग'],
    syllablesMap: {
      'वर्षा': 'वर्-षा',
      'नन्हीं': 'नन्-हीं',
      'पत्तों': 'पत्-तों',
      'गिरीं': 'गि-रीं'
    }
  },
  {
    id: 'ln-hi-10',
    title: 'बगीचे के फूल',
    language: 'hi',
    category: 'एक पंक्ति',
    grade: 'कक्षा ६ मध्यवर्ती',
    difficulty: 'medium',
    mode: 'line',
    text: 'बगीचे में लाल और पीले गुलाब महक रहे हैं।',
    targetSounds: ['ब', 'ग', 'च', 'ल', 'प', 'र', 'म', 'ह'],
    syllablesMap: {
      'बगीचे': 'ब-गी-चे',
      'पीले': 'पी-ले',
      'गुलाब': 'गु-ला-ब',
      'महक': 'म-ह-क'
    }
  },
  {
    id: 'ln-hi-11',
    title: 'सच्चा मित्र',
    language: 'hi',
    category: 'एक पंक्ति',
    grade: 'कक्षा ६ मध्यवर्ती',
    difficulty: 'medium',
    mode: 'line',
    text: 'सच्चा मित्र सदा संकट में साथ निभाता है।',
    targetSounds: ['स', 'च', 'म', 'त', 'र', 'द', 'क'],
    syllablesMap: {
      'सच्चा': 'सच-चा',
      'मित्र': 'मि-त्र',
      'संकट': 'सं-कट',
      'निभाता': 'नि-भा-ता'
    }
  },
  {
    id: 'ln-hi-12',
    title: 'वीर सैनिक',
    language: 'hi',
    category: 'एक पंक्ति',
    grade: 'कक्षा ६ प्रवीण',
    difficulty: 'challenging',
    mode: 'line',
    text: 'वीर सैनिक देश की रक्षा तत्परता से करते हैं।',
    targetSounds: ['व', 'र', 'स', 'न', 'क', 'द', 'श', 'ष', 'त', 'प'],
    syllablesMap: {
      'सैनिक': 'सै-नि-क',
      'रक्षा': 'र-क्षा',
      'तत्परता': 'तत्-पर-ता'
    }
  },
  {
    id: 'ln-hi-13',
    title: 'मीठी वाणी',
    language: 'hi',
    category: 'एक पंक्ति',
    grade: 'कक्षा ६ प्रवीण',
    difficulty: 'challenging',
    mode: 'line',
    text: 'वाणी में मिठास और हृदय में सरलता होनी चाहिए।',
    targetSounds: ['व', 'ण', 'म', 'ठ', 'स', 'ह', 'र', 'द', 'य', 'ल'],
    syllablesMap: {
      'वाणी': 'वा-णी',
      'मिठास': 'मि-ठा-स',
      'हृदय': 'हृ-द-य',
      'सरलता': 'स-रल-ता'
    }
  },
  {
    id: 'ln-hi-14',
    title: 'विशाल वृक्ष',
    language: 'hi',
    category: 'एक पंक्ति',
    grade: 'कक्षा ६ प्रवीण',
    difficulty: 'challenging',
    mode: 'line',
    text: 'वृक्ष हमें छाया, फल और शुद्ध वायु प्रदान करते हैं।',
    targetSounds: ['व', 'ऋ', 'क', 'ष', 'छ', 'य', 'फ', 'ल', 'श', 'ध', 'प', 'र'],
    syllablesMap: {
      'वृक्ष': 'वृ-क्ष',
      'छाया': 'छा-या',
      'शुद्ध': 'शुद्-ध',
      'प्रदान': 'प्र-दा-न'
    }
  },
  {
    id: 'ln-hi-15',
    title: 'ज्ञान की ज्योति',
    language: 'hi',
    category: 'एक पंक्ति',
    grade: 'कक्षा ६ प्रवीण',
    difficulty: 'challenging',
    mode: 'line',
    text: 'ज्ञान की ज्योति से अज्ञान का अंधकार मिट जाता है।',
    targetSounds: ['ज्ञ', 'न', 'ज', 'य', 'त', 'अ', 'ध', 'क', 'र', 'म', 'ट'],
    syllablesMap: {
      'ज्ञान': 'ज्ञा-न',
      'ज्योति': 'ज्यो-ति',
      'अज्ञान': 'अ-ज्ञा-न',
      'अंधकार': 'अंध-का-र'
    }
  },
  {
    id: 'ln-hi-16',
    title: 'श्रम और लगन',
    language: 'hi',
    category: 'एक पंक्ति',
    grade: 'कक्षा ६ प्रवीण',
    difficulty: 'challenging',
    mode: 'line',
    text: 'श्रम और लगन से हर मुश्किल कार्य सरल बन जाता है।',
    targetSounds: ['श', 'र', 'म', 'ल', 'ग', 'न', 'ष', 'क', 'य', 'स'],
    syllablesMap: {
      'लगन': 'ल-ग-न',
      'मुश्किल': 'मुश्-किल',
      'कार्य': 'कार-य',
      'सरल': 'स-र-ल'
    }
  },
];

// Helper function to get items by mode and language
export function getLessonItems(mode: LessonMode, language: AppLanguage): ReadingItem[] {
  switch (mode) {
    case 'word':
      return SINGLE_WORD_LESSONS.filter((i) => i.language === language);
    case 'two-words':
      return TWO_WORDS_LESSONS.filter((i) => i.language === language);
    case 'line':
      return ONE_LINE_LESSONS.filter((i) => i.language === language);
    case 'paragraph':
    default:
      return PARAGRAPHS.filter((i) => i.language === language).map((p) => ({
        ...p,
        mode: 'paragraph' as LessonMode
      }));
  }
}
