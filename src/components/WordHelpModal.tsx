import React, { useState } from 'react';
import { Volume2, Mic, X, CheckCircle2, Sparkles, RefreshCw } from 'lucide-react';
import { AppLanguage, WordAnalysis } from '../types';
import { speakWord, speakSyllables, SpeechRecognizer } from '../services/speech';
import { wordSimilarity, cleanWord } from '../services/soundAnalysis';
import { recordWordAttempts } from '../services/wordDifficultyEngine';
import { BuddyMascot } from './BuddyMascot';
import { playSuccessChime, playEncouragingTone } from '../utils/soundEffects';
import { ensureMicrophoneGranted } from '../utils/permissionManager';

interface WordHelpModalProps {
  wordAnalysis: WordAnalysis;
  language: AppLanguage;
  onClose: () => void;
  onWordPracticed?: (word: string) => void;
}

export const WordHelpModal: React.FC<WordHelpModalProps> = ({
  wordAnalysis,
  language,
  onClose,
  onWordPracticed,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [retryResult, setRetryResult] = useState<'success' | 'try-again' | null>(null);
  const [spokenAttempt, setSpokenAttempt] = useState('');
  const [speechRecognizer] = useState(() => new SpeechRecognizer(language));

  const cleanExpected = wordAnalysis.cleaned;
  const syllables = wordAnalysis.syllables || cleanExpected;
  const syllableList = syllables.split('-').map(s => s.trim()).filter(Boolean);

  const handlePlayNormal = () => {
    setIsPlaying(true);
    speakWord(cleanExpected, language, 'normal', () => setIsPlaying(false));
  };

  const handlePlaySlow = () => {
    setIsPlaying(true);
    speakWord(cleanExpected, language, 'slow', () => setIsPlaying(false));
  };

  const handlePlaySyllables = () => {
    setIsPlaying(true);
    speakSyllables(syllables, language, () => setIsPlaying(false));
  };

  const handleToggleMic = async () => {
    if (isListening) {
      speechRecognizer.stop();
      setIsListening(false);
      return;
    }

    const granted = await ensureMicrophoneGranted(language);
    if (!granted) {
      return;
    }

    setRetryResult(null);
    setSpokenAttempt('');
    setIsListening(true);

    speechRecognizer.setLanguage(language);
    speechRecognizer.start(
      (transcript) => {
        const cleanedSpoken = cleanWord(transcript, language);
        setSpokenAttempt(cleanedSpoken);

        // Check if spoken word is close to target
        const sim = wordSimilarity(cleanExpected, cleanedSpoken);
        const isSuccess = sim >= 0.65;

        // Record word attempt permanently
        recordWordAttempts(
          [
            {
              expected: cleanExpected,
              cleaned: cleanExpected,
              status: isSuccess ? 'correct' : 'needs-practice',
              spoken: cleanedSpoken,
              similarity: sim,
            },
          ],
          `word_help_${Date.now()}`,
          undefined,
          language
        );

        if (isSuccess) {
          setRetryResult('success');
          playSuccessChime();
          onWordPracticed?.(cleanExpected);
          speechRecognizer.stop();
          setIsListening(false);
        } else if (cleanedSpoken.length >= 2) {
          setRetryResult('try-again');
          playEncouragingTone();
        }
      },
      (err) => {
        console.warn('Word retry error', err);
        setIsListening(false);
      },
      (active) => setIsListening(active)
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{language === 'en' ? 'Sound Helper' : 'ध्वनि सहायता'}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Word Display */}
        <div className="text-center my-5">
          <h2 className={`text-3xl font-black text-slate-900 tracking-tight ${language === 'hi' ? 'font-hindi' : ''}`}>
            {wordAnalysis.expected}
          </h2>

          {/* Syllable Splits */}
          <div className="mt-3 flex items-center justify-center flex-wrap gap-1.5">
            {syllableList.map((syl, idx) => (
              <span
                key={idx}
                className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl text-base font-bold border border-indigo-100 shadow-xs"
              >
                {syl}
              </span>
            ))}
          </div>

          <p className="mt-2 text-xs text-slate-500">
            {language === 'en'
              ? 'Syllables help your tongue make each sound clearly'
              : 'प्रत्येक भाग को अलग-अलग बोलकर स्पष्टता लाएँ'}
          </p>
        </div>

        {/* Audio Listen Buttons */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handlePlayNormal}
              disabled={isPlaying}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 active:scale-98 transition shadow-xs"
            >
              <Volume2 className="w-4 h-4" />
              <span>{language === 'en' ? 'Normal (1.0x)' : 'सामान्य गति'}</span>
            </button>
            <button
              onClick={handlePlaySlow}
              disabled={isPlaying}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-50 text-indigo-700 font-semibold text-xs border border-indigo-200 hover:bg-indigo-100 active:scale-98 transition"
            >
              <span className="text-base leading-none">🐢</span>
              <span>{language === 'en' ? 'Slow & Clear' : 'धीमी गति'}</span>
            </button>
          </div>

          <button
            onClick={handlePlaySyllables}
            disabled={isPlaying}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-100 text-slate-700 font-medium text-xs hover:bg-slate-200 active:scale-98 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPlaying ? 'animate-spin' : ''}`} />
            <span>{language === 'en' ? 'Listen Syllable-by-Syllable' : 'अक्षर-दर-अक्षर सुनें'}</span>
          </button>
        </div>

        {/* Retry Practice Card */}
        <div className="mt-5 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80">
          <p className="text-xs font-semibold text-amber-900 text-center">
            {language === 'en'
              ? 'Now try saying just this word:'
              : 'अब केवल यह शब्द बोलकर देखें:'}
          </p>

          <div className="mt-3 flex flex-col items-center">
            <button
              onClick={handleToggleMic}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-md transition-all active:scale-95 ${
                isListening
                  ? 'bg-amber-600 mic-active scale-105'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              <Mic className="w-6 h-6" />
            </button>
            <span className="mt-2 text-xs font-medium text-slate-600">
              {isListening
                ? language === 'en' ? 'Listening to you...' : 'सुन रहे हैं... बोलिए'
                : language === 'en' ? 'Tap mic & speak' : 'माइक दबाकर बोलें'}
            </span>
          </div>

          {spokenAttempt && (
            <p className="mt-2 text-center text-xs text-slate-500 italic">
              "{spokenAttempt}"
            </p>
          )}

          {/* Buddy Mascot Encouragement */}
          <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center justify-center">
            {retryResult === 'success' ? (
              <BuddyMascot
                mood="cheering"
                size="sm"
                speechText={language === 'en' ? 'Super clear! You got it! ⭐' : 'शानदार! बिल्कुल स्पष्ट! ⭐'}
                bubblePosition="right"
              />
            ) : (
              <BuddyMascot
                mood="encouraging"
                size="sm"
                speechText={
                  language === 'en'
                    ? 'Nice try! Once more?'
                    : 'बहुत अच्छा प्रयास! एक बार और?'
                }
                bubblePosition="right"
              />
            )}
          </div>
        </div>

        {/* Done Button */}
        <button
          onClick={onClose}
          className="mt-4 w-full py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 active:scale-98 transition"
        >
          {language === 'en' ? 'Back to Lesson' : 'अभ्यास पर वापस जाएँ'}
        </button>
      </div>
    </div>
  );
};
