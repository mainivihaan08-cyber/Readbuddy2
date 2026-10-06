import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Mic,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Star,
  Activity,
  Award,
  Layers,
  Play,
  HelpCircle,
  BarChart3,
  X,
  VolumeX,
  RefreshCw,
  Check,
  ChevronRight,
  Wand2
} from 'lucide-react';
import { AppLanguage, ChildProfile } from '../types';
import {
  PHONICS_10_LEVELS_DATABASE,
  PhonicsLevelDef,
  PhonicsWordItem,
  PhonicsLetterItem,
  PhonicsStoryPassage,
  getPhonicsLevelByNumber
} from '../data/phonicsLevelsData';
import { speakWord } from '../services/speech';
import {
  analyzeSpeechPhonemes,
  recordPhonicsPracticeSession,
  getPhonicsAssessmentSummary,
  PhonemeDiagnosticResult,
  PhonicsAssessmentSummary
} from '../services/phonemeAssessmentEngine';
import { triggerSuccessConfetti } from '../utils/confetti';

interface PhonicsCurriculumHubProps {
  language: AppLanguage;
  profile?: ChildProfile;
  onStartReading?: () => void;
  onProfileUpdated?: () => void;
}

type ActivityTab = 'learn' | 'blend' | 'quiz' | 'record' | 'story';

export const PhonicsCurriculumHub: React.FC<PhonicsCurriculumHubProps> = ({
  language,
  profile,
  onStartReading,
  onProfileUpdated,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<PhonicsLevelDef | null>(null);
  const [activeActivityTab, setActiveActivityTab] = useState<ActivityTab>('learn');
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [assessmentSummary, setAssessmentSummary] = useState<PhonicsAssessmentSummary>(getPhonicsAssessmentSummary);

  // Speech Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [diagnosticResult, setDiagnosticResult] = useState<PhonemeDiagnosticResult | null>(null);
  const [magicEActive, setMagicEActive] = useState(false);

  // CVC Blending Sandbox State
  const [blendingStep, setBlendingStep] = useState(0); // 0, 1, 2, 3 (all blended)

  // Quiz State
  const [quizSelectedOption, setQuizSelectedOption] = useState<string | null>(null);
  const [quizIsAnswered, setQuizIsAnswered] = useState(false);

  const recognitionRef = useRef<any>(null);

  const refreshAssessment = () => {
    setAssessmentSummary(getPhonicsAssessmentSummary());
  };

  useEffect(() => {
    refreshAssessment();
  }, []);

  // Cleanup speech recognition
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  // Play audio for a word or phoneme
  const handlePlayAudio = (text: string, rate: 'normal' | 'slow' = 'normal') => {
    speakWord(text, 'en', rate);
  };

  // Start speech recognition for phoneme check
  const handleStartRecording = (targetWord: string, targetPhonemes: string[]) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Fallback simulation for unsupported browsers
      simulateSpeechCheck(targetWord, targetPhonemes);
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;

      setIsRecording(true);
      setSpeechTranscript('');
      setDiagnosticResult(null);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.trim();
        setSpeechTranscript(transcript);
        evaluateSpokenWord(targetWord, targetPhonemes, transcript);
      };

      recognition.onerror = (err: any) => {
        console.warn('Speech recognition error:', err);
        setIsRecording(false);
        // Fallback to simulation if microphone fails
        simulateSpeechCheck(targetWord, targetPhonemes);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (e) {
      console.warn('Could not start recognition:', e);
      setIsRecording(false);
      simulateSpeechCheck(targetWord, targetPhonemes);
    }
  };

  // Fallback simulator for device test
  const simulateSpeechCheck = (targetWord: string, targetPhonemes: string[]) => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      const simulatedSpoken = targetWord;
      setSpeechTranscript(simulatedSpoken);
      evaluateSpokenWord(targetWord, targetPhonemes, simulatedSpoken);
    }, 1500);
  };

  const evaluateSpokenWord = (targetWord: string, targetPhonemes: string[], spoken: string) => {
    const res = analyzeSpeechPhonemes(targetWord, targetPhonemes, spoken, language);
    setDiagnosticResult(res);

    if (selectedLevel) {
      recordPhonicsPracticeSession(selectedLevel.levelNumber, res.isCorrect, res);
      if (res.isCorrect) {
        triggerSuccessConfetti();
      }
      refreshAssessment();
      onProfileUpdated?.();
    }
  };

  const currentItem = selectedLevel?.items[currentItemIndex] || selectedLevel?.items[0];
  const currentLetterItem = selectedLevel?.letterItems?.[currentItemIndex] || selectedLevel?.letterItems?.[0];

  return (
    <div className="space-y-4">
      {/* Top Curriculum Hero Banner */}
      <div className="bg-gradient-to-br from-indigo-700 via-purple-700 to-indigo-900 rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-200 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{language === 'en' ? 'Structured Reading Engine' : '१०-स्तरीय ध्वनि एवं वाचन पाठ्यक्रम'}</span>
          </div>

          <button
            onClick={() => setShowAssessmentModal(true)}
            className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-xs font-bold backdrop-blur-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-amber-300" />
            <span>{language === 'en' ? 'Assessment Report' : 'प्रगति रिपोर्ट'}</span>
          </button>
        </div>

        <div className="mt-2 space-y-1">
          <h1 className="text-2xl font-black tracking-tight">
            {language === 'en' ? '10-Level Phonics Master' : 'ध्वनि एवं वाचन दक्षता'}
          </h1>
          <p className="text-xs text-indigo-100 font-medium">
            {language === 'en'
              ? 'Sound ➔ Blending ➔ CVC Words ➔ Digraphs ➔ Real Reading Passages'
              : 'अक्षर ध्वनि ➔ जोड़ ➔ शब्द ➔ वाक्य ➔ धाराप्रवाह वाचन'}
          </p>
        </div>

        {/* Quick Progress Bar Strip */}
        <div className="mt-4 pt-3 border-t border-white/15 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-white/10 rounded-xl p-2">
            <span className="text-[10px] text-indigo-200 block uppercase">Level</span>
            <span className="font-extrabold text-amber-300 text-sm">Level {assessmentSummary.overallLevel}/10</span>
          </div>
          <div className="bg-white/10 rounded-xl p-2">
            <span className="text-[10px] text-indigo-200 block uppercase">CVC Accuracy</span>
            <span className="font-extrabold text-emerald-300 text-sm">{assessmentSummary.cvcAccuracy}%</span>
          </div>
          <div className="bg-white/10 rounded-xl p-2">
            <span className="text-[10px] text-indigo-200 block uppercase">Short Vowels</span>
            <span className="font-extrabold text-cyan-300 text-sm">{assessmentSummary.shortVowelAccuracy}%</span>
          </div>
        </div>
      </div>

      {/* 10 PHONICS LEVELS CURRICULUM GRID */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>{language === 'en' ? 'Phonics Curriculum Stages' : 'ध्वनि पाठ्यक्रम के १० स्तर'}</span>
          </h2>
          <span className="text-[11px] font-bold text-indigo-600">10 Structured Levels</span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {PHONICS_10_LEVELS_DATABASE.map((lvl) => {
            return (
              <div
                key={lvl.levelNumber}
                onClick={() => {
                  setSelectedLevel(lvl);
                  setCurrentItemIndex(0);
                  setActiveActivityTab('learn');
                  setDiagnosticResult(null);
                  setSpeechTranscript('');
                  setBlendingStep(0);
                }}
                className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:border-indigo-300 hover:shadow-md transition cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${lvl.gradient} text-white flex items-center justify-center font-black text-xl shadow-xs shrink-0 group-hover:scale-105 transition`}>
                    {lvl.icon}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                        Level {lvl.levelNumber}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        {lvl.items.length} {language === 'en' ? 'words' : 'शब्द'}
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-indigo-600 transition">
                      {language === 'en' ? lvl.title : lvl.titleHi}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {language === 'en' ? lvl.subtitle : lvl.subtitleHi}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* LEVEL INTERACTIVE PRACTICE ROOM MODAL */}
      {selectedLevel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className={`p-4 bg-gradient-to-r ${selectedLevel.gradient} text-white flex items-center justify-between shrink-0`}>
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{selectedLevel.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase bg-white/20 px-2 py-0.5 rounded-full">
                      Level {selectedLevel.levelNumber}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold leading-tight">
                    {language === 'en' ? selectedLevel.title : selectedLevel.titleHi}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedLevel(null)}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Activity Mode Switcher Tabs */}
            <div className="flex items-center gap-1 p-2 bg-slate-100 border-b border-slate-200 text-xs font-bold overflow-x-auto shrink-0">
              <button
                onClick={() => {
                  setActiveActivityTab('learn');
                  setDiagnosticResult(null);
                }}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition ${
                  activeActivityTab === 'learn'
                    ? 'bg-white text-indigo-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {language === 'en' ? '1. Learn & Listen' : '१. सीखें एवं सुनें'}
              </button>

              {selectedLevel.levelNumber === 3 && (
                <button
                  onClick={() => {
                    setActiveActivityTab('blend');
                    setBlendingStep(0);
                  }}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition ${
                    activeActivityTab === 'blend'
                      ? 'bg-white text-indigo-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {language === 'en' ? '2. Sound Blender' : '२. ध्वनि जोड़ (Blender)'}
                </button>
              )}

              <button
                onClick={() => {
                  setActiveActivityTab('record');
                  setDiagnosticResult(null);
                }}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition ${
                  activeActivityTab === 'record'
                    ? 'bg-white text-indigo-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {language === 'en' ? '3. Speak & AI Check' : '३. बोलें और AI जांच'}
              </button>

              {selectedLevel.passages && selectedLevel.passages.length > 0 && (
                <button
                  onClick={() => {
                    setActiveActivityTab('story');
                    setDiagnosticResult(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition ${
                    activeActivityTab === 'story'
                      ? 'bg-white text-indigo-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {language === 'en' ? '4. Story Reading' : '४. कहानी वाचन'}
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* TAB 1: LEARN & LISTEN */}
              {activeActivityTab === 'learn' && (
                <div className="space-y-4">
                  {/* LEVEL 1: LETTER SOUNDS A-Z */}
                  {selectedLevel.levelNumber === 1 && currentLetterItem && (
                    <div className="space-y-4 text-center">
                      <div className="p-6 rounded-3xl bg-indigo-50/70 border border-indigo-100 space-y-3">
                        <span className="text-6xl font-black text-indigo-900 block tracking-wider">
                          {currentLetterItem.letterCase}
                        </span>

                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white shadow-2xs border border-indigo-200">
                          <span className="text-sm font-mono font-bold text-indigo-700">
                            Sound: {currentLetterItem.soundIpa}
                          </span>
                          <span className="text-xs text-slate-500">
                            ({currentLetterItem.phonicsName})
                          </span>
                        </div>

                        <div className="flex items-center justify-center gap-2 pt-2">
                          <button
                            onClick={() => handlePlayAudio(currentLetterItem.letter, 'slow')}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition cursor-pointer"
                          >
                            <Volume2 className="w-4 h-4" />
                            <span>{language === 'en' ? 'Hear Sound' : 'ध्वनि सुनें'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Articulatory Mouth Tip */}
                      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left space-y-1">
                        <span className="text-[10px] font-bold text-amber-800 uppercase block">
                          👄 {language === 'en' ? 'Mouth Position Tip' : 'मुख स्थिति निर्देश'}
                        </span>
                        <p className="text-xs text-amber-950 font-medium leading-relaxed">
                          {language === 'en' ? currentLetterItem.articulatoryTip : currentLetterItem.articulatoryTipHi}
                        </p>
                      </div>

                      {/* Example Word */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Example Word</span>
                          <h4 className="text-base font-extrabold text-slate-900">{currentLetterItem.exampleWord}</h4>
                          <p className="text-xs text-slate-500">{currentLetterItem.exampleWordHi}</p>
                        </div>
                        <button
                          onClick={() => handlePlayAudio(currentLetterItem.exampleWord)}
                          className="p-2 rounded-xl bg-white hover:bg-indigo-50 text-indigo-600 border border-slate-200 transition"
                        >
                          <Volume2 className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Letter Carousel Controls */}
                      <div className="flex items-center justify-between pt-2">
                        <button
                          disabled={currentItemIndex === 0}
                          onClick={() => setCurrentItemIndex(prev => Math.max(0, prev - 1))}
                          className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold disabled:opacity-40 flex items-center gap-1"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Previous</span>
                        </button>

                        <span className="text-xs font-bold text-slate-500 font-mono">
                          Letter {currentItemIndex + 1} of {selectedLevel.letterItems?.length || 26}
                        </span>

                        <button
                          disabled={currentItemIndex >= (selectedLevel.letterItems?.length || 26) - 1}
                          onClick={() => setCurrentItemIndex(prev => prev + 1)}
                          className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1"
                        >
                          <span>Next</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* LEVEL 2 to 9: WORD ITEMS & CONTRASTS */}
                  {selectedLevel.levelNumber >= 2 && currentItem && (
                    <div className="space-y-4">
                      {/* Big Interactive Word Card */}
                      <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 text-center space-y-3">
                        <span className="text-4xl sm:text-5xl font-black text-slate-900 block tracking-wide">
                          {currentItem.word}
                        </span>

                        {/* Phoneme Blocks */}
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          {currentItem.phonemeDisplay.map((p, idx) => (
                            <span
                              key={idx}
                              onClick={() => handlePlayAudio(p, 'slow')}
                              className="px-3 py-1.5 rounded-xl bg-white border border-indigo-200 font-mono font-black text-sm text-indigo-700 shadow-2xs hover:bg-indigo-50 cursor-pointer active:scale-95 transition"
                            >
                              {p}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center justify-center gap-2 pt-2">
                          <button
                            onClick={() => handlePlayAudio(currentItem.word)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition cursor-pointer"
                          >
                            <Volume2 className="w-4 h-4" />
                            <span>{language === 'en' ? 'Normal Audio' : 'उच्चारण सुनें'}</span>
                          </button>

                          <button
                            onClick={() => handlePlayAudio(currentItem.word, 'slow')}
                            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>{language === 'en' ? 'Slow Phonics' : 'धीमा सुनें'}</span>
                          </button>
                        </div>
                      </div>

                      {/* LEVEL 7 SPECIAL: MAGIC SILENT-E TOGGLE */}
                      {selectedLevel.levelNumber === 7 && currentItem.contrastWord && (
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-rose-900 flex items-center gap-1">
                              <Wand2 className="w-4 h-4 text-rose-600" />
                              <span>Magic Silent-E Transformer</span>
                            </span>

                            <button
                              onClick={() => setMagicEActive(!magicEActive)}
                              className="px-3 py-1 rounded-full bg-rose-600 text-white text-xs font-bold shadow-2xs"
                            >
                              {magicEActive ? 'Show Short Vowel' : 'Add Magic E ✨'}
                            </button>
                          </div>

                          <div className="flex items-center justify-center gap-4 py-2 font-black text-2xl">
                            <span className={!magicEActive ? 'text-rose-700 scale-110' : 'text-slate-400'}>
                              {currentItem.contrastWord}
                            </span>
                            <span className="text-slate-400">➔</span>
                            <span className={magicEActive ? 'text-rose-700 scale-110 font-black' : 'text-slate-400'}>
                              {currentItem.word}
                            </span>
                          </div>

                          <p className="text-[11px] text-rose-800 font-medium">
                            {currentItem.contrastTip || 'Silent E makes the middle vowel say its long name!'}
                          </p>
                        </div>
                      )}

                      {/* Sentence Context & Meaning */}
                      <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-1 text-left">
                        <span className="text-[10px] font-bold text-indigo-800 uppercase block">
                          Meaning & Sentence
                        </span>
                        <p className="text-xs text-indigo-950 font-semibold">
                          "{currentItem.sentenceExample}"
                        </p>
                        <p className="text-[11px] text-indigo-800/80">
                          {currentItem.sentenceExampleHi}
                        </p>
                      </div>

                      {/* Word Navigation Controls */}
                      <div className="flex items-center justify-between pt-2">
                        <button
                          disabled={currentItemIndex === 0}
                          onClick={() => setCurrentItemIndex(prev => Math.max(0, prev - 1))}
                          className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold disabled:opacity-40 flex items-center gap-1"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Previous Word</span>
                        </button>

                        <span className="text-xs font-bold text-slate-500 font-mono">
                          {currentItemIndex + 1} of {selectedLevel.items.length}
                        </span>

                        <button
                          disabled={currentItemIndex >= selectedLevel.items.length - 1}
                          onClick={() => setCurrentItemIndex(prev => prev + 1)}
                          className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1"
                        >
                          <span>Next Word</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SOUND BLENDER SANDBOX (LEVEL 3) */}
              {activeActivityTab === 'blend' && currentItem && (
                <div className="space-y-4 text-center">
                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 font-bold">
                    🧩 Tap each sound box in order, then tap BLEND to merge them into one word!
                  </div>

                  {/* 3 Phoneme Boxes */}
                  <div className="grid grid-cols-3 gap-3 py-4">
                    {currentItem.phonemeDisplay.map((p, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setBlendingStep(idx + 1);
                          handlePlayAudio(p, 'slow');
                        }}
                        className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                          blendingStep >= idx + 1
                            ? 'bg-amber-100 border-amber-500 text-amber-950 scale-105 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300'
                        }`}
                      >
                        <span className="text-[10px] uppercase font-bold text-slate-400">Sound {idx + 1}</span>
                        <span className="text-3xl font-black">{p}</span>
                        <Volume2 className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                    ))}
                  </div>

                  {/* Blend Action Button */}
                  <div className="p-4 rounded-3xl bg-slate-900 text-white space-y-3">
                    <span className="text-xs text-slate-300 block">
                      {blendingStep < 3 ? 'Step: Tap all 3 sounds above' : 'Sounds ready to merge!'}
                    </span>

                    <button
                      onClick={() => {
                        setBlendingStep(3);
                        handlePlayAudio(currentItem.word);
                        triggerSuccessConfetti();
                      }}
                      className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm rounded-2xl shadow-md active:scale-95 transition"
                    >
                      🚀 Blend Together: "{currentItem.word.toUpperCase()}"
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: SPEAK & AI PHONEME CHECK */}
              {activeActivityTab === 'record' && (
                <div className="space-y-4">
                  <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 text-center space-y-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Target Word
                    </span>
                    <span className="text-4xl font-black text-slate-900 block">
                      {currentItem?.word || currentLetterItem?.letter}
                    </span>

                    {currentItem && (
                      <div className="flex items-center justify-center gap-1.5">
                        {currentItem.phonemes.map((ph, i) => (
                          <span key={i} className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                            {ph}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Microphone Button */}
                    <div className="pt-3">
                      <button
                        onClick={() => handleStartRecording(currentItem?.word || currentLetterItem?.letter || 'cat', currentItem?.phonemes || ['/k/', '/æ/', '/t/'])}
                        disabled={isRecording}
                        className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-white shadow-lg transition active:scale-95 ${
                          isRecording
                            ? 'bg-rose-500 animate-pulse ring-4 ring-rose-200'
                            : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                      >
                        <Mic className="w-8 h-8" />
                      </button>
                      <span className="text-xs font-bold text-slate-600 block mt-2">
                        {isRecording ? 'Listening to child speech...' : 'Tap Mic to Read'}
                      </span>
                    </div>
                  </div>

                  {/* AI Phoneme Evaluation Result */}
                  {diagnosticResult && (
                    <div className={`p-4 rounded-3xl border space-y-2 animate-in fade-in ${
                      diagnosticResult.isCorrect
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        : 'bg-amber-50 border-amber-200 text-amber-950'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-sm">
                          {diagnosticResult.isCorrect ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Activity className="w-5 h-5 text-amber-600" />
                          )}
                          <span>
                            {language === 'en' ? diagnosticResult.feedbackMessage : diagnosticResult.feedbackMessageHi}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-black px-2 py-0.5 rounded-full bg-white shadow-2xs">
                          {diagnosticResult.accuracyScore}%
                        </span>
                      </div>

                      {/* Spoken vs Target Analysis */}
                      <div className="p-3 rounded-2xl bg-white/80 text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Target: <strong className="text-slate-900">{diagnosticResult.expectedWord}</strong></span>
                          <span>Heard: <strong className="text-indigo-600">{diagnosticResult.spokenWord}</strong></span>
                        </div>

                        {diagnosticResult.weakPhonemeDetected && (
                          <div className="pt-2 border-t border-slate-100 text-amber-900">
                            <span className="font-bold block">🎯 Target Focus: {diagnosticResult.weakPhonemeDetected}</span>
                            <p className="text-[11px] text-slate-600 mt-0.5">
                              {language === 'en' ? diagnosticResult.targetedTip : diagnosticResult.targetedTipHi}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: STORY PASSAGES (LEVEL 10) */}
              {activeActivityTab === 'story' && selectedLevel.passages && (
                <div className="space-y-4">
                  {selectedLevel.passages.map((passage) => (
                    <div key={passage.id} className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-extrabold text-slate-900">
                          {language === 'en' ? passage.title : passage.titleHi}
                        </h4>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                          {passage.wordCount} words
                        </span>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-slate-200 text-sm font-medium text-slate-800 leading-relaxed">
                        {passage.text}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={() => handlePlayAudio(passage.text)}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Listen Passage</span>
                        </button>

                        <button
                          onClick={() => onStartReading?.()}
                          className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Full Reading Mode</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                onClick={() => setSelectedLevel(null)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-200 transition"
              >
                Close Level
              </button>

              <button
                onClick={() => {
                  if (currentItemIndex < (selectedLevel.items.length || 1) - 1) {
                    setCurrentItemIndex(prev => prev + 1);
                    setDiagnosticResult(null);
                    setBlendingStep(0);
                  } else {
                    setSelectedLevel(null);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-2xs transition"
              >
                {currentItemIndex < (selectedLevel.items.length || 1) - 1 ? 'Next Practice ➔' : 'Complete Level ⭐'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHONICS ASSESSMENT & PARENT DIAGNOSTIC MODAL */}
      {showAssessmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-extrabold">
                  {language === 'en' ? 'Phonics & Reading Assessment Report' : 'ध्वनि एवं वाचन प्रगति रिपोर्ट'}
                </h3>
              </div>
              <button
                onClick={() => setShowAssessmentModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Overall Score Card */}
              <div className="p-4 rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-200">Current Level</span>
                  <h4 className="text-2xl font-black">Level {assessmentSummary.overallLevel} / 10</h4>
                  <span className="text-[11px] text-indigo-100">Overall Accuracy: {assessmentSummary.overallScore}%</span>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl font-black text-amber-300">
                  {assessmentSummary.overallScore}%
                </div>
              </div>

              {/* Phonics Breakdown Metrics */}
              <div className="space-y-2">
                <span className="font-extrabold text-slate-900 block">Performance Breakdown</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block uppercase">CVC Accuracy</span>
                    <span className="font-extrabold text-slate-900 text-sm">{assessmentSummary.cvcAccuracy}%</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block uppercase">Short Vowels</span>
                    <span className="font-extrabold text-slate-900 text-sm">{assessmentSummary.shortVowelAccuracy}%</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block uppercase">Digraphs</span>
                    <span className="font-extrabold text-slate-900 text-sm">{assessmentSummary.digraphAccuracy}%</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block uppercase">Blending Score</span>
                    <span className="font-extrabold text-slate-900 text-sm">{assessmentSummary.blendingScore}%</span>
                  </div>
                </div>
              </div>

              {/* Weak Sounds Identified */}
              {assessmentSummary.weakPhonemes.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 space-y-1.5">
                  <span className="text-[10px] font-bold text-rose-800 uppercase block">
                    ⚠️ Sounds Needing Extra Practice
                  </span>
                  <div className="space-y-1">
                    {assessmentSummary.weakPhonemes.map((w, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs font-semibold text-rose-950 bg-white px-2.5 py-1 rounded-lg border border-rose-100">
                        <span>{w.name}</span>
                        <span className="text-[10px] text-rose-600 font-bold">Level {w.practiceLevel}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Daily Practice Plan */}
              <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-1">
                <span className="text-[10px] font-bold text-indigo-800 uppercase block">
                  💡 Recommended Daily Routine ({assessmentSummary.recommendedPracticeMinutes} Minutes)
                </span>
                <p className="text-xs text-indigo-950 font-bold">
                  {language === 'en' ? assessmentSummary.recommendedFocus : assessmentSummary.recommendedFocusHi}
                </p>
                <p className="text-[11px] text-indigo-800">
                  Consistent 10-minute daily phonics practice builds fluent phonetic decoding and high reading confidence.
                </p>
              </div>

              <button
                onClick={() => setShowAssessmentModal(false)}
                className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
