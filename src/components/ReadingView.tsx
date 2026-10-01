import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Square,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Type,
  CheckCircle2,
  RefreshCw,
  Award
} from 'lucide-react';
import { AppLanguage, ParagraphItem, WordAnalysis } from '../types';
import { PARAGRAPHS } from '../data/paragraphs';
import { SpeechRecognizer } from '../services/speech';
import { AudioRecorder } from '../services/audioRecorder';
import { analyzeSpokenText } from '../services/soundAnalysis';
import {
  triggerParagraphSuccessConfetti,
  triggerDailySessionCompleteConfetti,
} from '../utils/confetti';
import {
  saveRecording,
  recordSubstitutions,
  addStars,
  addSessionTime,
  updateBadgeProgress,
  getChildProfile,
} from '../services/storage';
import { WordHelpModal } from './WordHelpModal';

interface ReadingViewProps {
  language: AppLanguage;
  onSessionComplete?: () => void;
}

export const ReadingView: React.FC<ReadingViewProps> = ({
  language,
  onSessionComplete,
}) => {
  const filteredParagraphs = PARAGRAPHS.filter((p) => p.language === language);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentParagraph: ParagraphItem = filteredParagraphs[currentIndex] || filteredParagraphs[0];

  // Font size state: normal (false) vs extra-large (true)
  const [extraLargeText, setExtraLargeText] = useState(false);

  // Speech Recognition & Audio Recorder states
  const [isRecording, setIsRecording] = useState(false);
  const [rawTranscript, setRawTranscript] = useState('');
  const [wordAnalysisList, setWordAnalysisList] = useState<WordAnalysis[]>([]);
  const [selectedWordForHelp, setSelectedWordForHelp] = useState<WordAnalysis | null>(null);

  // Session completion modal
  const [showCelebration, setShowCelebration] = useState(false);
  const [sessionAccuracy, setSessionAccuracy] = useState(0);
  const [starsAwarded, setStarsAwarded] = useState(10);

  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const audioRecorderRef = useRef<AudioRecorder>(new AudioRecorder());
  const startTimeRef = useRef<number>(0);

  // Initialize word list when paragraph changes
  useEffect(() => {
    if (!currentParagraph) return;
    const initialWords = currentParagraph.text.trim().split(/\s+/).map((word) => ({
      expected: word,
      cleaned: word.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, ''),
      status: 'pending' as const,
      syllables: currentParagraph.syllablesMap[word.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"'’]/g, '')]
    }));
    setWordAnalysisList(initialWords);
    setRawTranscript('');
    setIsRecording(false);
    setShowCelebration(false);
  }, [currentParagraph]);

  // Keep recognizer language in sync
  useEffect(() => {
    if (!recognizerRef.current) {
      recognizerRef.current = new SpeechRecognizer(language);
    } else {
      recognizerRef.current.setLanguage(language);
    }
  }, [language]);

  // Handle Live Transcript updates
  const handleTranscript = (transcript: string) => {
    setRawTranscript(transcript);
    const analysis = analyzeSpokenText(
      currentParagraph.text,
      transcript,
      language,
      currentParagraph.syllablesMap
    );
    setWordAnalysisList(analysis);

    // Auto-check if finished majority of words
    const spokenCount = analysis.filter((w) => w.status !== 'pending').length;
    if (spokenCount >= analysis.length * 0.9 && spokenCount > 4) {
      // Near completion
    }
  };

  // Start reading session
  const startSession = async () => {
    setRawTranscript('');
    startTimeRef.current = Date.now();

    // Start audio recorder
    await audioRecorderRef.current.start();

    // Start speech recognition
    if (!recognizerRef.current) {
      recognizerRef.current = new SpeechRecognizer(language);
    }

    recognizerRef.current.start(
      (transcript) => handleTranscript(transcript),
      (error) => console.warn('Recognition notice:', error),
      (active) => setIsRecording(active)
    );

    setIsRecording(true);
  };

  // Stop reading session & calculate rewards
  const stopSession = async () => {
    if (recognizerRef.current) {
      recognizerRef.current.stop();
    }
    setIsRecording(false);

    const elapsedSeconds = Math.max(5, Math.round((Date.now() - startTimeRef.current) / 1000));
    addSessionTime(elapsedSeconds);

    // Stop audio recording
    const recResult = await audioRecorderRef.current.stop();

    // Calculate score
    const totalWords = wordAnalysisList.length;
    const correctWords = wordAnalysisList.filter((w) => w.status === 'correct').length;
    const calculatedAccuracy = totalWords > 0 ? Math.round((correctWords / totalWords) * 100) : 75;

    // Minimum lenient baseline accuracy so kids always feel encouraged
    const finalAccuracy = Math.max(60, calculatedAccuracy);
    setSessionAccuracy(finalAccuracy);

    // Collect weak sound substitutions
    const subsToLog: Array<{ expectedSound: string; spokenSound: string; exampleWord: string; lang: AppLanguage }> = [];
    const identifiedSubsLabels: string[] = [];

    wordAnalysisList.forEach((w) => {
      if (w.status === 'needs-practice' && w.detectedSubstitution) {
        subsToLog.push({
          expectedSound: w.detectedSubstitution.expectedSound,
          spokenSound: w.detectedSubstitution.spokenSound,
          exampleWord: `${w.cleaned} ➔ ${w.spoken || '?' }`,
          lang: language,
        });
        const label = `${w.detectedSubstitution.expectedSound} ➔ ${w.detectedSubstitution.spokenSound}`;
        if (!identifiedSubsLabels.includes(label)) {
          identifiedSubsLabels.push(label);
        }
      }
    });

    if (subsToLog.length > 0) {
      await recordSubstitutions(subsToLog);
    }

    // Save to IndexedDB
    if (recResult?.blob) {
      await saveRecording({
        id: `rec-${Date.now()}`,
        timestamp: Date.now(),
        dateFormatted: 'Just now',
        paragraphId: currentParagraph.id,
        paragraphTitle: currentParagraph.title,
        language,
        accuracy: finalAccuracy,
        durationSeconds: elapsedSeconds,
        audioBlob: recResult.blob,
        identifiedSubstitutions: identifiedSubsLabels,
      });
      updateBadgeProgress('first-recording', 1);
    }

    // Stars & Gamification
    const starsEarned = finalAccuracy > 80 ? 12 : 8;
    setStarsAwarded(starsEarned);
    addStars(starsEarned);
    updateBadgeProgress('clearer-every-day', finalAccuracy >= 80 ? 1 : 0);
    updateBadgeProgress('bilingual-voice', 1);

    // Show celebration with confetti animation
    setShowCelebration(true);
    triggerParagraphSuccessConfetti();

    // Check if daily session target was reached during this reading
    const updatedProfile = getChildProfile();
    const sessionMin = Math.floor(updatedProfile.todaySessionSeconds / 60);
    if (sessionMin >= (updatedProfile.dailyCapMinutes || 15)) {
      setTimeout(() => {
        triggerDailySessionCompleteConfetti();
      }, 700);
    }

    onSessionComplete?.();
  };

  const handleWordPracticed = (practicedWord: string) => {
    setWordAnalysisList((prev) =>
      prev.map((w) => (w.cleaned === practicedWord ? { ...w, status: 'correct' } : w))
    );
  };

  // Demo simulation button: Allows the child or tester to see speech recognition in action if mic permission is unavailable
  const handleSimulateSpeech = () => {
    const textWords = currentParagraph.text.split(/\s+/);
    // Simulate speech with a couple intentional friendly substitutions to demonstrate orange highlights
    const simulatedWords = textWords.map((w, i) => {
      if (i === 2 && language === 'en') return 'labbit';
      if (i === 6 && language === 'en') return 'sip';
      if (i === 3 && language === 'hi') return 'सेर';
      return w;
    });
    handleTranscript(simulatedWords.join(' '));
  };

  return (
    <div className="max-w-md mx-auto px-4 py-4 pb-28">
      {/* Top Controls: Paragraph Selector & Extra Large Font Toggle */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : filteredParagraphs.length - 1))}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 active:scale-95 transition"
            title="Previous story"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-500 px-1">
            {currentIndex + 1} / {filteredParagraphs.length}
          </span>
          <button
            onClick={() => setCurrentIndex((prev) => (prev < filteredParagraphs.length - 1 ? prev + 1 : 0))}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 active:scale-95 transition"
            title="Next story"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Extra Large Text Toggle */}
        <button
          onClick={() => setExtraLargeText((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition active:scale-95 ${
            extraLargeText
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          <span>{extraLargeText ? 'Text: Extra Large' : 'Text: Normal'}</span>
        </button>
      </div>

      {/* Paragraph Title & Category */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xs border border-slate-200/80 mb-4 transition-all">
        <div className="flex items-center justify-between gap-2 pb-2 mb-3 border-b border-slate-100 text-xs">
          <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
            {currentParagraph.grade}
          </span>
          <span className="text-slate-400 font-medium">
            {currentParagraph.category}
          </span>
        </div>

        <h1 className={`text-lg sm:text-xl font-bold text-slate-900 mb-3 tracking-tight ${language === 'hi' ? 'font-hindi' : ''}`}>
          {currentParagraph.title}
        </h1>

        {/* Main Text with Live Word Highlighting */}
        <div
          className={`leading-relaxed tracking-normal select-none transition-all ${
            extraLargeText ? 'text-2xl sm:text-3xl space-y-3' : 'text-lg sm:text-xl space-y-2'
          } ${language === 'hi' ? 'font-hindi leading-loose' : ''}`}
        >
          {wordAnalysisList.map((item, index) => {
            const isCorrect = item.status === 'correct';
            const isNeedsPractice = item.status === 'needs-practice';

            return (
              <span
                key={index}
                onClick={() => {
                  if (isNeedsPractice || item.status === 'correct') {
                    setSelectedWordForHelp(item);
                  }
                }}
                className={`inline-block mr-1.5 px-1.5 py-0.5 rounded-lg cursor-pointer transition-colors duration-150 ${
                  isCorrect
                    ? 'bg-emerald-100 text-emerald-900 font-semibold'
                    : isNeedsPractice
                    ? 'bg-amber-100 text-amber-950 font-bold border-b-2 border-amber-400 shadow-xs animate-pulse-once'
                    : 'text-slate-800 hover:bg-slate-100'
                }`}
                title={
                  isNeedsPractice
                    ? language === 'en'
                      ? 'Tap for pronunciation and slow syllable help!'
                      : 'उच्चारण और धीमे अभ्यास के लिए टैप करें!'
                    : ''
                }
              >
                {item.expected}
              </span>
            );
          })}
        </div>

        {/* Legend reminder */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>{language === 'en' ? 'Clear' : 'स्पष्ट'}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span>{language === 'en' ? 'Tap orange for help' : 'नारंगी शब्द टैप करें'}</span>
            </span>
          </div>
          <span className="text-[10px] text-slate-400">
            {language === 'en' ? 'Lenient CBSE helper' : 'सरल अभ्यास'}
          </span>
        </div>
      </div>

      {/* Target Sounds Highlight */}
      <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-indigo-900 font-medium">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>{language === 'en' ? 'Focus Sounds in this story:' : 'इस पाठ की मुख्य ध्वनियाँ:'}</span>
        </div>
        <div className="flex items-center gap-1">
          {currentParagraph.targetSounds.map((snd, idx) => (
            <span
              key={idx}
              className="bg-white text-indigo-700 font-bold text-xs px-2 py-0.5 rounded-md border border-indigo-200 shadow-2xs"
            >
              /{snd}/
            </span>
          ))}
        </div>
      </div>

      {/* Live transcript preview */}
      {isRecording && rawTranscript && (
        <div className="bg-slate-100/90 rounded-2xl p-3 mb-4 border border-slate-200 text-xs text-slate-600">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-slate-700">
              {language === 'en' ? 'Hearing you live:' : 'आपकी आवाज़:'}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <p className="italic font-medium text-slate-800">"{rawTranscript}"</p>
        </div>
      )}

      {/* Large Thumb-Friendly Mic Button (Anchor) */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pointer-events-none z-30">
        <div className="max-w-md mx-auto flex items-center justify-center gap-3 pointer-events-auto">
          {!isRecording ? (
            <button
              onClick={startSession}
              className="flex-1 max-w-xs h-14 rounded-2xl bg-indigo-600 text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition"
            >
              <Mic className="w-6 h-6" />
              <span>{language === 'en' ? 'Start Reading Now' : 'पढ़ना शुरू करें'}</span>
            </button>
          ) : (
            <button
              onClick={stopSession}
              className="flex-1 max-w-xs h-14 rounded-2xl bg-amber-600 text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-lg shadow-amber-600/30 mic-active hover:bg-amber-700 active:scale-95 transition"
            >
              <Square className="w-5 h-5 fill-white" />
              <span>{language === 'en' ? 'Finish & Check' : 'समाप्त करें'}</span>
            </button>
          )}

          {/* Quick Demo Helper Button */}
          {!isRecording && (
            <button
              onClick={handleSimulateSpeech}
              title="Practice simulation (useful for testing or quiet rooms)"
              className="h-14 px-3 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center shadow-xs active:scale-95 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Word Help Modal */}
      {selectedWordForHelp && (
        <WordHelpModal
          wordAnalysis={selectedWordForHelp}
          language={language}
          onClose={() => setSelectedWordForHelp(null)}
          onWordPracticed={handleWordPracticed}
        />
      )}

      {/* Session Celebration Modal */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center border border-slate-100">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3">
              <Award className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-black text-slate-900">
              {language === 'en' ? 'Wonderful Reading!' : 'शानदार पठन!'}
            </h3>
            <p className="mt-1 text-xs text-slate-600">
              {language === 'en'
                ? 'Your speech rhythm is getting clearer with every practice!'
                : 'आपकी आवाज़ और उच्चारण हर अभ्यास के साथ और स्पष्ट हो रहे हैं!'}
            </p>

            <div className="my-5 grid grid-cols-2 gap-3">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200">
                <span className="text-2xl font-black text-amber-600">+{starsAwarded}</span>
                <span className="block text-[11px] font-bold text-amber-800 mt-0.5">
                  {language === 'en' ? 'Stars Earned ⭐' : 'सितारे मिले ⭐'}
                </span>
              </div>
              <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-200">
                <span className="text-2xl font-black text-indigo-700">{sessionAccuracy}%</span>
                <span className="block text-[11px] font-bold text-indigo-800 mt-0.5">
                  {language === 'en' ? 'Speech Clarity' : 'स्पष्टता स्कोर'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mb-4">
              {language === 'en'
                ? 'Audio saved securely on this device for Before vs After comparison.'
                : 'रिकॉर्डिंग इस डिवाइस पर तुलना के लिए सुरक्षित रूप से सहेजी गई है।'}
            </p>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setShowCelebration(false);
                  setCurrentIndex((prev) => (prev + 1) % filteredParagraphs.length);
                }}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 active:scale-98 transition shadow-xs"
              >
                {language === 'en' ? 'Next Paragraph' : 'अगला पाठ'}
              </button>
              <button
                onClick={() => setShowCelebration(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs hover:bg-slate-200 active:scale-98 transition"
              >
                {language === 'en' ? 'Review Current Story' : 'यही पाठ दोबारा देखें'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
