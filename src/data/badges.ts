import { BadgeItem } from '../types';

export const INITIAL_BADGES: BadgeItem[] = [
  {
    id: 'streak-5',
    name: '5-Day Streak',
    nameHi: '५ दिन का अभ्यास',
    description: 'Practiced reading 5 days in a row',
    descriptionHi: 'लगातार ५ दिनों तक नियमित अभ्यास किया',
    icon: '🔥',
    unlocked: false,
    progress: 1,
    target: 5
  },
  {
    id: 'bilingual-voice',
    name: 'Bilingual Voice',
    nameHi: 'द्विभाषी स्टार',
    description: 'Read at least 3 English and 3 Hindi paragraphs',
    descriptionHi: 'कम से कम ३ अंग्रेज़ी और ३ हिंदी पाठ पढ़े',
    icon: '🌐',
    unlocked: false,
    progress: 1,
    target: 6
  },
  {
    id: 'sound-explorer',
    name: 'Sound Explorer',
    nameHi: 'ध्वनि खोजकर्ता',
    description: 'Mastered 3 sound drills with 5-minute practice',
    descriptionHi: '३ ध्वनि ड्रिल्स का अभ्यास पूरा किया',
    icon: '🧭',
    unlocked: false,
    progress: 0,
    target: 3
  },
  {
    id: 'clearer-every-day',
    name: 'Clearer Every Day',
    nameHi: 'प्रतिदिन और स्पष्ट',
    description: 'Completed 5 reading sessions with >80% accuracy',
    descriptionHi: '८०% से अधिक स्पष्टता के साथ ५ पाठ पूरे किए',
    icon: '⭐',
    unlocked: false,
    progress: 1,
    target: 5
  },
  {
    id: 'first-recording',
    name: 'First Recording',
    nameHi: 'पहली आवाज़',
    description: 'Saved your very first reading audio',
    descriptionHi: 'अपनी पहली पठन रिकॉर्डिंग सहेजी',
    icon: '🎙️',
    unlocked: true,
    progress: 1,
    target: 1
  },
  {
    id: 'drill-master',
    name: 'Tongue Twister Ace',
    nameHi: 'टंग ट्विस्टर चैंपियन',
    description: 'Successfully attempted 5 playful tongue twisters',
    descriptionHi: '५ मज़ेदार टंग ट्विस्टर्स का अभ्यास किया',
    icon: '⚡',
    unlocked: false,
    progress: 0,
    target: 5
  }
];
