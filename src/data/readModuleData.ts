/**
 * ReadBuddy - Professional Structured READ Module Content Database
 * 4 Progressive Levels:
 * Level 1: Single Words Only (Stage 1 to Stage 4)
 * Level 2: Word Combinations (2-3 Words)
 * Level 3: Short Sentences
 * Level 4: Paragraphs & Mini Stories
 */

import { AppLanguage } from '../types';

export interface ReadWordItem {
  id: string;
  word: string;
  stage: 1 | 2 | 3 | 4; // 1: Very Easy, 2: CVC, 3: Complex/Blends, 4: Longer Familiar
  stageName: string;
  stageNameHi: string;
  category: string;
  targetPhoneme?: string;
  phonicsPattern?: string; // e.g. 'SH', 'CH', 'TH', 'BL', 'TR', 'CVC', 'SILENT_E'
  vowelPattern?: string; // e.g. 'SHORT_A', 'SHORT_E', 'SHORT_I', 'SHORT_O', 'SHORT_U'
  syllableCount?: number;
  meaningEn: string;
  meaningHi: string;
  exampleSentenceEn: string;
  exampleSentenceHi: string;
  syllables?: string[];
  visualEmoji?: string;
}

export interface ReadCombinationItem {
  id: string;
  phrase: string;
  wordCount: number;
  category: string;
  meaningEn: string;
  meaningHi: string;
  visualEmoji?: string;
  words: string[];
}

export interface ReadSentenceItem {
  id: string;
  sentence: string;
  wordCount: number;
  category: string;
  meaningEn: string;
  meaningHi: string;
  words: string[];
  focusSkill: string;
}

export interface ReadStoryItem {
  id: string;
  title: string;
  titleHi: string;
  level: number;
  wordCount: number;
  difficulty: 'beginner' | 'intermediate' | 'fluent';
  text: string;
  textHi: string;
  sentences: string[];
  comprehensionQuestions: {
    question: string;
    questionHi: string;
    options: string[];
    correctOptionIndex: number;
  }[];
}

export interface ReadLevelConfig {
  levelNumber: 1 | 2 | 3 | 4;
  name: string;
  nameHi: string;
  subtitle: string;
  subtitleHi: string;
  description: string;
  descriptionHi: string;
  icon: string;
  themeColor: string;
  gradient: string;
  minMasteryRequired: number; // percentage of previous level needed to unlock
}

export const READ_LEVELS_CONFIG: ReadLevelConfig[] = [
  {
    levelNumber: 1,
    name: 'Single Words',
    nameHi: 'एकल शब्द (Single Words)',
    subtitle: 'Build word recognition & clarity one word at a time',
    subtitleHi: 'एक समय में एक शब्द की स्पष्ट पहचान एवं उच्चारण',
    description: 'Stage 1 to 4: Very easy words, CVC patterns, consonant blends, and familiar multi-syllable words. No sentences or phrases.',
    descriptionHi: 'चरण १ से ४: सरल शब्द, CVC ध्वनियाँ, संयुक्त व्यंजन एवं परिचित शब्द।',
    icon: '🔤',
    themeColor: 'indigo',
    gradient: 'from-indigo-600 to-blue-600',
    minMasteryRequired: 0, // Unlocked by default
  },
  {
    levelNumber: 2,
    name: 'Word Combinations',
    nameHi: 'शब्द जोड़ (Word Combinations)',
    subtitle: 'Connect 2 to 3 words smoothly',
    subtitleHi: '२ से ३ शब्दों का सुगम प्रवाह',
    description: 'Transition from single words to short 2-3 word phrases (e.g., "red ball", "big dog", "blue car").',
    descriptionHi: 'एकल शब्दों से छोटे २-३ शब्दों के समूहों पर अभ्यास (उदा. "red ball", "big dog")।',
    icon: '🔗',
    themeColor: 'emerald',
    gradient: 'from-emerald-600 to-teal-600',
    minMasteryRequired: 60,
  },
  {
    levelNumber: 3,
    name: 'Short Sentences',
    nameHi: 'लघु वाक्य (Short Sentences)',
    subtitle: 'Read complete simple sentences with rhythm',
    subtitleHi: 'स्पष्ट गति व लय के साथ पूरे सरल वाक्य पढ़ें',
    description: 'Master short, natural, age-appropriate sentences with high frequency sight words and clear punctuation.',
    descriptionHi: 'स्वाभाविक एवं आसान वाक्यों का सटीक पठन (उदा. "The dog runs.", "I see a cat.")।',
    icon: '📝',
    themeColor: 'amber',
    gradient: 'from-amber-500 to-orange-600',
    minMasteryRequired: 60,
  },
  {
    levelNumber: 4,
    name: 'Paragraphs & Stories',
    nameHi: 'परिच्छेद एवं कहानियाँ (Stories)',
    subtitle: 'Connected fluent reading & comprehension',
    subtitleHi: 'धाराप्रवाह कहानी पठन एवं समझ',
    description: 'Read engaging mini-stories, dialogues, and informational passages with accuracy and confidence.',
    descriptionHi: 'रुचिकर लघु कहानियाँ, संवाद एवं समझ आधारित प्रश्नों के साथ अभ्यास।',
    icon: '📚',
    themeColor: 'purple',
    gradient: 'from-purple-600 to-indigo-700',
    minMasteryRequired: 60,
  },
];

// ============================================================================
// LEVEL 1: SINGLE WORDS DATABASE (Structured in 4 Stages)
// ============================================================================
export const LEVEL_1_SINGLE_WORDS: ReadWordItem[] = [
  // --- STAGE 1: VERY EASY WORDS ---
  { id: 'w1_cat', word: 'cat', stage: 1, stageName: 'Stage 1: Very Easy', stageNameHi: 'चरण १: सरल शब्द', category: 'Animals', targetPhoneme: '/k/', phonicsPattern: 'CVC', vowelPattern: 'SHORT_A', syllableCount: 1, meaningEn: 'A furry pet that purrs', meaningHi: 'बिल्ली', exampleSentenceEn: 'The cat sits on the rug.', exampleSentenceHi: 'बिल्ली चटाई पर बैठी है।', visualEmoji: '🐱' },
  { id: 'w1_dog', word: 'dog', stage: 1, stageName: 'Stage 1: Very Easy', stageNameHi: 'चरण १: सरल शब्द', category: 'Animals', targetPhoneme: '/d/', phonicsPattern: 'CVC', vowelPattern: 'SHORT_O', syllableCount: 1, meaningEn: 'A friendly barking pet', meaningHi: 'कुत्ता', exampleSentenceEn: 'The dog wags its tail.', exampleSentenceHi: 'कुत्ता पूंछ हिलाता है।', visualEmoji: '🐶' },
  { id: 'w1_sun', word: 'sun', stage: 1, stageName: 'Stage 1: Very Easy', stageNameHi: 'चरण १: सरल शब्द', category: 'Nature', targetPhoneme: '/s/', phonicsPattern: 'CVC', vowelPattern: 'SHORT_U', syllableCount: 1, meaningEn: 'The bright star in daytime', meaningHi: 'सूरज', exampleSentenceEn: 'The bright sun shines.', exampleSentenceHi: 'सूरज चमकता है।', visualEmoji: '☀️' },
  { id: 'w1_bus', word: 'bus', stage: 1, stageName: 'Stage 1: Very Easy', stageNameHi: 'चरण १: सरल शब्द', category: 'Vehicles', targetPhoneme: '/b/', phonicsPattern: 'CVC', vowelPattern: 'SHORT_U', syllableCount: 1, meaningEn: 'A large passenger vehicle', meaningHi: 'बस', exampleSentenceEn: 'The yellow school bus stopped.', exampleSentenceHi: 'स्कूल बस रुकी।', visualEmoji: '🚌' },
  { id: 'w1_ball', word: 'ball', stage: 1, stageName: 'Stage 1: Very Easy', stageNameHi: 'चरण १: सरल शब्द', category: 'Toys', targetPhoneme: '/b/', phonicsPattern: 'BALL', vowelPattern: 'ALL', syllableCount: 1, meaningEn: 'A round toy for games', meaningHi: 'गेंद', exampleSentenceEn: 'Kick the red ball.', exampleSentenceHi: 'लाल गेंद को किक मारें।', visualEmoji: '⚽' },
  { id: 'w1_hat', word: 'hat', stage: 1, stageName: 'Stage 1: Very Easy', stageNameHi: 'चरण १: सरल शब्द', category: 'Clothing', targetPhoneme: '/h/', phonicsPattern: 'CVC', vowelPattern: 'SHORT_A', syllableCount: 1, meaningEn: 'Covering for the head', meaningHi: 'टोपी', exampleSentenceEn: 'He wears a wide hat.', exampleSentenceHi: 'उसने टोपी पहनी है।', visualEmoji: '🧢' },
  { id: 'w1_pen', word: 'pen', stage: 1, stageName: 'Stage 1: Very Easy', stageNameHi: 'चरण १: सरल शब्द', category: 'Stationery', targetPhoneme: '/p/', phonicsPattern: 'CVC', vowelPattern: 'SHORT_E', syllableCount: 1, meaningEn: 'Writing tool with ink', meaningHi: 'कलम', exampleSentenceEn: 'Write with a blue pen.', exampleSentenceHi: 'नीली कलम से लिखें।', visualEmoji: '🖊️' },
  { id: 'w1_cup', word: 'cup', stage: 1, stageName: 'Stage 1: Very Easy', stageNameHi: 'चरण १: सरल शब्द', category: 'Kitchen', targetPhoneme: '/k/', phonicsPattern: 'CVC', vowelPattern: 'SHORT_U', syllableCount: 1, meaningEn: 'Small container for drinks', meaningHi: 'कप', exampleSentenceEn: 'A warm cup of milk.', exampleSentenceHi: 'दूध का एक कप।', visualEmoji: '☕' },
  { id: 'w1_bed', word: 'bed', stage: 1, stageName: 'Stage 1: Very Easy', stageNameHi: 'चरण १: सरल शब्द', category: 'Furniture', targetPhoneme: '/b/', phonicsPattern: 'CVC', vowelPattern: 'SHORT_E', syllableCount: 1, meaningEn: 'Furniture for sleeping', meaningHi: 'बिस्तर', exampleSentenceEn: 'Sleep in your warm bed.', exampleSentenceHi: 'बिस्तर पर सोएं।', visualEmoji: '🛏️' },
  { id: 'w1_pig', word: 'pig', stage: 1, stageName: 'Stage 1: Very Easy', stageNameHi: 'चरण १: सरल शब्द', category: 'Animals', targetPhoneme: '/p/', phonicsPattern: 'CVC', vowelPattern: 'SHORT_I', syllableCount: 1, meaningEn: 'Pink farm animal', meaningHi: 'सुअर', exampleSentenceEn: 'The little pink pig.', exampleSentenceHi: 'छोटा गुलाबी सुअर।', visualEmoji: '🐷' },

  // --- STAGE 2: CVC WORDS ---
  { id: 'w2_bat', word: 'bat', stage: 2, stageName: 'Stage 2: CVC Words', stageNameHi: 'चरण २: CVC शब्द', category: 'Sports', targetPhoneme: '/b-æ-t/', phonicsPattern: 'CVC', vowelPattern: 'SHORT_A', syllableCount: 1, meaningEn: 'Wooden stick for cricket', meaningHi: 'बल्ला', exampleSentenceEn: 'Swing the cricket bat.', exampleSentenceHi: 'बल्ला घुमाएं।', visualEmoji: '🏏' },
  { id: 'w2_mat', word: 'mat', stage: 2, stageName: 'Stage 2: CVC Words', stageNameHi: 'चरण २: CVC शब्द', category: 'Home', targetPhoneme: '/m-æ-t/', phonicsPattern: 'CVC', vowelPattern: 'SHORT_A', syllableCount: 1, meaningEn: 'Floor covering', meaningHi: 'चटाई', exampleSentenceEn: 'Sit on the yoga mat.', exampleSentenceHi: 'चटाई पर बैठें।', visualEmoji: '🧘' },
  { id: 'w2_map', word: 'map', stage: 2, stageName: 'Stage 2: CVC Words', stageNameHi: 'चरण २: CVC शब्द', category: 'School', targetPhoneme: '/m-æ-p/', phonicsPattern: 'CVC', vowelPattern: 'SHORT_A', syllableCount: 1, meaningEn: 'Drawing of an area', meaningHi: 'नक्शा', exampleSentenceEn: 'Look at the city map.', exampleSentenceHi: 'शहर का नक्शा देखें।', visualEmoji: '🗺️' },
  { id: 'w2_cap', word: 'cap', stage: 2, stageName: 'Stage 2: CVC Words', stageNameHi: 'चरण २: CVC शब्द', category: 'Clothing', targetPhoneme: '/k-æ-p/', phonicsPattern: 'CVC', vowelPattern: 'SHORT_A', syllableCount: 1, meaningEn: 'Head covering with visor', meaningHi: 'कैप / टोपी', exampleSentenceEn: 'Wear your sun cap.', exampleSentenceHi: 'अपनी कैप पहनें।', visualEmoji: '🧢' },
  { id: 'w2_fan', word: 'fan', stage: 2, stageName: 'Stage 2: CVC Words', stageNameHi: 'चरण २: CVC शब्द', category: 'Home', targetPhoneme: '/f-æ-n/', phonicsPattern: 'CVC', vowelPattern: 'SHORT_A', syllableCount: 1, meaningEn: 'Device creating airflow', meaningHi: 'पंखा', exampleSentenceEn: 'Turn on the room fan.', exampleSentenceHi: 'पंखा चलाएं।', visualEmoji: '🪭' },
  { id: 'w2_red', word: 'red', stage: 2, stageName: 'Stage 2: CVC Words', stageNameHi: 'चरण २: CVC शब्द', category: 'Colors', targetPhoneme: '/r-e-d/', phonicsPattern: 'CVC', vowelPattern: 'SHORT_E', syllableCount: 1, meaningEn: 'Bright ruby color', meaningHi: 'लाल', exampleSentenceEn: 'The red apple is sweet.', exampleSentenceHi: 'लाल सेब मीठा है।', visualEmoji: '🔴' },
  { id: 'w2_hen', word: 'hen', stage: 2, stageName: 'Stage 2: CVC Words', stageNameHi: 'चरण २: CVC शब्द', category: 'Animals', targetPhoneme: '/h-e-n/', phonicsPattern: 'CVC', vowelPattern: 'SHORT_E', syllableCount: 1, meaningEn: 'Female chicken bird', meaningHi: 'मुर्गी', exampleSentenceEn: 'The red hen lay eggs.', exampleSentenceHi: 'मुर्गी ने अंडे दिए।', visualEmoji: '🐔' },
  { id: 'w2_sit', word: 'sit', stage: 2, stageName: 'Stage 2: CVC Words', stageNameHi: 'चरण २: CVC शब्द', category: 'Actions', targetPhoneme: '/s-ɪ-t/', phonicsPattern: 'CVC', vowelPattern: 'SHORT_I', syllableCount: 1, meaningEn: 'Rest on a seat', meaningHi: 'बैठना', exampleSentenceEn: 'Sit down quietly.', exampleSentenceHi: 'शांति से बैठें।', visualEmoji: '🪑' },
  { id: 'w2_pin', word: 'pin', stage: 2, stageName: 'Stage 2: CVC Words', stageNameHi: 'चरण २: CVC शब्द', category: 'Tools', targetPhoneme: '/p-ɪ-n/', phonicsPattern: 'CVC', vowelPattern: 'SHORT_I', syllableCount: 1, meaningEn: 'Small sharp fastener', meaningHi: 'पिन', exampleSentenceEn: 'A shiny silver pin.', exampleSentenceHi: 'चमकदार पिन।', visualEmoji: '📌' },
  { id: 'w2_top', word: 'top', stage: 2, stageName: 'Stage 2: CVC Words', stageNameHi: 'चरण २: CVC शब्द', category: 'Toys', targetPhoneme: '/t-ɒ-p/', phonicsPattern: 'CVC', vowelPattern: 'SHORT_O', syllableCount: 1, meaningEn: 'Spinning toy / highest part', meaningHi: 'लट्टू / शिखर', exampleSentenceEn: 'Spin the colorful top.', exampleSentenceHi: 'लट्टू को घुमाएं।', visualEmoji: '🪀' },
  { id: 'w2_hot', word: 'hot', stage: 2, stageName: 'Stage 2: CVC Words', stageNameHi: 'चरण २: CVC शब्द', category: 'Sensory', targetPhoneme: '/h-ɒ-t/', phonicsPattern: 'CVC', vowelPattern: 'SHORT_O', syllableCount: 1, meaningEn: 'High temperature', meaningHi: 'गर्म', exampleSentenceEn: 'The tea is very hot.', exampleSentenceHi: 'चाय बहुत गर्म है।', visualEmoji: '🔥' },
  { id: 'w2_run', word: 'run', stage: 2, stageName: 'Stage 2: CVC Words', stageNameHi: 'चरण २: CVC शब्द', category: 'Actions', targetPhoneme: '/r-ʌ-n/', phonicsPattern: 'CVC', vowelPattern: 'SHORT_U', syllableCount: 1, meaningEn: 'Move fast on feet', meaningHi: 'दौड़ना', exampleSentenceEn: 'Run fast to the park.', exampleSentenceHi: 'पार्क की ओर तेज़ दौड़ें।', visualEmoji: '🏃' },
  { id: 'w2_fun', word: 'fun', stage: 2, stageName: 'Stage 2: CVC Words', stageNameHi: 'चरण २: CVC शब्द', category: 'Emotions', targetPhoneme: '/f-ʌ-n/', phonicsPattern: 'CVC', vowelPattern: 'SHORT_U', syllableCount: 1, meaningEn: 'Playful enjoyment', meaningHi: 'मज़ा / आनंद', exampleSentenceEn: 'Reading books is fun.', exampleSentenceHi: 'किताबें पढ़ना मजेदार है।', visualEmoji: '🎉' },

  // --- STAGE 3: SLIGHTLY MORE COMPLEX WORDS (Blends & Digraphs) ---
  { id: 'w3_fish', word: 'fish', stage: 3, stageName: 'Stage 3: Digraphs & Blends', stageNameHi: 'चरण ३: संयुक्त ध्वनियाँ', category: 'Animals', targetPhoneme: '/ʃ/', phonicsPattern: 'SH', vowelPattern: 'SHORT_I', syllableCount: 1, meaningEn: 'Swimming aquatic creature', meaningHi: 'मछली', exampleSentenceEn: 'The gold fish swims.', exampleSentenceHi: 'मछली पानी में तैरती है।', visualEmoji: '🐟' },
  { id: 'w3_ship', word: 'ship', stage: 3, stageName: 'Stage 3: Digraphs & Blends', stageNameHi: 'चरण ३: संयुक्त ध्वनियाँ', category: 'Vehicles', targetPhoneme: '/ʃ/', phonicsPattern: 'SH', vowelPattern: 'SHORT_I', syllableCount: 1, meaningEn: 'Large ocean vessel', meaningHi: 'जहाज', exampleSentenceEn: 'The ship sails far.', exampleSentenceHi: 'जहाज समुद्र में जाता है।', visualEmoji: '🚢' },
  { id: 'w3_milk', word: 'milk', stage: 3, stageName: 'Stage 3: Digraphs & Blends', stageNameHi: 'चरण ३: संयुक्त ध्वनियाँ', category: 'Food', targetPhoneme: '/lk/', phonicsPattern: 'BLEND', vowelPattern: 'SHORT_I', syllableCount: 1, meaningEn: 'White nutritious drink', meaningHi: 'दूध', exampleSentenceEn: 'Drink fresh warm milk.', exampleSentenceHi: 'ताज़ा दूध पिएं।', visualEmoji: '🥛' },
  { id: 'w3_frog', word: 'frog', stage: 3, stageName: 'Stage 3: Digraphs & Blends', stageNameHi: 'चरण ३: संयुक्त ध्वनियाँ', category: 'Animals', targetPhoneme: '/fr/', phonicsPattern: 'FR', vowelPattern: 'SHORT_O', syllableCount: 1, meaningEn: 'Green leaping amphibian', meaningHi: 'मेंढक', exampleSentenceEn: 'The green frog leaps.', exampleSentenceHi: 'मेंढक कूदता है।', visualEmoji: '🐸' },
  { id: 'w3_tree', word: 'tree', stage: 3, stageName: 'Stage 3: Digraphs & Blends', stageNameHi: 'चरण ३: संयुक्त ध्वनियाँ', category: 'Nature', targetPhoneme: '/tr/', phonicsPattern: 'TR', vowelPattern: 'LONG_E', syllableCount: 1, meaningEn: 'Tall woody plant with leaves', meaningHi: 'पेड़', exampleSentenceEn: 'Birds sit in the tree.', exampleSentenceHi: 'पक्षी पेड़ पर बैठते हैं।', visualEmoji: '🌳' },
  { id: 'w3_star', word: 'star', stage: 3, stageName: 'Stage 3: Digraphs & Blends', stageNameHi: 'चरण ३: संयुक्त ध्वनियाँ', category: 'Space', targetPhoneme: '/st/', phonicsPattern: 'ST', vowelPattern: 'BOSSY_R', syllableCount: 1, meaningEn: 'Shining point in night sky', meaningHi: 'तारा', exampleSentenceEn: 'Look at the bright star.', exampleSentenceHi: 'चमकता तारा देखें।', visualEmoji: '⭐' },
  { id: 'w3_black', word: 'black', stage: 3, stageName: 'Stage 3: Digraphs & Blends', stageNameHi: 'चरण ३: संयुक्त ध्वनियाँ', category: 'Colors', targetPhoneme: '/bl/', phonicsPattern: 'BL', vowelPattern: 'SHORT_A', syllableCount: 1, meaningEn: 'Darkest color', meaningHi: 'काला', exampleSentenceEn: 'A shiny black shoe.', exampleSentenceHi: 'काला जूता।', visualEmoji: '⬛' },
  { id: 'w3_green', word: 'green', stage: 3, stageName: 'Stage 3: Digraphs & Blends', stageNameHi: 'चरण ३: संयुक्त ध्वनियाँ', category: 'Colors', targetPhoneme: '/gr/', phonicsPattern: 'GR', vowelPattern: 'LONG_E', syllableCount: 1, meaningEn: 'Color of grass and leaves', meaningHi: 'हरा', exampleSentenceEn: 'The fresh green grass.', exampleSentenceHi: 'हरी घास।', visualEmoji: '🟢' },
  { id: 'w3_chair', word: 'chair', stage: 3, stageName: 'Stage 3: Digraphs & Blends', stageNameHi: 'चरण ३: संयुक्त ध्वनियाँ', category: 'Furniture', targetPhoneme: '/tʃ/', phonicsPattern: 'CH', vowelPattern: 'VOWEL_TEAM', syllableCount: 1, meaningEn: 'Seat with backrest', meaningHi: 'कुर्सी', exampleSentenceEn: 'Sit on the wooden chair.', exampleSentenceHi: 'कुर्सी पर बैठें।', visualEmoji: '🪑' },
  { id: 'w3_brush', word: 'brush', stage: 3, stageName: 'Stage 3: Digraphs & Blends', stageNameHi: 'चरण ३: संयुक्त ध्वनियाँ', category: 'Daily', targetPhoneme: '/br-ʃ/', phonicsPattern: 'SH', vowelPattern: 'SHORT_U', syllableCount: 1, meaningEn: 'Tool for painting or cleaning', meaningHi: 'ब्रश', exampleSentenceEn: 'Brush your teeth twice.', exampleSentenceHi: 'दांत ब्रश करें।', visualEmoji: '🪥' },
  { id: 'w3_dish', word: 'dish', stage: 3, stageName: 'Stage 3: Digraphs & Blends', stageNameHi: 'चरण ३: संयुक्त ध्वनियाँ', category: 'Kitchen', targetPhoneme: '/d-ɪ-ʃ/', phonicsPattern: 'SH', vowelPattern: 'SHORT_I', syllableCount: 1, meaningEn: 'Shallow plate for food', meaningHi: 'थाली', exampleSentenceEn: 'Clean the food dish.', exampleSentenceHi: 'थाली साफ़ करें।', visualEmoji: '🍽️' },
  { id: 'w3_shop', word: 'shop', stage: 3, stageName: 'Stage 3: Digraphs & Blends', stageNameHi: 'चरण ३: संयुक्त ध्वनियाँ', category: 'Places', targetPhoneme: '/ʃ-ɒ-p/', phonicsPattern: 'SH', vowelPattern: 'SHORT_O', syllableCount: 1, meaningEn: 'Place for buying items', meaningHi: 'दुकान', exampleSentenceEn: 'Go to the sweet shop.', exampleSentenceHi: 'दुकान पर जाएं।', visualEmoji: '🏪' },

  // --- STAGE 4: LONGER FAMILIAR WORDS (Multi-Syllable) ---
  { id: 'w4_apple', word: 'apple', stage: 4, stageName: 'Stage 4: Multi-Syllable Words', stageNameHi: 'चरण ४: बहु-अक्षर शब्द', category: 'Fruits', targetPhoneme: '/æ-p-l/', phonicsPattern: 'LE', vowelPattern: 'SHORT_A', syllableCount: 2, meaningEn: 'Crisp sweet fruit', meaningHi: 'सेब', exampleSentenceEn: 'Eat a fresh red apple.', exampleSentenceHi: 'ताज़ा सेब खाएं।', syllables: ['ap', 'ple'], visualEmoji: '🍎' },
  { id: 'w4_rabbit', word: 'rabbit', stage: 4, stageName: 'Stage 4: Multi-Syllable Words', stageNameHi: 'चरण ४: बहु-अक्षर शब्द', category: 'Animals', targetPhoneme: '/r-æ-b-ɪ-t/', phonicsPattern: 'R', vowelPattern: 'SHORT_A', syllableCount: 2, meaningEn: 'Furry animal with long ears', meaningHi: 'खरगोश', exampleSentenceEn: 'The white rabbit hops.', exampleSentenceHi: 'सफेद खरगोश कूदता है।', syllables: ['rab', 'bit'], visualEmoji: '🐰' },
  { id: 'w4_monkey', word: 'monkey', stage: 4, stageName: 'Stage 4: Multi-Syllable Words', stageNameHi: 'चरण ४: बहु-अक्षर शब्द', category: 'Animals', targetPhoneme: '/m-ʌ-ŋ-k-i/', phonicsPattern: 'KEY', vowelPattern: 'SHORT_U', syllableCount: 2, meaningEn: 'Playful tree-climbing mammal', meaningHi: 'बंदर', exampleSentenceEn: 'The monkey loves bananas.', exampleSentenceHi: 'बंदर को केले पसंद हैं।', syllables: ['mon', 'key'], visualEmoji: '🐵' },
  { id: 'w4_pencil', word: 'pencil', stage: 4, stageName: 'Stage 4: Multi-Syllable Words', stageNameHi: 'चरण ४: बहु-अक्षर शब्द', category: 'School', targetPhoneme: '/p-e-n-s-l/', phonicsPattern: 'SOFT_C', vowelPattern: 'SHORT_E', syllableCount: 2, meaningEn: 'Graphite writing tool', meaningHi: 'पेंसिल', exampleSentenceEn: 'Draw with a sharp pencil.', exampleSentenceHi: 'पेंसिल से चित्र बनाएं।', syllables: ['pen', 'cil'], visualEmoji: '✏️' },
  { id: 'w4_window', word: 'window', stage: 4, stageName: 'Stage 4: Multi-Syllable Words', stageNameHi: 'चरण ४: बहु-अक्षर शब्द', category: 'Home', targetPhoneme: '/w-ɪ-n-d-oʊ/', phonicsPattern: 'OW', vowelPattern: 'SHORT_I', syllableCount: 2, meaningEn: 'Glass opening in a wall', meaningHi: 'खिड़की', exampleSentenceEn: 'Open the bedroom window.', exampleSentenceHi: 'खिड़की खोलें।', syllables: ['win', 'dow'], visualEmoji: '🪟' },
  { id: 'w4_banana', word: 'banana', stage: 4, stageName: 'Stage 4: Multi-Syllable Words', stageNameHi: 'चरण ४: बहु-अक्षर शब्द', category: 'Fruits', targetPhoneme: '/b-ə-n-æ-n-ə/', phonicsPattern: 'MULTI', vowelPattern: 'SCHWA', syllableCount: 3, meaningEn: 'Yellow tropical fruit', meaningHi: 'केला', exampleSentenceEn: 'A sweet yellow banana.', exampleSentenceHi: 'मीठा पीला केला।', syllables: ['ba', 'na', 'na'], visualEmoji: '🍌' },
  { id: 'w4_garden', word: 'garden', stage: 4, stageName: 'Stage 4: Multi-Syllable Words', stageNameHi: 'चरण ४: बहु-अक्षर शब्द', category: 'Nature', targetPhoneme: '/ɡ-ɑːr-d-n/', phonicsPattern: 'AR', vowelPattern: 'BOSSY_R', syllableCount: 2, meaningEn: 'Area with flowers and plants', meaningHi: 'बगीचा', exampleSentenceEn: 'Flowers bloom in the garden.', exampleSentenceHi: 'बगीचे में फूल खिलते हैं।', syllables: ['gar', 'den'], visualEmoji: '🏡' },
  { id: 'w4_yellow', word: 'yellow', stage: 4, stageName: 'Stage 4: Multi-Syllable Words', stageNameHi: 'चरण ४: बहु-अक्षर शब्द', category: 'Colors', targetPhoneme: '/j-e-l-oʊ/', phonicsPattern: 'OW', vowelPattern: 'SHORT_E', syllableCount: 2, meaningEn: 'Color of lemon and sunshine', meaningHi: 'पीला', exampleSentenceEn: 'The yellow flower is pretty.', exampleSentenceHi: 'पीला फूल सुंदर है।', syllables: ['yel', 'low'], visualEmoji: '🟡' },
];

// ============================================================================
// LEVEL 2: WORD COMBINATIONS (2 to 3 Words)
// ============================================================================
export const LEVEL_2_COMBINATIONS: ReadCombinationItem[] = [
  { id: 'c2_red_ball', phrase: 'red ball', wordCount: 2, category: 'Toys', meaningEn: 'A ball of red color', meaningHi: 'लाल गेंद', visualEmoji: '🔴⚽', words: ['red', 'ball'] },
  { id: 'c2_big_dog', phrase: 'big dog', wordCount: 2, category: 'Animals', meaningEn: 'A large canine pet', meaningHi: 'बड़ा कुत्ता', visualEmoji: '🐕', words: ['big', 'dog'] },
  { id: 'c2_my_book', phrase: 'my book', wordCount: 2, category: 'School', meaningEn: 'Book that belongs to me', meaningHi: 'मेरी किताब', visualEmoji: '📖', words: ['my', 'book'] },
  { id: 'c2_blue_car', phrase: 'blue car', wordCount: 2, category: 'Vehicles', meaningEn: 'Car of blue color', meaningHi: 'नीली कार', visualEmoji: '🚙', words: ['blue', 'car'] },
  { id: 'c2_hot_milk', phrase: 'hot milk', wordCount: 2, category: 'Food', meaningEn: 'Warm nutritious drink', meaningHi: 'गर्म दूध', visualEmoji: '🥛', words: ['hot', 'milk'] },
  { id: 'c2_a_cat', phrase: 'a cat', wordCount: 2, category: 'Animals', meaningEn: 'One small feline', meaningHi: 'एक बिल्ली', visualEmoji: '🐱', words: ['a', 'cat'] },
  { id: 'c2_green_tree', phrase: 'green tree', wordCount: 2, category: 'Nature', meaningEn: 'Tree with lush foliage', meaningHi: 'हरा पेड़', visualEmoji: '🌳', words: ['green', 'tree'] },
  { id: 'c2_little_boy', phrase: 'little boy', wordCount: 2, category: 'People', meaningEn: 'A young child', meaningHi: 'छोटा लड़का', visualEmoji: '👦', words: ['little', 'boy'] },
  { id: 'c2_cold_water', phrase: 'cold water', wordCount: 2, category: 'Drink', meaningEn: 'Refreshing water', meaningHi: 'ठंडा पानी', visualEmoji: '💧', words: ['cold', 'water'] },
  { id: 'c2_happy_sun', phrase: 'happy sun', wordCount: 2, category: 'Nature', meaningEn: 'Smiling bright sunshine', meaningHi: 'हँसता सूरज', visualEmoji: '☀️', words: ['happy', 'sun'] },
  { id: 'c2_fast_bus', phrase: 'fast bus', wordCount: 2, category: 'Vehicles', meaningEn: 'Speedy school bus', meaningHi: 'तेज़ बस', visualEmoji: '🚌', words: ['fast', 'bus'] },
  { id: 'c2_sweet_apple', phrase: 'sweet apple', wordCount: 2, category: 'Fruits', meaningEn: 'Tasty ripe fruit', meaningHi: 'मीठा सेब', visualEmoji: '🍎', words: ['sweet', 'apple'] },
];

// ============================================================================
// LEVEL 3: SHORT SENTENCES
// ============================================================================
export const LEVEL_3_SENTENCES: ReadSentenceItem[] = [
  { id: 's3_dog_runs', sentence: 'The dog runs.', wordCount: 3, category: 'Action', meaningEn: 'The canine moves quickly.', meaningHi: 'कुत्ता दौड़ता है।', focusSkill: 'Basic Sight Words', words: ['The', 'dog', 'runs'] },
  { id: 's3_see_cat', sentence: 'I see a cat.', wordCount: 4, category: 'Observation', meaningEn: 'I notice a feline nearby.', meaningHi: 'मैं एक बिल्ली देखता हूँ।', focusSkill: 'Sight word "see"', words: ['I', 'see', 'a', 'cat'] },
  { id: 's3_my_bag', sentence: 'This is my bag.', wordCount: 4, category: 'School', meaningEn: 'The backpack belongs to me.', meaningHi: 'यह मेरा बैग है।', focusSkill: 'Sight word "This"', words: ['This', 'is', 'my', 'bag'] },
  { id: 's3_boy_ball', sentence: 'The boy has a ball.', wordCount: 5, category: 'Play', meaningEn: 'The child holds a toy ball.', meaningHi: 'लड़के के पास एक गेंद है।', focusSkill: 'Sight word "has"', words: ['The', 'boy', 'has', 'a', 'ball'] },
  { id: 's3_sun_bright', sentence: 'The sun is bright.', wordCount: 4, category: 'Nature', meaningEn: 'Daylight is clear and warm.', meaningHi: 'सूरज चमकदार है।', focusSkill: 'Descriptive Sentences', words: ['The', 'sun', 'is', 'bright'] },
  { id: 's3_we_read', sentence: 'We like to read.', wordCount: 4, category: 'School', meaningEn: 'Reading books gives us joy.', meaningHi: 'हमें पढ़ना पसंद है।', focusSkill: 'Sight word "like"', words: ['We', 'like', 'to', 'read'] },
  { id: 's3_red_hat', sentence: 'She has a red hat.', wordCount: 5, category: 'Clothing', meaningEn: 'The girl wears a red cap.', meaningHi: 'उसके पास एक लाल टोपी है।', focusSkill: 'Sight word "She"', words: ['She', 'has', 'a', 'red', 'hat'] },
  { id: 's3_birds_fly', sentence: 'Birds fly in the sky.', wordCount: 5, category: 'Nature', meaningEn: 'Winged creatures soar high.', meaningHi: 'पक्षी आसमान में उड़ते हैं।', focusSkill: 'Preposition "in"', words: ['Birds', 'fly', 'in', 'the', 'sky'] },
];

// ============================================================================
// LEVEL 4: PARAGRAPHS & MINI STORIES
// ============================================================================
export const LEVEL_4_STORIES: ReadStoryItem[] = [
  {
    id: 'st4_cat_mat',
    title: 'The Cat on the Mat',
    titleHi: 'चटाई पर बिल्ली',
    level: 4,
    wordCount: 28,
    difficulty: 'beginner',
    text: 'A little cat sat on a soft mat. She saw a red ball near the door. The cat ran fast and kicked the ball with joy.',
    textHi: 'एक छोटी बिल्ली मुलायम चटाई पर बैठी थी। उसने दरवाजे के पास एक लाल गेंद देखी। बिल्ली तेज़ दौड़ी और खुशी से गेंद को किक मारी।',
    sentences: [
      'A little cat sat on a soft mat.',
      'She saw a red ball near the door.',
      'The cat ran fast and kicked the ball with joy.'
    ],
    comprehensionQuestions: [
      {
        question: 'Where was the cat sitting?',
        questionHi: 'बिल्ली कहाँ बैठी थी?',
        options: ['On a soft mat', 'In a box', 'On a tree'],
        correctOptionIndex: 0,
      },
      {
        question: 'What color was the ball?',
        questionHi: 'गेंद किस रंग की थी?',
        options: ['Blue', 'Red', 'Yellow'],
        correctOptionIndex: 1,
      }
    ]
  },
  {
    id: 'st4_sunny_park',
    title: 'A Sunny Day at the Park',
    titleHi: 'पार्क में धूप भरा दिन',
    level: 4,
    wordCount: 38,
    difficulty: 'intermediate',
    text: 'Today the bright golden sun shines in the blue sky. Rohan and his friendly brown dog walk to the green park. They play with a flying disc on the grass.',
    textHi: 'आज नीले आसमान में सुनहरा सूरज चमक रहा है। रोहन और उसका भूरा कुत्ता हरे पार्क में जाते हैं। वे घास पर खेल का आनंद लेते हैं।',
    sentences: [
      'Today the bright golden sun shines in the blue sky.',
      'Rohan and his friendly brown dog walk to the green park.',
      'They play with a flying disc on the grass.'
    ],
    comprehensionQuestions: [
      {
        question: 'Who went to the park with Rohan?',
        questionHi: 'रोहन के साथ पार्क कौन गया?',
        options: ['His friendly dog', 'A monkey', 'His teacher'],
        correctOptionIndex: 0,
      }
    ]
  },
  {
    id: 'st4_little_star',
    title: 'The Sparkling Star',
    titleHi: 'चमकता तारा',
    level: 4,
    wordCount: 44,
    difficulty: 'fluent',
    text: 'When night comes, a sparkling star appears high above the trees. It glows with gentle silver light. Vihaan looks out his bedroom window, makes a sweet wish, and sleeps peacefully under the calm night.',
    textHi: 'जब रात होती है, पेड़ों के ऊपर एक चमकता तारा दिखाई देता है। वह चांदी जैसी रोशनी बिखेरता है। विहान खिड़की से देखकर मीठी इच्छा मांगता है और सो जाता है।',
    sentences: [
      'When night comes, a sparkling star appears high above the trees.',
      'It glows with gentle silver light.',
      'Vihaan looks out his bedroom window, makes a sweet wish, and sleeps peacefully under the calm night.'
    ],
    comprehensionQuestions: [
      {
        question: 'When does the sparkling star appear?',
        questionHi: 'चमकता तारा कब दिखाई देता है?',
        options: ['When night comes', 'In the morning', 'At noon'],
        correctOptionIndex: 0,
      }
    ]
  }
];

export function getReadLevelWords(stage?: 1 | 2 | 3 | 4): ReadWordItem[] {
  if (!stage) return LEVEL_1_SINGLE_WORDS;
  return LEVEL_1_SINGLE_WORDS.filter(w => w.stage === stage);
}
