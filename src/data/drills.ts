import { SoundDrillConfig } from '../types';

export const DRILLS_DATABASE: SoundDrillConfig[] = [
  // --- ENGLISH DRILLS ---
  {
    sound: 'r',
    language: 'en',
    title: 'The Rolling "R" Sound',
    tip: 'Curl your tongue gently backwards without touching the roof of your mouth. Let your vocal cords hum smoothly!',
    words: ['Rabbit', 'River', 'Rainbow', 'Rocket', 'Forest', 'Bright', 'Brave', 'Strong', 'Crown', 'Mirror'],
    tongueTwister: 'Round the rugged rock the ragged rascal ran.',
    tongueTwisterSyllables: 'Round the rug-ged rock the rag-ged ras-cal ran.'
  },
  {
    sound: 'sh',
    language: 'en',
    title: 'The Whispering "SH" Sound',
    tip: 'Push your lips forward like a gentle trumpet, teeth close together, and blow a quiet stream of warm air.',
    words: ['Ship', 'Shell', 'Shadow', 'Shine', 'Ocean', 'Wishing', 'Flash', 'Crush', 'Special', 'Mushroom'],
    tongueTwister: 'She sells seashells by the sunny seashore.',
    tongueTwisterSyllables: 'She sells sea-shells by the sun-ny sea-shore.'
  },
  {
    sound: 'th',
    language: 'en',
    title: 'The Feather "TH" Sound',
    tip: 'Place the tip of your tongue lightly between your top and bottom front teeth and blow a soft breath.',
    words: ['Think', 'Thunder', 'Thousand', 'Three', 'Feather', 'Path', 'Earth', 'Truth', 'Brother', 'Breathe'],
    tongueTwister: 'Thirty-three thirsty thinkers thought thrilling thoughts.',
    tongueTwisterSyllables: 'Thir-ty three thir-sty think-ers thought thril-ling thoughts.'
  },
  {
    sound: 'l',
    language: 'en',
    title: 'The Singing "L" Sound',
    tip: 'Tap the tip of your tongue right against the bumpy ridge behind your upper front teeth. Let sound escape around the sides.',
    words: ['Lion', 'Light', 'Yellow', 'Candle', 'Cloud', 'Silver', 'Little', 'Smile', 'Glory', 'Travel'],
    tongueTwister: 'Lucky little Lily loves lovely yellow lemon drops.',
    tongueTwisterSyllables: 'Luck-y lit-tle Li-ly loves love-ly yel-low le-mon drops.'
  },
  {
    sound: 's',
    language: 'en',
    title: 'The Crisp "S" Sound',
    tip: 'Keep your tongue resting right behind your lower front teeth, smile gently, and blow a high crisp stream of air.',
    words: ['Sun', 'Silver', 'Star', 'Sweet', 'Castle', 'Grass', 'Passage', 'Listen', 'Spider', 'Spring'],
    tongueTwister: 'Six silly swans swam swiftly southwards.',
    tongueTwisterSyllables: 'Six sil-ly swans swam swift-ly south-wards.'
  },
  {
    sound: 'ch',
    language: 'en',
    title: 'The Popping "CH" Sound',
    tip: 'Start with your tongue like a "T", then quickly release into a "SH" burst like a little train engine chug!',
    words: ['Chair', 'Cheer', 'Champion', 'Chocolate', 'Teacher', 'Kitchen', 'Catch', 'Beach', 'Match', 'Nature'],
    tongueTwister: 'Chester cheetah chews a chunk of cheap cheddar cheese.',
    tongueTwisterSyllables: 'Ches-ter chee-tah chews a chunk of cheap ched-dar cheese.'
  },

  // --- HINDI DRILLS ---
  {
    sound: 'र',
    language: 'hi',
    title: 'तरंगित "र" ध्वनि (R Sound)',
    tip: 'जीभ की नोक को ऊपर के मसूड़े के पास ले जाएँ और कंपन (वाइब्रेशन) के साथ हवा निकालें।',
    words: ['रात', 'रंग', 'सूरज', 'तारा', 'भारत', 'मोर', 'किरण', 'सरोवर', 'वीर', 'धरती'],
    tongueTwister: 'खड़क सिंह के खड़कने से खड़कती हैं खिड़कियां, खिड़कियों के खड़कने से खड़कता है खड़क सिंह।',
    tongueTwisterSyllables: 'ख-ड़क सिं-ह के ख-ड़क-ने से ख-ड़क-ती हैं खि-ड़-कि-यां'
  },
  {
    sound: 'श',
    language: 'hi',
    title: 'मधुर "श" और "ष" ध्वनि (SH Sound)',
    tip: 'होंठों को हल्का गोल करें और तालू से हल्की सीटी जैसी हवा बाहर निकलने दें।',
    words: ['शेर', 'शाम', 'आकाश', 'शीतल', 'देश', 'वर्षा', 'भाषा', 'शांति', 'विशाल', 'रोशनी'],
    tongueTwister: 'समझ समझ के समझ को समझो, समझ समझना भी एक समझ है।',
    tongueTwisterSyllables: 'स-मझ स-मझ के स-मझ को स-म-झो'
  },
  {
    sound: 'ल',
    language: 'hi',
    title: 'लहराती "ल" ध्वनि (L Sound)',
    tip: 'जीभ की नोक को ऊपर के दाँतों के ठीक पीछे मसूड़े पर चिपकाएँ और किनारे से हवा बहने दें।',
    words: ['लाल', 'कमल', 'बादल', 'तितली', 'गुलाब', 'उजाला', 'बालक', 'जंगल', 'लहर', 'कोयल'],
    tongueTwister: 'पके पेड़ पर पका पपीता, पका पेड़ या पका पपीता।',
    tongueTwisterSyllables: 'प-के पेड़ पर प-का प-पी-ता'
  },
  {
    sound: 'स',
    language: 'hi',
    title: 'स्पष्ट दन्त्य "स" ध्वनि (S Sound)',
    tip: 'जीभ को नीचे के दाँतों के पीछे रखें और दाँतों के बीच से साफ हवा निकालें।',
    words: ['सूरज', 'सवेरा', 'सपना', 'सरोवर', 'सुंदर', 'सड़क', 'संसार', 'संगीत', 'साहस', 'सरल'],
    tongueTwister: 'चंदू के चाचा ने चंदू की चाची को चाँदी के चम्मच से चटनी चटाई।',
    tongueTwisterSyllables: 'चं-दू के चा-चा ने चं-दू की चा-ची को'
  },
  {
    sound: 'ण',
    language: 'hi',
    title: 'मूर्धन्य "ण" ध्वनि',
    tip: 'जीभ की नोक को ऊपर तालू पर हल्का मोड़कर छुएँ और नाक से हल्की गूँज निकालें।',
    words: ['वाणी', 'वीणा', 'किरण', 'चरण', 'प्राण', 'दर्पण', 'कारण', 'गुण', 'भूषण', 'कल्याण'],
    tongueTwister: 'बाण से त्राण पाए जब कर्ण, तब वीणा की मधुर ध्वनि गूँजे।',
    tongueTwisterSyllables: 'बा-ण से त्रा-ण पा-ए ज-ब क-र्ण'
  }
];
