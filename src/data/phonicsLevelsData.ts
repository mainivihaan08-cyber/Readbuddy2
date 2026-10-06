import { AppLanguage } from '../types';

export interface PhonicsLetterItem {
  letter: string;
  letterCase: string; // "Aa", "Bb", etc.
  soundIpa: string;
  phonicsName: string;
  phonicsNameHi: string;
  exampleWord: string;
  exampleWordHi: string;
  phonemes: string[];
  articulatoryTip: string;
  articulatoryTipHi: string;
}

export interface PhonicsWordItem {
  id: string;
  word: string;
  phonemes: string[]; // e.g. ['/k/', '/æ/', '/t/']
  phonemeDisplay: string[]; // e.g. ['c', 'a', 't']
  targetSound: string;
  meaning: string;
  meaningHi: string;
  sentenceExample: string;
  sentenceExampleHi: string;
  contrastWord?: string;
  contrastTip?: string;
}

export interface PhonicsStoryPassage {
  id: string;
  title: string;
  titleHi: string;
  level: number;
  wordCount: number;
  targetFocus: string;
  text: string;
  textHi: string;
  sentences: string[];
}

export interface PhonicsLevelDef {
  levelNumber: number;
  title: string;
  titleHi: string;
  subtitle: string;
  subtitleHi: string;
  icon: string;
  colorTheme: string;
  gradient: string;
  description: string;
  descriptionHi: string;
  targetPhonemes: string[];
  items: PhonicsWordItem[];
  letterItems?: PhonicsLetterItem[];
  passages?: PhonicsStoryPassage[];
}

/**
 * COMPLETE 10-LEVEL STRUCTURED PHONICS & READING CURRICULUM
 */
export const PHONICS_10_LEVELS_DATABASE: PhonicsLevelDef[] = [
  // =========================================================================
  // LEVEL 1 — Letter Sounds (A–Z)
  // =========================================================================
  {
    levelNumber: 1,
    title: 'Letter Sounds (A–Z)',
    titleHi: 'वर्ण ध्वनियाँ (A–Z)',
    subtitle: 'Alphabet Letter Names & Primary Phonemes',
    subtitleHi: 'अक्षर नाम और प्राथमिक ध्वनियाँ',
    icon: '🔤',
    colorTheme: 'indigo',
    gradient: 'from-indigo-600 to-blue-600',
    description: 'Learn uppercase/lowercase letters, primary letter sounds, and introductory vocabulary.',
    descriptionHi: 'बड़े और छोटे अक्षर, उनकी मुख्य आवाज़ें और प्रारंभिक शब्द सीखें।',
    targetPhonemes: ['/æ/', '/b/', '/k/', '/d/', '/e/', '/f/', '/ɡ/', '/h/', '/ɪ/', '/dʒ/', '/k/', '/l/', '/m/', '/n/', '/ɒ/', '/p/', '/kw/', '/r/', '/s/', '/t/', '/ʌ/', '/v/', '/w/', '/ks/', '/j/', '/z/'],
    letterItems: [
      { letter: 'A', letterCase: 'Aa', soundIpa: '/æ/', phonicsName: 'Short A (ah)', phonicsNameHi: 'छोटा ऐ', exampleWord: 'Apple', exampleWordHi: 'सेब', phonemes: ['/æ/', '/p/', '/l/'], articulatoryTip: 'Open mouth wide and relax tongue flat in the bottom.', articulatoryTipHi: 'मुंह को चौड़ा खोलें और जीभ को नीचे रखें।' },
      { letter: 'B', letterCase: 'Bb', soundIpa: '/b/', phonicsName: 'B sound (buh)', phonicsNameHi: 'ब ध्वनि', exampleWord: 'Ball', exampleWordHi: 'गेंद', phonemes: ['/b/', '/ɔː/', '/l/'], articulatoryTip: 'Press both lips together firmly, then release with voiced air.', articulatoryTipHi: 'दोनों होठों को मिलाकर आवाज के साथ छोड़ें।' },
      { letter: 'C', letterCase: 'Cc', soundIpa: '/k/', phonicsName: 'Hard C (kuh)', phonicsNameHi: 'क ध्वनि', exampleWord: 'Cat', exampleWordHi: 'बिल्ली', phonemes: ['/k/', '/æ/', '/t/'], articulatoryTip: 'Raise the back of your tongue against soft palate and release crisp air.', articulatoryTipHi: 'जीभ के पिछले भाग को तालू से सटाकर छोड़ें।' },
      { letter: 'D', letterCase: 'Dd', soundIpa: '/d/', phonicsName: 'D sound (duh)', phonicsNameHi: 'ड ध्वनि', exampleWord: 'Dog', exampleWordHi: 'कुत्ता', phonemes: ['/d/', '/ɒ/', '/ɡ/'], articulatoryTip: 'Tap tongue tip lightly behind top front teeth with voice.', articulatoryTipHi: 'जीभ की नोक को ऊपर के दांतों के पीछे छूएं।' },
      { letter: 'E', letterCase: 'Ee', soundIpa: '/e/', phonicsName: 'Short E (eh)', phonicsNameHi: 'छोटा ए', exampleWord: 'Egg', exampleWordHi: 'अंडा', phonemes: ['/e/', '/ɡ/'], articulatoryTip: 'Slightly open mouth with corners relaxed, producing crisp /eh/.', articulatoryTipHi: 'मुंह को हल्का खोलकर स्पष्ट ए बोलें।' },
      { letter: 'F', letterCase: 'Ff', soundIpa: '/f/', phonicsName: 'F sound (fff)', phonicsNameHi: 'फ ध्वनि', exampleWord: 'Fish', exampleWordHi: 'मछली', phonemes: ['/f/', '/ɪ/', '/ʃ/'], articulatoryTip: 'Touch top teeth gently on bottom lip and blow air smoothly.', articulatoryTipHi: 'ऊपरी दांतों को निचले होंठ पर रखकर हवा निकालें।' },
      { letter: 'G', letterCase: 'Gg', soundIpa: '/ɡ/', phonicsName: 'Hard G (guh)', phonicsNameHi: 'ग ध्वनि', exampleWord: 'Goat', exampleWordHi: 'बकरी', phonemes: ['/ɡ/', '/oʊ/', '/t/'], articulatoryTip: 'Back of tongue presses palate and releases voiced sound.', articulatoryTipHi: 'गले से कंपन के साथ ग की आवाज़ निकालें।' },
      { letter: 'H', letterCase: 'Hh', soundIpa: '/h/', phonicsName: 'H sound (huh)', phonicsNameHi: 'ह ध्वनि', exampleWord: 'Hat', exampleWordHi: 'टोपी', phonemes: ['/h/', '/æ/', '/t/'], articulatoryTip: 'Breathe out a warm sigh from deep in your throat.', articulatoryTipHi: 'गले से गहरी सांस छोड़ते हुए ह बोलें।' },
      { letter: 'I', letterCase: 'Ii', soundIpa: '/ɪ/', phonicsName: 'Short I (ih)', phonicsNameHi: 'छोटा इ', exampleWord: 'Igloo', exampleWordHi: 'बर्फ का घर', phonemes: ['/ɪ/', '/ɡ/', '/l/', '/uː/'], articulatoryTip: 'Tongue raised slightly in middle, mouth relaxed.', articulatoryTipHi: 'जीभ को थोड़ा ऊपर रखें और छोटा इ बोलें।' },
      { letter: 'J', letterCase: 'Jj', soundIpa: '/dʒ/', phonicsName: 'J sound (juh)', phonicsNameHi: 'ज ध्वनि', exampleWord: 'Jam', exampleWordHi: 'जैम', phonemes: ['/dʒ/', '/æ/', '/m/'], articulatoryTip: 'Touch tongue behind top teeth and pop air with voice.', articulatoryTipHi: 'जीभ को ऊपर सटाकर आवाज़ के साथ ज बोलें।' },
      { letter: 'K', letterCase: 'Kk', soundIpa: '/k/', phonicsName: 'K sound (kuh)', phonicsNameHi: 'क ध्वनि', exampleWord: 'Kite', exampleWordHi: 'पतंग', phonemes: ['/k/', '/aɪ/', '/t/'], articulatoryTip: 'Sharp pop of air from back of throat.', articulatoryTipHi: 'गले के पिछले हिस्से से स्पष्ट क ध्वनि।' },
      { letter: 'L', letterCase: 'Ll', soundIpa: '/l/', phonicsName: 'L sound (lll)', phonicsNameHi: 'ल ध्वनि', exampleWord: 'Lion', exampleWordHi: 'शेर', phonemes: ['/l/', '/aɪ/', '/ən/'], articulatoryTip: 'Press tongue tip firmly on roof behind top teeth with steady voice.', articulatoryTipHi: 'जीभ की नोक को ऊपर दांतों के पीछे टिकाकर ल बोलें।' },
      { letter: 'M', letterCase: 'Mm', soundIpa: '/m/', phonicsName: 'M sound (mmm)', phonicsNameHi: 'म ध्वनि', exampleWord: 'Moon', exampleWordHi: 'चाँद', phonemes: ['/m/', '/uː/', '/n/'], articulatoryTip: 'Close lips completely and hum through your nose.', articulatoryTipHi: 'होंठ बंद करके नाक से म की गूंज निकालें।' },
      { letter: 'N', letterCase: 'Nn', soundIpa: '/n/', phonicsName: 'N sound (nnn)', phonicsNameHi: 'न ध्वनि', exampleWord: 'Nest', exampleWordHi: 'घोंसला', phonemes: ['/n/', '/e/', '/s/', '/t/'], articulatoryTip: 'Tongue on roof of mouth, air vibrates out nose.', articulatoryTipHi: 'जीभ तालू पर रखकर नाक से न बोलें।' },
      { letter: 'O', letterCase: 'Oo', soundIpa: '/ɒ/', phonicsName: 'Short O (ah/oh)', phonicsNameHi: 'छोटा ऑ', exampleWord: 'Orange', exampleWordHi: 'संतरा', phonemes: ['/ɒ/', '/r/', '/ɪ/', '/ndʒ/'], articulatoryTip: 'Round lips in open circle shape.', articulatoryTipHi: 'होठों को गोल करके ऑ बोलें।' },
      { letter: 'P', letterCase: 'Pp', soundIpa: '/p/', phonicsName: 'P sound (puh)', phonicsNameHi: 'प ध्वनि', exampleWord: 'Pen', exampleWordHi: 'कलम', phonemes: ['/p/', '/e/', '/n/'], articulatoryTip: 'Press lips together and pop air without voice.', articulatoryTipHi: 'होठों को बंद करके बिना गले की आवाज़ के हवा छोड़ें।' },
      { letter: 'Q', letterCase: 'Qq', soundIpa: '/kw/', phonicsName: 'Qu sound (kwuh)', phonicsNameHi: 'क्व ध्वनि', exampleWord: 'Queen', exampleWordHi: 'रानी', phonemes: ['/k/', '/w/', '/iː/', '/n/'], articulatoryTip: 'Combine /k/ with rounded lips for /w/.', articulatoryTipHi: 'क और व को मिलाकर क्व बोलें।' },
      { letter: 'R', letterCase: 'Rr', soundIpa: '/r/', phonicsName: 'R sound (rrr)', phonicsNameHi: 'र ध्वनि', exampleWord: 'Ring', exampleWordHi: 'अंगूठी', phonemes: ['/r/', '/ɪ/', '/ŋ/'], articulatoryTip: 'Curl tongue tip up towards roof without touching teeth.', articulatoryTipHi: 'जीभ की नोक को ऊपर मोड़ें बिना दांतों को छुए।' },
      { letter: 'S', letterCase: 'Ss', soundIpa: '/s/', phonicsName: 'S sound (sss)', phonicsNameHi: 'स ध्वनि', exampleWord: 'Sun', exampleWordHi: 'सूरज', phonemes: ['/s/', '/ʌ/', '/n/'], articulatoryTip: 'Hiss air steadily through lightly closed teeth.', articulatoryTipHi: 'दांत मिलाकर सीटी जैसी साफ हवा निकालें।' },
      { letter: 'T', letterCase: 'Tt', soundIpa: '/t/', phonicsName: 'T sound (tuh)', phonicsNameHi: 'ट ध्वनि', exampleWord: 'Tree', exampleWordHi: 'पेड़', phonemes: ['/t/', '/r/', '/iː/'], articulatoryTip: 'Tap tongue tip crisply behind top teeth and release air.', articulatoryTipHi: 'जीभ की नोक से ऊपर झटके से ट बोलें।' },
      { letter: 'U', letterCase: 'Uu', soundIpa: '/ʌ/', phonicsName: 'Short U (uh)', phonicsNameHi: 'छोटा अ', exampleWord: 'Umbrella', exampleWordHi: 'छाता', phonemes: ['/ʌ/', '/m/', '/b/', '/r/', '/e/', '/l/', '/ə/'], articulatoryTip: 'Relax mouth open and make short natural /uh/ sound.', articulatoryTipHi: 'मुंह ढीला रखकर प्राकृतिक अ आवाज़ निकालें।' },
      { letter: 'V', letterCase: 'Vv', soundIpa: '/v/', phonicsName: 'V sound (vvv)', phonicsNameHi: 'व ध्वनि', exampleWord: 'Van', exampleWordHi: 'गाड़ी', phonemes: ['/v/', '/æ/', '/n/'], articulatoryTip: 'Top teeth on bottom lip with buzzing vocal cords.', articulatoryTipHi: 'ऊपरी दांत निचले होंठ पर रखकर कंपन करें।' },
      { letter: 'W', letterCase: 'Ww', soundIpa: '/w/', phonicsName: 'W sound (wuh)', phonicsNameHi: 'व/उ ध्वनि', exampleWord: 'Watch', exampleWordHi: 'घड़ी', phonemes: ['/w/', '/ɒ/', '/tʃ/'], articulatoryTip: 'Pucker lips in small tight circle and open outward.', articulatoryTipHi: 'होठों को गोल सिकोड़कर बाहर खोलें।' },
      { letter: 'X', letterCase: 'Xx', soundIpa: '/ks/', phonicsName: 'X sound (ks)', phonicsNameHi: 'क्स ध्वनि', exampleWord: 'Box', exampleWordHi: 'डिब्बा', phonemes: ['/b/', '/ɒ/', '/k/', '/s/'], articulatoryTip: 'Quickly blend /k/ into /s/.', articulatoryTipHi: 'क और स को मिलाकर क्स बोलें।' },
      { letter: 'Y', letterCase: 'Yy', soundIpa: '/j/', phonicsName: 'Y sound (yuh)', phonicsNameHi: 'य ध्वनि', exampleWord: 'Yak', exampleWordHi: 'याक', phonemes: ['/j/', '/æ/', '/k/'], articulatoryTip: 'Arch tongue against hard palate and release smoothly.', articulatoryTipHi: 'जीभ को तालू के पास ले जाकर य बोलें।' },
      { letter: 'Z', letterCase: 'Zz', soundIpa: '/z/', phonicsName: 'Z sound (zzz)', phonicsNameHi: 'ज़ ध्वनि', exampleWord: 'Zebra', exampleWordHi: 'ज़ेबरा', phonemes: ['/z/', '/e/', '/b/', '/r/', '/ə/'], articulatoryTip: 'Teeth together, hiss with buzzing vocal cords.', articulatoryTipHi: 'दांत मिलाकर मधुमक्खी जैसी ज़्ज़ गूंज करें।' },
    ],
    items: [
      { id: 'l1_apple', word: 'apple', phonemes: ['/æ/', '/p/', '/l/'], phonemeDisplay: ['a', 'pp', 'le'], targetSound: '/æ/', meaning: 'A delicious red or green fruit', meaningHi: 'स्वादिष्ट सेब फल', sentenceExample: 'The red apple is on the table.', sentenceExampleHi: 'लाल सेब मेज पर है।' },
      { id: 'l1_ball', word: 'ball', phonemes: ['/b/', '/ɔː/', '/l/'], phonemeDisplay: ['b', 'a', 'll'], targetSound: '/b/', meaning: 'A round toy for playing games', meaningHi: 'खेलने वाली गेंद', sentenceExample: 'Vihaan kicked the big blue ball.', sentenceExampleHi: 'विहान ने बड़ी नीली गेंद को किक मारी।' },
      { id: 'l1_cat', word: 'cat', phonemes: ['/k/', '/æ/', '/t/'], phonemeDisplay: ['c', 'a', 't'], targetSound: '/k/', meaning: 'A friendly furry pet animal', meaningHi: 'बिल्ली', sentenceExample: 'The cute cat is sitting quietly.', sentenceExampleHi: 'प्यारी बिल्ली शांत बैठी है।' },
      { id: 'l1_dog', word: 'dog', phonemes: ['/d/', '/ɒ/', '/ɡ/'], phonemeDisplay: ['d', 'o', 'g'], targetSound: '/d/', meaning: 'A loyal pet animal', meaningHi: 'कुत्ता', sentenceExample: 'The happy dog wags its tail.', sentenceExampleHi: 'खुश कुत्ता अपनी पूंछ हिलाता है।' },
      { id: 'l1_sun', word: 'sun', phonemes: ['/s/', '/ʌ/', '/n/'], phonemeDisplay: ['s', 'u', 'n'], targetSound: '/s/', meaning: 'The bright star that gives us daylight', meaningHi: 'सूरज', sentenceExample: 'The bright sun shines high in the sky.', sentenceExampleHi: 'सूरज आसमान में चमक रहा है।' },
    ],
  },

  // =========================================================================
  // LEVEL 2 — Short Vowels (a, e, i, o, u)
  // =========================================================================
  {
    levelNumber: 2,
    title: 'Short Vowels',
    titleHi: 'लघु स्वर (Short Vowels)',
    subtitle: 'a /æ/, e /e/, i /ɪ/, o /ɒ/, u /ʌ/',
    subtitleHi: 'ऐ, ए, इ, ऑ, अ ध्वनियाँ',
    icon: '🅰️',
    colorTheme: 'emerald',
    gradient: 'from-emerald-600 to-teal-600',
    description: 'Master the 5 core short vowel sounds that form the foundation of English reading.',
    descriptionHi: '५ मुख्य लघु स्वर ध्वनियों का सटीक उच्चारण और पहचान सीखें।',
    targetPhonemes: ['/æ/', '/e/', '/ɪ/', '/ɒ/', '/ʌ/'],
    items: [
      { id: 'l2_cat', word: 'cat', phonemes: ['/k/', '/æ/', '/t/'], phonemeDisplay: ['c', 'a', 't'], targetSound: '/æ/', meaning: 'Furry pet (Short A)', meaningHi: 'बिल्ली (छोटा ऐ)', sentenceExample: 'The fat cat sat on the mat.', sentenceExampleHi: 'मोटी बिल्ली चटाई पर बैठी।' },
      { id: 'l2_bed', word: 'bed', phonemes: ['/b/', '/e/', '/d/'], phonemeDisplay: ['b', 'e', 'd'], targetSound: '/e/', meaning: 'Place to sleep (Short E)', meaningHi: 'बिस्तर (छोटा ए)', sentenceExample: 'He went to sleep in his warm bed.', sentenceExampleHi: 'वह अपने बिस्तर में सोने गया।' },
      { id: 'l2_sit', word: 'sit', phonemes: ['/s/', '/ɪ/', '/t/'], phonemeDisplay: ['s', 'i', 't'], targetSound: '/ɪ/', meaning: 'Rest on a chair (Short I)', meaningHi: 'बैठना (छोटा इ)', sentenceExample: 'Please sit down on the green chair.', sentenceExampleHi: 'कृपया कुर्सी पर बैठें।' },
      { id: 'l2_hot', word: 'hot', phonemes: ['/h/', '/ɒ/', '/t/'], phonemeDisplay: ['h', 'o', 't'], targetSound: '/ɒ/', meaning: 'High temperature (Short O)', meaningHi: 'गर्म (छोटा ऑ)', sentenceExample: 'The warm soup is very hot.', sentenceExampleHi: 'सूप बहुत गर्म है।' },
      { id: 'l2_sun', word: 'sun', phonemes: ['/s/', '/ʌ/', '/n/'], phonemeDisplay: ['s', 'u', 'n'], targetSound: '/ʌ/', meaning: 'Day star (Short U)', meaningHi: 'सूरज (छोटा अ)', sentenceExample: 'We play happily under the bright sun.', sentenceExampleHi: 'हम सूरज की रोशनी में खेलते हैं।' },
      { id: 'l2_map', word: 'map', phonemes: ['/m/', '/æ/', '/p/'], phonemeDisplay: ['m', 'a', 'p'], targetSound: '/æ/', meaning: 'Drawing of places', meaningHi: 'नक्शा', sentenceExample: 'Look at the map to find the park.', sentenceExampleHi: 'नक्शे में पार्क देखें।' },
      { id: 'l2_pen', word: 'pen', phonemes: ['/p/', '/e/', '/n/'], phonemeDisplay: ['p', 'e', 'n'], targetSound: '/e/', meaning: 'Tool for writing', meaningHi: 'कलम', sentenceExample: 'Write your name with a blue pen.', sentenceExampleHi: 'नीली कलम से नाम लिखें।' },
      { id: 'l2_pig', word: 'pig', phonemes: ['/p/', '/ɪ/', '/ɡ/'], phonemeDisplay: ['p', 'i', 'g'], targetSound: '/ɪ/', meaning: 'Farm animal', meaningHi: 'सुअर', sentenceExample: 'The little pink pig played in mud.', sentenceExampleHi: 'छोटा गुलाबी सुअर कीचड़ में खेला।' },
      { id: 'l2_box', word: 'box', phonemes: ['/b/', '/ɒ/', '/k/', '/s/'], phonemeDisplay: ['b', 'o', 'x'], targetSound: '/ɒ/', meaning: 'Container', meaningHi: 'डिब्बा', sentenceExample: 'Put your toys inside the wooden box.', sentenceExampleHi: 'खिलौने डिब्बे में रखें।' },
      { id: 'l2_cup', word: 'cup', phonemes: ['/k/', '/ʌ/', '/p/'], phonemeDisplay: ['c', 'u', 'p'], targetSound: '/ʌ/', meaning: 'Small drinking container', meaningHi: 'कप', sentenceExample: 'Drink your milk from this clean cup.', sentenceExampleHi: 'इस कप से दूध पिएं।' },
    ],
  },

  // =========================================================================
  // LEVEL 3 — CVC Words & Blending
  // =========================================================================
  {
    levelNumber: 3,
    title: 'CVC Words & Blending',
    titleHi: 'CVC शब्द और ध्वनि जोड़ (Blending)',
    subtitle: 'Consonant + Vowel + Consonant Assembly',
    subtitleHi: 'व्यंजन + स्वर + व्यंजन संयोजन',
    icon: '🧩',
    colorTheme: 'amber',
    gradient: 'from-amber-500 to-orange-600',
    description: 'Learn to blend 3 individual sounds smoothly into whole words (/k/ + /æ/ + /t/ ➔ cat).',
    descriptionHi: 'तीन अलग-अलग ध्वनियों को जोड़कर पूरा शब्द बोलना और पढ़ना सीखें।',
    targetPhonemes: ['/k-æ-t/', '/b-æ-t/', '/m-æ-t/', '/p-e-n/', '/h-e-n/', '/s-ɪ-t/', '/p-ɪ-n/', '/h-ɒ-t/', '/d-ɒ-ɡ/', '/s-ʌ-n/'],
    items: [
      { id: 'l3_cat', word: 'cat', phonemes: ['/k/', '/æ/', '/t/'], phonemeDisplay: ['c', 'a', 't'], targetSound: 'CVC -at', meaning: 'Feline animal', meaningHi: 'बिल्ली', sentenceExample: 'The cat ran after the red ball.', sentenceExampleHi: 'बिल्ली लाल गेंद के पीछे दौड़ी।' },
      { id: 'l3_bat', word: 'bat', phonemes: ['/b/', '/æ/', '/t/'], phonemeDisplay: ['b', 'a', 't'], targetSound: 'CVC -at', meaning: 'Cricket equipment / flying mammal', meaningHi: 'बल्ला / चमगादड़', sentenceExample: 'He swung his wooden bat high.', sentenceExampleHi: 'उसने अपना बल्ला घुमाया।' },
      { id: 'l3_mat', word: 'mat', phonemes: ['/m/', '/æ/', '/t/'], phonemeDisplay: ['m', 'a', 't'], targetSound: 'CVC -at', meaning: 'Floor covering', meaningHi: 'चटाई', sentenceExample: 'Wipe your shoes on the floor mat.', sentenceExampleHi: 'चटाई पर जूते पोंछें।' },
      { id: 'l3_pen', word: 'pen', phonemes: ['/p/', '/e/', '/n/'], phonemeDisplay: ['p', 'e', 'n'], targetSound: 'CVC -en', meaning: 'Writing instrument', meaningHi: 'कलम', sentenceExample: 'She wrote a sweet note with her pen.', sentenceExampleHi: 'उसने कलम से सुंदर संदेश लिखा।' },
      { id: 'l3_hen', word: 'hen', phonemes: ['/h/', '/e/', '/n/'], phonemeDisplay: ['h', 'e', 'n'], targetSound: 'CVC -en', meaning: 'Female chicken', meaningHi: 'मुर्गी', sentenceExample: 'The red hen found five golden grains.', sentenceExampleHi: 'मुर्गी को सोने जैसे दाने मिले।' },
      { id: 'l3_red', word: 'red', phonemes: ['/r/', '/e/', '/d/'], phonemeDisplay: ['r', 'e', 'd'], targetSound: 'CVC -ed', meaning: 'Bright primary color', meaningHi: 'लाल रंग', sentenceExample: 'The red rose smells wonderful.', sentenceExampleHi: 'लाल गुलाब बहुत खुशबूदार है।' },
      { id: 'l3_sit', word: 'sit', phonemes: ['/s/', '/ɪ/', '/t/'], phonemeDisplay: ['s', 'i', 't'], targetSound: 'CVC -it', meaning: 'Be seated', meaningHi: 'बैठना', sentenceExample: 'The children sit together in class.', sentenceExampleHi: 'बच्चे कक्षा में साथ बैठते हैं।' },
      { id: 'l3_pin', word: 'pin', phonemes: ['/p/', '/ɪ/', '/n/'], phonemeDisplay: ['p', 'i', 'n'], targetSound: 'CVC -in', meaning: 'Small metal fastener', meaningHi: 'पिन / सुई', sentenceExample: 'Fasten the paper with a safety pin.', sentenceExampleHi: 'कागज को पिन से जोड़ें।' },
      { id: 'l3_dog', word: 'dog', phonemes: ['/d/', '/ɒ/', '/ɡ/'], phonemeDisplay: ['d', 'o', 'g'], targetSound: 'CVC -og', meaning: 'Canine companion', meaningHi: 'कुत्ता', sentenceExample: 'My friendly dog loves running fast.', sentenceExampleHi: 'मेरा कुत्ता तेज़ दौड़ता है।' },
      { id: 'l3_sun', word: 'sun', phonemes: ['/s/', '/ʌ/', '/n/'], phonemeDisplay: ['s', 'u', 'n'], targetSound: 'CVC -un', meaning: 'Solar star', meaningHi: 'सूरज', sentenceExample: 'The morning sun brings warm light.', sentenceExampleHi: 'सुबह का सूरज रोशनी लाता है।' },
      { id: 'l3_run', word: 'run', phonemes: ['/r/', '/ʌ/', '/n/'], phonemeDisplay: ['r', 'u', 'n'], targetSound: 'CVC -un', meaning: 'Move quickly on foot', meaningHi: 'दौड़ना', sentenceExample: 'Run fast to catch the school bus.', sentenceExampleHi: 'बस पकड़ने के लिए तेज़ दौड़ें।' },
    ],
  },

  // =========================================================================
  // LEVEL 4 — Word Families (Rhyming Rimes)
  // =========================================================================
  {
    levelNumber: 4,
    title: 'Word Families',
    titleHi: 'शब्द परिवार (Word Families)',
    subtitle: '-at, -an, -ap, -et, -en, -ig, -ip, -og, -op, -un',
    subtitleHi: 'समान ध्वनि वाले तुकबंदी शब्द समूह',
    icon: '👨‍👩‍👧',
    colorTheme: 'cyan',
    gradient: 'from-cyan-600 to-blue-600',
    description: 'Recognize common rhyming patterns to read dozens of new words effortlessly.',
    descriptionHi: 'तुकबंदी वाले शब्द परिवारों को पहचानकर तेजी से नए शब्द पढ़ना सीखें।',
    targetPhonemes: ['-at', '-an', '-ap', '-et', '-en', '-ig', '-ip', '-og', '-op', '-un'],
    items: [
      { id: 'l4_rat', word: 'rat', phonemes: ['/r/', '/æ/', '/t/'], phonemeDisplay: ['r', 'at'], targetSound: '-at family', meaning: 'Small rodent', meaningHi: 'चूहा', sentenceExample: 'The quick rat ran into the hole.', sentenceExampleHi: 'चूहा बिल में भाग गया।' },
      { id: 'l4_hat', word: 'hat', phonemes: ['/h/', '/æ/', '/t/'], phonemeDisplay: ['h', 'at'], targetSound: '-at family', meaning: 'Head covering', meaningHi: 'टोपी', sentenceExample: 'He wore a wide straw hat.', sentenceExampleHi: 'उसने घास की टोपी पहनी।' },
      { id: 'l4_fan', word: 'fan', phonemes: ['/f/', '/æ/', '/n/'], phonemeDisplay: ['f', 'an'], targetSound: '-an family', meaning: 'Cooling device', meaningHi: 'पंखा', sentenceExample: 'Turn on the fan for cool air.', sentenceExampleHi: 'ठंडी हवा के लिए पंखा चलाएं।' },
      { id: 'l4_can', word: 'can', phonemes: ['/k/', '/æ/', '/n/'], phonemeDisplay: ['c', 'an'], targetSound: '-an family', meaning: 'Metal tin / ability', meaningHi: 'डिब्बा / सकना', sentenceExample: 'I can read this whole page clearly.', sentenceExampleHi: 'मैं यह पूरा पृष्ठ पढ़ सकता हूँ।' },
      { id: 'l4_cap', word: 'cap', phonemes: ['/k/', '/æ/', '/p/'], phonemeDisplay: ['c', 'ap'], targetSound: '-ap family', meaning: 'Sports hat', meaningHi: 'कैप / टोपी', sentenceExample: 'Put on your blue baseball cap.', sentenceExampleHi: 'अपनी नीली टोपी पहनें।' },
      { id: 'l4_net', word: 'net', phonemes: ['/n/', '/e/', '/t/'], phonemeDisplay: ['n', 'et'], targetSound: '-et family', meaning: 'Mesh fabric for catching', meaningHi: 'जाल', sentenceExample: 'The fisherman cast his strong net.', sentenceExampleHi: 'मछुआरे ने अपना जाल फेंका।' },
      { id: 'l4_wet', word: 'wet', phonemes: ['/w/', '/e/', '/t/'], phonemeDisplay: ['w', 'et'], targetSound: '-et family', meaning: 'Covered with water', meaningHi: 'गीला', sentenceExample: 'The green grass is wet with morning dew.', sentenceExampleHi: 'घास ओस से गीली है।' },
      { id: 'l4_pig', word: 'pig', phonemes: ['/p/', '/ɪ/', '/ɡ/'], phonemeDisplay: ['p', 'ig'], targetSound: '-ig family', meaning: 'Farm animal', meaningHi: 'सुअर', sentenceExample: 'The happy pig rested in the pen.', sentenceExampleHi: 'सुअर बाड़े में आराम कर रहा था।' },
      { id: 'l4_big', word: 'big', phonemes: ['/b/', '/ɪ/', '/ɡ/'], phonemeDisplay: ['b', 'ig'], targetSound: '-ig family', meaning: 'Large size', meaningHi: 'बड़ा', sentenceExample: 'An elephant is a big gentle animal.', sentenceExampleHi: 'हाथी एक बड़ा जानवर है।' },
      { id: 'l4_lip', word: 'lip', phonemes: ['/l/', '/ɪ/', '/p/'], phonemeDisplay: ['l', 'ip'], targetSound: '-ip family', meaning: 'Edge of mouth', meaningHi: 'होंठ', sentenceExample: 'She smiled with a curve on her lip.', sentenceExampleHi: 'उसने मुस्कुराते हुए देखा।' },
      { id: 'l4_top', word: 'top', phonemes: ['/t/', '/ɒ/', '/p/'], phonemeDisplay: ['t', 'op'], targetSound: '-op family', meaning: 'Highest point / spinning toy', meaningHi: 'शिखर / लट्टू', sentenceExample: 'The colorful top spun on the floor.', sentenceExampleHi: 'रंगीन लट्टू फर्श पर घूमा।' },
      { id: 'l4_hop', word: 'hop', phonemes: ['/h/', '/ɒ/', '/p/'], phonemeDisplay: ['h', 'op'], targetSound: '-op family', meaning: 'Jump on one foot', meaningHi: 'कूदना', sentenceExample: 'Rabbits hop gently across the grass.', sentenceExampleHi: 'खरगोश घास पर कूदते हैं।' },
      { id: 'l4_fun', word: 'fun', phonemes: ['/f/', '/ʌ/', '/n/'], phonemeDisplay: ['f', 'un'], targetSound: '-un family', meaning: 'Enjoyment and play', meaningHi: 'मज़ा / आनंद', sentenceExample: 'Reading stories together is great fun.', sentenceExampleHi: 'कहानियां पढ़ना बहुत मजेदार है।' },
    ],
  },

  // =========================================================================
  // LEVEL 5 — Digraphs (sh, ch, th, wh, ph, ck, ng, qu)
  // =========================================================================
  {
    levelNumber: 5,
    title: 'Digraphs (Two Letters, One Sound)',
    titleHi: 'द्विवर्ण ध्वनियाँ (Digraphs)',
    subtitle: 'sh, ch, th, wh, ph, ck, ng, qu',
    subtitleHi: 'दो अक्षर मिलकर बनी एक विशेष आवाज़',
    icon: '👥',
    colorTheme: 'purple',
    gradient: 'from-purple-600 to-indigo-600',
    description: 'Learn two letters that join together to create a single unique sound (sh, ch, th, etc.).',
    descriptionHi: 'दो अक्षरों के मेल से बनने वाली संयुक्त ध्वनियों को शुद्ध रूप से बोलना सीखें।',
    targetPhonemes: ['/ʃ/', '/tʃ/', '/θ/', '/ð/', '/w/', '/f/', '/k/', '/ŋ/', '/kw/'],
    items: [
      { id: 'l5_ship', word: 'ship', phonemes: ['/ʃ/', '/ɪ/', '/p/'], phonemeDisplay: ['sh', 'i', 'p'], targetSound: 'sh /ʃ/', meaning: 'Large sea boat', meaningHi: 'बड़ा समुद्री जहाज', sentenceExample: 'The white ship sailed across blue ocean.', sentenceExampleHi: 'जहाज नीले समंदर में रवाना हुआ।' },
      { id: 'l5_chip', word: 'chip', phonemes: ['/tʃ/', '/ɪ/', '/p/'], phonemeDisplay: ['ch', 'i', 'p'], targetSound: 'ch /tʃ/', meaning: 'Crisp slice of potato / piece', meaningHi: 'टुकड़ा / चिप्स', sentenceExample: 'He ate a crunchy potato chip.', sentenceExampleHi: 'उसने कुरकुरी चिप खाई।' },
      { id: 'l5_thin', word: 'thin', phonemes: ['/θ/', '/ɪ/', '/n/'], phonemeDisplay: ['th', 'i', 'n'], targetSound: 'th /θ/', meaning: 'Not thick, slender', meaningHi: 'पतला', sentenceExample: 'The book has a thin blue cover.', sentenceExampleHi: 'किताब का कवर पतला है।' },
      { id: 'l5_this', word: 'this', phonemes: ['/ð/', '/ɪ/', '/s/'], phonemeDisplay: ['th', 'i', 's'], targetSound: 'th /ð/', meaning: 'Specific thing close by', meaningHi: 'यह', sentenceExample: 'This is my favorite bedtime story.', sentenceExampleHi: 'यह मेरी पसंदीदा कहानी है।' },
      { id: 'l5_when', word: 'when', phonemes: ['/w/', '/e/', '/n/'], phonemeDisplay: ['wh', 'e', 'n'], targetSound: 'wh /w/', meaning: 'At what time', meaningHi: 'कब / जब', sentenceExample: 'When the bell rings, recess starts.', sentenceExampleHi: 'जब घंटी बजती है, अवकाश शुरू होता है।' },
      { id: 'l5_phone', word: 'phone', phonemes: ['/f/', '/oʊ/', '/n/'], phonemeDisplay: ['ph', 'o', 'ne'], targetSound: 'ph /f/', meaning: 'Telephone communication device', meaningHi: 'फ़ोन', sentenceExample: 'Mother spoke softly on the mobile phone.', sentenceExampleHi: 'माँ ने फ़ोन पर बात की।' },
      { id: 'l5_duck', word: 'duck', phonemes: ['/d/', '/ʌ/', '/k/'], phonemeDisplay: ['d', 'u', 'ck'], targetSound: 'ck /k/', meaning: 'Water bird that quacks', meaningHi: 'बतख', sentenceExample: 'The yellow duck swims in the pond.', sentenceExampleHi: 'पीली बतख तालाब में तैरती है।' },
      { id: 'l5_ring', word: 'ring', phonemes: ['/r/', '/ɪ/', '/ŋ/'], phonemeDisplay: ['r', 'i', 'ng'], targetSound: 'ng /ŋ/', meaning: 'Circular band / bell chime', meaningHi: 'अंगूठी / घंटी बजना', sentenceExample: 'Hear the school bell ring loudly.', sentenceExampleHi: 'स्कूल की घंटी जोर से बजी।' },
      { id: 'l5_queen', word: 'queen', phonemes: ['/k/', '/w/', '/iː/', '/n/'], phonemeDisplay: ['qu', 'ee', 'n'], targetSound: 'qu /kw/', meaning: 'Royal female monarch', meaningHi: 'रानी', sentenceExample: 'The kind queen wore a sparkling crown.', sentenceExampleHi: 'रानी ने चमकता मुकुट पहना।' },
      { id: 'l5_fish', word: 'fish', phonemes: ['/f/', '/ɪ/', '/ʃ/'], phonemeDisplay: ['f', 'i', 'sh'], targetSound: 'sh /ʃ/ (final)', meaning: 'Aquatic swimming animal', meaningHi: 'मछली', sentenceExample: 'Silver fish swim smoothly in the river.', sentenceExampleHi: 'चांदी जैसी मछली नदी में तैरती है।' },
    ],
  },

  // =========================================================================
  // LEVEL 6 — Consonant Blends (bl, cl, fl, br, cr, st, sp, etc.)
  // =========================================================================
  {
    levelNumber: 6,
    title: 'Consonant Blends',
    titleHi: 'व्यंजन गुच्छ (Consonant Blends)',
    subtitle: 'bl, cl, fl, br, cr, dr, tr, st, sp, sw',
    subtitleHi: 'दो व्यंजनों का एक साथ सुगम प्रवाह',
    icon: '🌪️',
    colorTheme: 'blue',
    gradient: 'from-blue-600 to-cyan-600',
    description: 'Master beginning and ending consonant clusters where each letter sound is heard in harmony.',
    descriptionHi: 'दो व्यंजनों के समूह को एक साथ बिना रुकावट स्पष्ट बोलना सीखें।',
    targetPhonemes: ['bl-', 'cl-', 'fl-', 'br-', 'cr-', 'dr-', 'tr-', 'st-', 'sp-', 'sw-'],
    items: [
      { id: 'l6_black', word: 'black', phonemes: ['/b/', '/l/', '/æ/', '/k/'], phonemeDisplay: ['bl', 'a', 'ck'], targetSound: 'bl- blend', meaning: 'Dark color', meaningHi: 'काला रंग', sentenceExample: 'The black cat rested on the wall.', sentenceExampleHi: 'काली बिल्ली दीवार पर बैठी।' },
      { id: 'l6_clap', word: 'clap', phonemes: ['/k/', '/l/', '/æ/', '/p/'], phonemeDisplay: ['cl', 'a', 'p'], targetSound: 'cl- blend', meaning: 'Strike hands together', meaningHi: 'ताली बजाना', sentenceExample: 'Clap your hands with the joyful rhythm.', sentenceExampleHi: 'ताल के साथ ताली बजाएं।' },
      { id: 'l6_flag', word: 'flag', phonemes: ['/f/', '/l/', '/æ/', '/ɡ/'], phonemeDisplay: ['fl', 'a', 'g'], targetSound: 'fl- blend', meaning: 'Cloth national emblem', meaningHi: 'झंडा / ध्वज', sentenceExample: 'Our colorful flag flutters in the breeze.', sentenceExampleHi: 'हमारा झंडा हवा में लहराता है।' },
      { id: 'l6_brown', word: 'brown', phonemes: ['/b/', '/r/', '/aʊ/', '/n/'], phonemeDisplay: ['br', 'ow', 'n'], targetSound: 'br- blend', meaning: 'Earth tone color', meaningHi: 'भूरा रंग', sentenceExample: 'The brown dog ran across the garden.', sentenceExampleHi: 'भूरा कुत्ता बगीचे में दौड़ा।' },
      { id: 'l6_crab', word: 'crab', phonemes: ['/k/', '/r/', '/æ/', '/b/'], phonemeDisplay: ['cr', 'a', 'b'], targetSound: 'cr- blend', meaning: 'Sea creature with claws', meaningHi: 'केकड़ा', sentenceExample: 'A small crab walked sideways on sand.', sentenceExampleHi: 'छोटा केकड़ा रेत पर चला।' },
      { id: 'l6_drum', word: 'drum', phonemes: ['/d/', '/r/', '/ʌ/', '/m/'], phonemeDisplay: ['dr', 'u', 'm'], targetSound: 'dr- blend', meaning: 'Percussion instrument', meaningHi: 'ढोल / ड्रम', sentenceExample: 'Beat the drum with steady energy.', sentenceExampleHi: 'ऊर्जा के साथ ड्रम बजाएं।' },
      { id: 'l6_frog', word: 'frog', phonemes: ['/f/', '/r/', '/ɒ/', '/ɡ/'], phonemeDisplay: ['fr', 'o', 'g'], targetSound: 'fr- blend', meaning: 'Amphibian that leaps', meaningHi: 'मेंढक', sentenceExample: 'The green frog hopped onto a lily pad.', sentenceExampleHi: 'हरा मेंढक कमल के पत्ते पर कूदा।' },
      { id: 'l6_tree', word: 'tree', phonemes: ['/t/', '/r/', '/iː/'], phonemeDisplay: ['tr', 'ee'], targetSound: 'tr- blend', meaning: 'Woody perennial plant', meaningHi: 'पेड़ / वृक्ष', sentenceExample: 'Birds built a nest in the tall oak tree.', sentenceExampleHi: 'पक्षियों ने ऊंचे पेड़ पर घोंसला बनाया।' },
      { id: 'l6_stop', word: 'stop', phonemes: ['/s/', '/t/', '/ɒ/', '/p/'], phonemeDisplay: ['st', 'o', 'p'], targetSound: 'st- blend', meaning: 'Cease movement', meaningHi: 'रुकना', sentenceExample: 'Stop at the red light before crossing.', sentenceExampleHi: 'पार करने से पहले लाल बत्ती पर रुकें।' },
      { id: 'l6_swim', word: 'swim', phonemes: ['/s/', '/w/', '/ɪ/', '/m/'], phonemeDisplay: ['sw', 'i', 'm'], targetSound: 'sw- blend', meaning: 'Move through water', meaningHi: 'तैरना', sentenceExample: 'Dolphins swim gracefully in the ocean.', sentenceExampleHi: 'डॉल्फ़िन समुद्र में खूबसूरती से तैरती हैं।' },
    ],
  },

  // =========================================================================
  // LEVEL 7 — Long Vowels (Silent-E & Vowel Teams)
  // =========================================================================
  {
    levelNumber: 7,
    title: 'Long Vowels (Silent-E & Teams)',
    titleHi: 'दीर्घ स्वर (Silent-E एवं Vowel Teams)',
    subtitle: 'Silent-E (cap➔cape) & Vowel Teams (ai, ee, ea, oa, oo)',
    subtitleHi: 'जादुई E और संयुक्त स्वर जोड़ियाँ',
    icon: '🪄',
    colorTheme: 'rose',
    gradient: 'from-rose-600 to-pink-600',
    description: 'Learn how silent-E turns short vowels long, and how vowel teams work together (ai, ee, oa).',
    descriptionHi: 'सीखें कि कैसे जादुई E और स्वरों की जोड़ियाँ मिलकर दीर्घ स्वर बनाती हैं।',
    targetPhonemes: ['/eɪ/', '/iː/', '/aɪ/', '/oʊ/', '/uː/'],
    items: [
      { id: 'l7_cape', word: 'cape', phonemes: ['/k/', '/eɪ/', '/p/'], phonemeDisplay: ['c', 'a', 'p', 'e'], targetSound: 'a_e /eɪ/', meaning: 'Sleeveless cloak (cap ➔ cape)', meaningHi: 'केप / चोगा', sentenceExample: 'The superhero flew with his red cape.', sentenceExampleHi: 'सुपरहीरो लाल केप के साथ उड़ा।', contrastWord: 'cap', contrastTip: 'Silent E makes /æ/ into long /eɪ/ (cap ➔ cape).' },
      { id: 'l7_tape', word: 'tape', phonemes: ['/t/', '/eɪ/', '/p/'], phonemeDisplay: ['t', 'a', 'p', 'e'], targetSound: 'a_e /eɪ/', meaning: 'Sticky adhesive strip (tap ➔ tape)', meaningHi: 'टेप', sentenceExample: 'Stick the chart with clear tape.', sentenceExampleHi: 'चार्ट को टेप से चिपकाएं।' },
      { id: 'l7_kite', word: 'kite', phonemes: ['/k/', '/aɪ/', '/t/'], phonemeDisplay: ['k', 'i', 't', 'e'], targetSound: 'i_e /aɪ/', meaning: 'Flying toy (kit ➔ kite)', meaningHi: 'पतंग', sentenceExample: 'The colorful kite flew high in the wind.', sentenceExampleHi: 'रंगीन पतंग हवा में ऊंची उड़ी।' },
      { id: 'l7_hope', word: 'hope', phonemes: ['/h/', '/oʊ/', '/p/'], phonemeDisplay: ['h', 'o', 'p', 'e'], targetSound: 'o_e /oʊ/', meaning: 'Optimistic wish (hop ➔ hope)', meaningHi: 'आशा / उम्मीद', sentenceExample: 'We hope for bright sunny weather tomorrow.', sentenceExampleHi: 'हम कल अच्छे मौसम की उम्मीद करते हैं।' },
      { id: 'l7_rain', word: 'rain', phonemes: ['/r/', '/eɪ/', '/n/'], phonemeDisplay: ['r', 'ai', 'n'], targetSound: 'ai /eɪ/', meaning: 'Water droplets from clouds', meaningHi: 'बारिश / वर्षा', sentenceExample: 'Gentle rain watered the green garden.', sentenceExampleHi: 'हल्की बारिश ने बगीचे को सींचा।' },
      { id: 'l7_play', word: 'play', phonemes: ['/p/', '/l/', '/eɪ/'], phonemeDisplay: ['pl', 'ay'], targetSound: 'ay /eɪ/', meaning: 'Engage in games for fun', meaningHi: 'खेलना', sentenceExample: 'Children play happily in the open park.', sentenceExampleHi: 'बच्चे पार्क में खेलते हैं।' },
      { id: 'l7_leaf', word: 'leaf', phonemes: ['/l/', '/iː/', '/f/'], phonemeDisplay: ['l', 'ea', 'f'], targetSound: 'ea /iː/', meaning: 'Green part of a plant', meaningHi: 'पत्ती / पत्ता', sentenceExample: 'A fresh green leaf fell from the branch.', sentenceExampleHi: 'शाखा से एक हरा पत्ता गिरा।' },
      { id: 'l7_boat', word: 'boat', phonemes: ['/b/', '/oʊ/', '/t/'], phonemeDisplay: ['b', 'oa', 't'], targetSound: 'oa /oʊ/', meaning: 'Water vessel', meaningHi: 'नाव / नौका', sentenceExample: 'The wooden boat floated across the lake.', sentenceExampleHi: 'लकड़ी की नाव झील में तैरी।' },
      { id: 'l7_moon', word: 'moon', phonemes: ['/m/', '/uː/', '/n/'], phonemeDisplay: ['m', 'oo', 'n'], targetSound: 'oo /uː/', meaning: 'Earth natural satellite', meaningHi: 'चाँद / चंद्रमा', sentenceExample: 'The full moon lit up the midnight sky.', sentenceExampleHi: 'पूर्णिमा के चाँद ने रात को चमका दिया।' },
    ],
  },

  // =========================================================================
  // LEVEL 8 — R-Controlled Vowels (Bossy R)
  // =========================================================================
  {
    levelNumber: 8,
    title: 'R-Controlled Vowels (Bossy R)',
    titleHi: 'R-नियंत्रित स्वर (Bossy R)',
    subtitle: 'ar, or, er, ir, ur',
    subtitleHi: 'जब R स्वर की आवाज़ बदल देता है',
    icon: '👑',
    colorTheme: 'amber',
    gradient: 'from-amber-600 to-red-600',
    description: 'Learn how letter R changes the vowel sound before it (car, corn, bird, turn).',
    descriptionHi: 'सीखें कि कैसे R अक्षर अपने पहले आने वाले स्वर का रूप बदल देता है।',
    targetPhonemes: ['/ɑːr/', '/ɔːr/', '/ɜːr/'],
    items: [
      { id: 'l8_car', word: 'car', phonemes: ['/k/', '/ɑːr/'], phonemeDisplay: ['c', 'ar'], targetSound: 'ar /ɑːr/', meaning: 'Motor vehicle', meaningHi: 'गाड़ी / कार', sentenceExample: 'Father parked the blue car in front of home.', sentenceExampleHi: 'पिताजी ने कार घर के सामने पार्क की।' },
      { id: 'l8_star', word: 'star', phonemes: ['/s/', '/t/', '/ɑːr/'], phonemeDisplay: ['st', 'ar'], targetSound: 'ar /ɑːr/', meaning: 'Luminous point in night sky', meaningHi: 'तारा / सितारा', sentenceExample: 'The evening star glows clearly in the west.', sentenceExampleHi: 'शाम का तारा पश्चिम में चमकता है।' },
      { id: 'l8_corn', word: 'corn', phonemes: ['/k/', '/ɔːr/', '/n/'], phonemeDisplay: ['c', 'or', 'n'], targetSound: 'or /ɔːr/', meaning: 'Golden cereal grain', meaningHi: 'मक्का / भुट्टा', sentenceExample: 'Sweet golden corn grows tall on the farm.', sentenceExampleHi: 'खेत में मक्का लहलहाता है।' },
      { id: 'l8_bird', word: 'bird', phonemes: ['/b/', '/ɜːr/', '/d/'], phonemeDisplay: ['b', 'ir', 'd'], targetSound: 'ir /ɜːr/', meaning: 'Feathered creature with wings', meaningHi: 'पक्षी / चिड़िया', sentenceExample: 'A blue bird sang a sweet morning song.', sentenceExampleHi: 'नीली चिड़िया ने मधुर सुबह का गीत गाया।' },
      { id: 'l8_turn', word: 'turn', phonemes: ['/t/', '/ɜːr/', '/n/'], phonemeDisplay: ['t', 'ur', 'n'], targetSound: 'ur /ɜːr/', meaning: 'Rotate / chance in game', meaningHi: 'मोड़ना / बारी', sentenceExample: 'It is your turn to roll the game dice.', sentenceExampleHi: 'अब पासा फेंकने की आपकी बारी है।' },
      { id: 'l8_her', word: 'her', phonemes: ['/h/', '/ɜːr/'], phonemeDisplay: ['h', 'er'], targetSound: 'er /ɜːr/', meaning: 'Belonging to a female', meaningHi: 'उसका / उसकी', sentenceExample: 'She brought her favorite storybook to school.', sentenceExampleHi: 'वह अपनी पसंदीदा किताब स्कूल लाई।' },
    ],
  },

  // =========================================================================
  // LEVEL 9 — Advanced & Silent Letter Patterns
  // =========================================================================
  {
    levelNumber: 9,
    title: 'Advanced & Silent Patterns',
    titleHi: 'उन्नत एवं मौन वर्ण पैटर्न (Advanced Patterns)',
    subtitle: 'tion, sion, dge, tch, igh, kn, wr, mb',
    subtitleHi: 'विशेष प्रत्यय और साइलेंट अक्षर',
    icon: '🔮',
    colorTheme: 'violet',
    gradient: 'from-violet-600 to-purple-800',
    description: 'Master silent letters (kn, wr, mb) and advanced endings (tion, ture, dge, igh).',
    descriptionHi: 'मौन अक्षरों (Silent Letters) और उन्नत शब्दों को सहजता से पढ़ना सीखें।',
    targetPhonemes: ['-tion', '-sion', '-ture', '-dge', '-tch', '-igh-', 'kn-', 'wr-', '-mb'],
    items: [
      { id: 'l9_night', word: 'night', phonemes: ['/n/', '/aɪ/', '/t/'], phonemeDisplay: ['n', 'igh', 't'], targetSound: 'igh /aɪ/', meaning: 'Time between sunset and sunrise', meaningHi: 'रात', sentenceExample: 'Stars sparkle brightly during the clear night.', sentenceExampleHi: 'साफ रात में तारे चमकते हैं।' },
      { id: 'l9_bridge', word: 'bridge', phonemes: ['/b/', '/r/', '/ɪ/', '/dʒ/'], phonemeDisplay: ['br', 'i', 'dge'], targetSound: 'dge /dʒ/', meaning: 'Structure spanning river/road', meaningHi: 'पुल / सेतु', sentenceExample: 'The stone bridge crossed over the river.', sentenceExampleHi: 'पत्थर का पुल नदी के ऊपर था।' },
      { id: 'l9_catch', word: 'catch', phonemes: ['/k/', '/æ/', '/tʃ/'], phonemeDisplay: ['c', 'a', 'tch'], targetSound: 'tch /tʃ/', meaning: 'Capture flying ball', meaningHi: 'पकड़ना', sentenceExample: 'Reach your hands out to catch the ball.', sentenceExampleHi: 'गेंद पकड़ने के लिए हाथ आगे बढ़ाएं।' },
      { id: 'l9_write', word: 'write', phonemes: ['/r/', '/aɪ/', '/t/'], phonemeDisplay: ['wr', 'i', 't', 'e'], targetSound: 'wr /r/ (silent W)', meaning: 'Compose text on paper', meaningHi: 'लिखना (W मौन)', sentenceExample: 'Write a neat paragraph in your notebook.', sentenceExampleHi: 'अपनी कॉपी में सुंदर पैराग्राफ लिखें।' },
      { id: 'l9_knee', word: 'knee', phonemes: ['/n/', '/iː/'], phonemeDisplay: ['kn', 'ee'], targetSound: 'kn /n/ (silent K)', meaning: 'Joint between thigh and lower leg', meaningHi: 'घुटना (K मौन)', sentenceExample: 'He bent his knee to tie his shoelace.', sentenceExampleHi: 'उसने फीते बांधने के लिए घुटना मोड़ा।' },
      { id: 'l9_action', word: 'action', phonemes: ['/æ/', '/k/', '/ʃ/', '/ən/'], phonemeDisplay: ['a', 'c', 'tion'], targetSound: 'tion /ʃən/', meaning: 'Process of doing something', meaningHi: 'कार्य / एक्शन', sentenceExample: 'Take helpful action to protect nature.', sentenceExampleHi: 'प्रकृति की रक्षा के लिए काम करें।' },
      { id: 'l9_picture', word: 'picture', phonemes: ['/p/', '/ɪ/', '/k/', '/tʃ/', '/ər/'], phonemeDisplay: ['p', 'i', 'c', 'ture'], targetSound: 'ture /tʃər/', meaning: 'Visual drawing or painting', meaningHi: 'चित्र / तस्वीर', sentenceExample: 'She painted a colorful picture of mountains.', sentenceExampleHi: 'उसने पहाड़ों का रंगीन चित्र बनाया।' },
    ],
  },

  // =========================================================================
  // LEVEL 10 — Real Reading & Passage Mastery
  // =========================================================================
  {
    levelNumber: 10,
    title: 'Real Reading Mastery',
    titleHi: 'संपूर्ण वाचन दक्षता (Real Reading)',
    subtitle: 'Phrases ➔ Sentences ➔ Fluent Story Passages',
    subtitleHi: 'वाक्यांश ➔ वाक्य ➔ धाराप्रवाह कहानी वाचन',
    icon: '📚',
    colorTheme: 'indigo',
    gradient: 'from-indigo-700 via-purple-700 to-cyan-600',
    description: 'Synthesize all 9 phonics levels to read full passages with high clarity, rhythm, and confidence.',
    descriptionHi: 'सभी ९ स्तरों को मिलाकर आत्मविश्वास और स्पष्टता के साथ पूरे पाठ पढ़ें।',
    targetPhonemes: ['Full Passage Synthesis', 'Connected Speech', 'Rhythm & Prosody'],
    passages: [
      {
        id: 'l10_passage_1',
        title: 'The Cat and the Red Hat',
        titleHi: 'बिल्ली और लाल टोपी',
        level: 10,
        wordCount: 32,
        targetFocus: 'Short Vowels & Digraphs',
        text: 'The little cat sat on a soft mat. She saw a red hat on the wooden deck. When she jumped high, she caught the hat and purred with joy.',
        textHi: 'छोटी बिल्ली मुलायम चटाई पर बैठी थी। उसने लकड़ी के डेक पर एक लाल टोपी देखी। जब वह ऊंची कूदी, उसने टोपी पकड़ ली और खुशी से म्याऊं किया।',
        sentences: [
          'The little cat sat on a soft mat.',
          'She saw a red hat on the wooden deck.',
          'When she jumped high, she caught the hat and purred with joy.'
        ]
      },
      {
        id: 'l10_passage_2',
        title: 'The Ship at Sunrise',
        titleHi: 'सूर्योदय पर जहाज',
        level: 10,
        wordCount: 42,
        targetFocus: 'Blends, Digraphs & Long Vowels',
        text: 'A grand white ship sailed across the calm blue sea. As the bright golden sun rose in the morning sky, sea birds flew close to the mast and sang a cheerful song.',
        textHi: 'एक भव्य सफेद जहाज शांत नीले समुद्र में रवाना हुआ। जैसे ही सुबह के आसमान में सुनहरा सूरज निकला, समुद्री पक्षी मस्तूल के पास उड़े और मधुर गीत गाया।',
        sentences: [
          'A grand white ship sailed across the calm blue sea.',
          'As the bright golden sun rose in the morning sky, sea birds flew close to the mast and sang a cheerful song.'
        ]
      }
    ],
    items: [
      { id: 'l10_story_word_1', word: 'joyful', phonemes: ['/dʒ/', '/ɔɪ/', '/f/', '/əl/'], phonemeDisplay: ['j', 'oy', 'ful'], targetSound: 'Connected Speech', meaning: 'Full of happiness', meaningHi: 'आनंदपूर्ण', sentenceExample: 'Reading fluently is a joyful experience.', sentenceExampleHi: 'धाराप्रवाह पढ़ना एक आनंददायक अनुभव है।' },
      { id: 'l10_story_word_2', word: 'brightly', phonemes: ['/b/', '/r/', '/aɪ/', '/t/', '/l/', '/i/'], phonemeDisplay: ['br', 'igh', 't', 'ly'], targetSound: 'Connected Speech', meaning: 'With vivid light', meaningHi: 'चमकदारी से', sentenceExample: 'The stars shine brightly in the night.', sentenceExampleHi: 'रात में तारे चमकते हैं।' }
    ]
  }
];

export function getPhonicsLevelByNumber(lvlNum: number): PhonicsLevelDef | undefined {
  return PHONICS_10_LEVELS_DATABASE.find(l => l.levelNumber === lvlNum);
}
