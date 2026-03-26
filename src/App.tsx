import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, ChevronLeft, ChevronRight, RotateCcw, Brain, BookOpen, Headphones, Mail, MessageCircle } from 'lucide-react';
import { FRENCH_NUMBERS, type FrenchNumber } from './constants';

type Mode = 'study' | 'quiz' | 'menu';
type QuizType = 'multiple-choice' | 'audio-to-text';

interface QuizQuestion {
  number: FrenchNumber;
  type: QuizType;
  options?: string[];
}

export default function App() {
  const [mode, setMode] = useState<Mode>('menu');
  const [range, setRange] = useState<[number, number]>([0, 100]);
  const [isRandom, setIsRandom] = useState(false);
  const [studyNumbers, setStudyNumbers] = useState<FrenchNumber[]>(FRENCH_NUMBERS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [userInput, setUserInput] = useState('');
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'error' | 'success' } | null>(null);
  const [showHints, setShowHints] = useState(true);
  const [isMac, setIsMac] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load mastery and hints preference from localStorage
  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
    
    const savedHints = localStorage.getItem('french_show_hints');
    if (savedHints !== null) setShowHints(JSON.parse(savedHints));
  }, []);

  const toggleHints = () => {
    setShowHints(prev => {
      const next = !prev;
      localStorage.setItem('french_show_hints', JSON.stringify(next));
      return next;
    });
  };

  // Audio handling
  const playAudio = useCallback((text: string) => {
    if (isLoadingAudio) return;
    
    setIsLoadingAudio(true);

    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.9;
      
      utterance.onend = () => {
        setIsLoadingAudio(false);
      };

      utterance.onerror = (event) => {
        console.error("SpeechSynthesis error:", event);
        setIsLoadingAudio(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("Audio playback error:", err);
      setIsLoadingAudio(false);
    }
  }, [isLoadingAudio]);

  const toggleRandom = () => {
    const newIsRandom = !isRandom;
    setIsRandom(newIsRandom);
    
    if (newIsRandom) {
      setStudyNumbers([...FRENCH_NUMBERS].sort(() => Math.random() - 0.5));
    } else {
      setStudyNumbers(FRENCH_NUMBERS);
    }
    
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  // Quiz logic
  const generateQuiz = useCallback(() => {
    const available = FRENCH_NUMBERS.slice(range[0], range[1] + 1);
    const shuffled = [...available].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 10);
    
    const questions: QuizQuestion[] = selected.map(num => {
      const type: QuizType = Math.random() > 0.5 ? 'multiple-choice' : 'audio-to-text';
      let options: string[] | undefined;
      
      if (type === 'multiple-choice') {
        const others = available.filter(n => n.value !== num.value)
          .sort(() => 0.5 - Math.random())
          .slice(0, 3);
        options = [num.cardinal, ...others.map(o => o.cardinal)]
          .sort(() => 0.5 - Math.random());
      }
      
      return { number: num, type, options };
    });

    setQuizQuestions(questions);
    setQuizIndex(0);
    setScore(0);
    setShowResult(false);
    setMode('quiz');
    setUserInput('');
    setSelectedOption(null);
  }, [range]);

  // Auto-play audio for audio-to-text questions
  useEffect(() => {
    if (mode === 'quiz' && !showResult && quizQuestions[quizIndex]?.type === 'audio-to-text') {
      const timer = setTimeout(() => {
        playAudio(quizQuestions[quizIndex].number.cardinal);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [mode, quizIndex, quizQuestions, showResult]);

  const handleAnswer = useCallback((answer: string) => {
    if (selectedOption || (quizQuestions[quizIndex].type === 'audio-to-text' && userInput.trim() === '')) return;
    
    const correct = answer.toLowerCase().trim() === quizQuestions[quizIndex].number.cardinal.toLowerCase();
    setSelectedOption(answer);
    
    if (correct) {
      setScore(s => s + 1);
    }
    
    setTimeout(() => {
      if (quizIndex < 9) {
        setQuizIndex(i => i + 1);
        setSelectedOption(null);
        setUserInput('');
      } else {
        setShowResult(true);
      }
    }, 1500);
  }, [selectedOption, quizQuestions, quizIndex, userInput]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = e.target instanceof HTMLInputElement;
      const key = e.key.toLowerCase();
      const isAudioShortcut = ((key === 's' || key === 'ß' || e.code === 'KeyS') && e.altKey) || 
                             ((key === 'v' || key === '√' || e.code === 'KeyV') && e.altKey);
      
      // Audio Replay (works everywhere)
      if (isAudioShortcut) {
        e.preventDefault();
        const text = mode === 'study' 
          ? studyNumbers[currentIndex].cardinal 
          : quizQuestions[quizIndex]?.number.cardinal;
        if (text) playAudio(text);
        return;
      }

      // If in input, don't handle other shortcuts
      if (isInput) return;

      if (mode === 'study') {
        if (e.key === 'ArrowLeft') {
          setCurrentIndex(prev => Math.max(range[0], prev - 1));
          setIsFlipped(false);
        } else if (e.key === 'ArrowRight') {
          setCurrentIndex(prev => Math.min(range[1], prev + 1));
          setIsFlipped(false);
        } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault(); // Prevent scrolling
          setIsFlipped(prev => !prev);
        }
      } else if (mode === 'quiz' && !showResult) {
        const question = quizQuestions[quizIndex];
        if (question?.type === 'multiple-choice' && question.options) {
          const num = parseInt(e.key);
          if (num >= 1 && num <= 4) {
            const option = question.options[num - 1];
            if (option) handleAnswer(option);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, currentIndex, studyNumbers, range, quizIndex, quizQuestions, showResult, playAudio, handleAnswer]);

  return (
    <div className="min-h-screen flex flex-col items-center p-6 md:p-12">
      {/* Header */}
      <header className="w-full max-w-2xl flex flex-col items-center mb-8 text-center">
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className={`fixed top-6 z-50 px-6 py-3 rounded-2xl shadow-xl border ${
                notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'
              }`}
            >
              <p className="font-medium">{notification.message}</p>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.button 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => {
            setMode('menu');
            setIsFlipped(false);
            setShowResult(false);
          }}
          className="flex items-center gap-2 mb-2 focus:outline-none"
        >
          <h1 className="text-4xl md:text-5xl serif font-bold text-olive">Numéros Français</h1>
        </motion.button>
        <p className="text-gray-600 serif italic text-lg">Master French numbers with ease</p>
      </header>

      <main className="w-full max-w-lg flex flex-col items-center">
        <AnimatePresence mode="wait">
          {mode === 'menu' && (
            <motion.div 
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full space-y-6"
            >
              <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={() => {
                    setRange([0, 100]);
                    setCurrentIndex(0);
                    setMode('study');
                  }}
                  className="group relative bg-white card-shadow p-8 rounded-[32px] border border-olive/5 flex items-center gap-6 hover:scale-[1.02] transition-all text-left cursor-pointer"
                >
                  <div className="w-16 h-16 bg-cream rounded-2xl flex items-center justify-center text-olive group-hover:bg-olive group-hover:text-white transition-colors">
                    <BookOpen size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl serif font-bold text-olive">Study Mode</h3>
                    <p className="text-gray-500 serif italic">Learn numbers 0-100 with flashcards</p>
                  </div>
                </button>

                <button 
                  onClick={() => {
                    setRange([0, 100]);
                    setMode('quiz');
                    generateQuiz();
                  }}
                  className="group relative bg-white card-shadow p-8 rounded-[32px] border border-olive/5 flex items-center gap-6 hover:scale-[1.02] transition-all text-left cursor-pointer"
                >
                  <div className="w-16 h-16 bg-cream rounded-2xl flex items-center justify-center text-olive group-hover:bg-olive group-hover:text-white transition-colors">
                    <Brain size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl serif font-bold text-olive">Quiz Mode</h3>
                    <p className="text-gray-500 serif italic">Test your knowledge on numbers 0-100</p>
                  </div>
                </button>
              </div>

            </motion.div>
          )}

          {mode === 'study' && (
            <motion.div 
              key="study"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full"
            >
              <div className="flex justify-between items-center mb-6">
                <button onClick={() => setMode('menu')} className="text-olive/60 hover:text-olive flex items-center gap-1">
                  <ChevronLeft size={20} /> Back to menu
                </button>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={toggleRandom}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      isRandom 
                        ? 'bg-olive text-white' 
                        : 'bg-olive/5 text-olive hover:bg-olive/10'
                    }`}
                    title={isRandom ? "Switch to Ordered List" : "Shuffle Numbers"}
                  >
                    <RotateCcw size={14} className={isRandom ? 'animate-spin-slow' : ''} />
                    {isRandom ? 'Shuffle' : 'Ordered'}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full">
                <button 
                  onClick={() => {
                    setCurrentIndex(prev => Math.max(range[0], prev - 1));
                    setIsFlipped(false);
                  }}
                  disabled={currentIndex === range[0]}
                  className="group p-3 rounded-full bg-white card-shadow text-olive disabled:opacity-30 transition-all hover:scale-110 shrink-0 relative"
                >
                  <ChevronLeft size={24} />
                </button>

                <div className="relative h-72 w-72 aspect-square perspective-1000 mx-auto">
                  <motion.div
                    className="w-full h-full relative preserve-3d cursor-pointer"
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                    onClick={() => setIsFlipped(!isFlipped)}
                  >
                    <div className="absolute inset-0 backface-hidden bg-white rounded-[32px] card-shadow flex flex-col items-center justify-center p-6 border border-olive/5">
                      <span className="text-6xl font-bold text-olive/20 absolute top-6 left-6 select-none">#</span>
                      <h2 className="text-8xl serif font-bold text-olive">{studyNumbers[currentIndex].value}</h2>
                      <p className="mt-4 text-gray-400 serif italic text-sm">Click or Space to flip</p>
                    </div>

                    <div 
                      className="absolute inset-0 backface-hidden bg-olive rounded-[32px] card-shadow flex flex-col items-center justify-center p-6 text-white"
                      style={{ transform: 'rotateY(180deg)' }}
                    >
                      <div className="text-center space-y-4">
                        <div>
                          <p className="text-white/60 text-[10px] uppercase tracking-widest mb-1">Cardinal</p>
                          <h3 className="text-3xl serif font-bold capitalize leading-tight">{studyNumbers[currentIndex].cardinal}</h3>
                        </div>
                        <div className="h-px w-8 bg-white/20 mx-auto" />
                        <div>
                          <p className="text-white/60 text-[10px] uppercase tracking-widest mb-1">Ordinal</p>
                          <h3 className="text-2xl serif italic capitalize leading-tight">{studyNumbers[currentIndex].ordinal}</h3>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          playAudio(studyNumbers[currentIndex].cardinal);
                        }}
                        disabled={isLoadingAudio}
                        className="group mt-6 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50 relative"
                      >
                        <Volume2 size={20} className={isLoadingAudio ? 'animate-pulse' : ''} />
                        {showHints && (
                          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] opacity-0 group-hover:opacity-70 font-mono bg-black/40 px-1.5 py-0.5 rounded whitespace-nowrap transition-opacity">{isMac ? 'Option' : 'Alt'} + S</span>
                        )}
                      </button>
                    </div>
                  </motion.div>
                </div>

                <button 
                  onClick={() => {
                    setCurrentIndex(prev => Math.min(range[1], prev + 1));
                    setIsFlipped(false);
                  }}
                  disabled={currentIndex === range[1]}
                  className="group p-3 rounded-full bg-white card-shadow text-olive disabled:opacity-30 transition-all hover:scale-110 shrink-0 relative"
                >
                  <ChevronRight size={24} />
                </button>
              </div>

              {/* Keyboard Hints Bar */}
              <AnimatePresence>
                {showHints && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden relative group mt-12"
                  >
                    <div className="flex flex-wrap justify-center gap-4 text-[11px] text-olive/50 font-medium uppercase tracking-widest transition-all duration-300 group-hover:blur-md group-hover:opacity-20">
                      <div className="flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded-md border border-olive/5">
                        <span className="bg-white px-1.5 py-0.5 rounded border border-olive/20 shadow-sm text-olive">←</span>
                        <span className="bg-white px-1.5 py-0.5 rounded border border-olive/20 shadow-sm text-olive">→</span>
                        <span>Navigate</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded-md border border-olive/5">
                        <span className="bg-white px-3 py-0.5 rounded border border-olive/20 shadow-sm text-olive">Space</span>
                        <span>Flip</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded-md border border-olive/5">
                        <span className="bg-white px-1.5 py-0.5 rounded border border-olive/20 shadow-sm text-olive">{isMac ? 'Option' : 'Alt'} + S</span>
                        <span>Listen</span>
                      </div>
                    </div>
                    
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button 
                        onClick={toggleHints}
                        className="bg-olive text-white text-[10px] px-4 py-1.5 rounded-full font-bold uppercase tracking-widest shadow-lg hover:scale-105 transition-transform cursor-pointer"
                      >
                        Hide Shortcuts
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {mode === 'quiz' && (
            <motion.div 
              key="quiz"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full"
            >
              {!showResult ? (
                <div className="space-y-6">
                  <div className="w-full bg-white/30 h-2 rounded-full overflow-hidden mb-4">
                    <motion.div 
                      className="bg-olive h-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(quizIndex / 10) * 100}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-end">
                    <button onClick={() => setMode('menu')} className="text-olive/60 hover:text-olive flex items-center gap-1 text-sm">
                      <ChevronLeft size={16} /> Back
                    </button>
                    <div className="text-right">
                      <p className="text-olive/60 text-xs uppercase tracking-widest">Score</p>
                      <p className="text-xl serif font-bold text-olive">{score}</p>
                    </div>
                  </div>

                  {quizQuestions[quizIndex]?.type === 'multiple-choice' ? (
                    <div className="space-y-8">
                      <div className="bg-white rounded-[32px] card-shadow p-12 text-center border border-olive/5">
                        <p className="text-gray-500 serif italic mb-4">How do you say this in French?</p>
                        <h2 className="text-8xl serif font-bold text-olive">{quizQuestions[quizIndex].number.value}</h2>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {quizQuestions[quizIndex].options?.map((option, i) => (
                          <button
                            key={i}
                            onClick={() => handleAnswer(option)}
                            className={`group p-5 rounded-2xl text-lg font-medium transition-all border-2 text-left flex justify-between items-center relative
                              ${selectedOption === option 
                                ? (option === quizQuestions[quizIndex].number.cardinal ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700')
                                : (selectedOption && option === quizQuestions[quizIndex].number.cardinal ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-transparent hover:border-olive/20 text-olive card-shadow')
                              }`}
                          >
                            <span className="capitalize">{option}</span>
                            <div className="flex items-center gap-3">
                              {showHints && !selectedOption && (
                                <span className="text-[10px] opacity-60 font-mono border border-olive/20 px-1.5 rounded bg-cream/50">Key {i + 1}</span>
                              )}
                              {selectedOption === option && (
                                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                  {option === quizQuestions[quizIndex].number.cardinal ? '✨' : '❌'}
                                </motion.span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="bg-white rounded-[32px] card-shadow p-12 text-center border border-olive/5">
                        <div className="w-20 h-20 bg-olive/10 rounded-full flex items-center justify-center mx-auto mb-6">
                          <Headphones className="text-olive w-10 h-10" />
                        </div>
                        <p className="text-gray-500 serif italic mb-4">Type what you hear</p>
                        <button 
                          onClick={() => playAudio(quizQuestions[quizIndex].number.cardinal)}
                          className="p-4 bg-olive/5 hover:bg-olive/10 rounded-full text-olive transition-colors relative group"
                        >
                          <Volume2 size={32} />
                          {showHints && (
                            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] opacity-0 group-hover:opacity-60 font-mono border border-olive/20 px-1.5 rounded bg-cream/50 whitespace-nowrap transition-opacity">{isMac ? 'Option' : 'Alt'} + S</span>
                          )}
                        </button>
                      </div>
                      
                      <div className="relative">
                        <input
                          ref={inputRef}
                          type="text"
                          value={userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && userInput.trim() !== '' && !selectedOption && handleAnswer(userInput)}
                          onFocus={() => setIsInputFocused(true)}
                          onBlur={() => setIsInputFocused(false)}
                          placeholder={isInputFocused ? "" : "Type the French word..."}
                          className={`w-full p-6 rounded-2xl border-2 text-xl font-medium text-center transition-all outline-none
                            ${selectedOption 
                              ? (userInput.toLowerCase().trim() === quizQuestions[quizIndex].number.cardinal.toLowerCase() ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700')
                              : 'bg-white border-transparent focus:border-olive/20 card-shadow text-olive'
                            }`}
                        />
                        {selectedOption && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center mt-4 text-olive font-medium serif italic"
                          >
                            Correct answer: <span className="font-bold">{quizQuestions[quizIndex].number.cardinal}</span>
                          </motion.div>
                        )}
                      </div>

                      <button
                        onClick={() => handleAnswer(userInput)}
                        disabled={!userInput.trim() || !!selectedOption}
                        className="w-full bg-olive text-white py-4 rounded-2xl font-bold disabled:opacity-50 shadow-lg cursor-pointer disabled:cursor-not-allowed"
                      >
                        Check Answer
                      </button>
                    </div>
                  )}

                  {/* Quiz Keyboard Hints */}
                  <AnimatePresence>
                    {showHints && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden relative group mt-8"
                      >
                        <div className="flex justify-center gap-4 text-[11px] text-olive/50 font-medium uppercase tracking-widest transition-all duration-300 group-hover:blur-md group-hover:opacity-20">
                          {quizQuestions[quizIndex]?.type === 'multiple-choice' ? (
                            <div className="flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded-md border border-olive/5">
                              <span className="bg-white px-1.5 py-0.5 rounded border border-olive/20 shadow-sm text-olive">1-4</span>
                              <span>Select Answer</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded-md border border-olive/5">
                              <span className="bg-white px-3 py-0.5 rounded border border-olive/20 shadow-sm text-olive">Enter</span>
                              <span>Submit</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded-md border border-olive/5">
                            <span className="bg-white px-1.5 py-0.5 rounded border border-olive/20 shadow-sm text-olive">{isMac ? 'Option' : 'Alt'} + S</span>
                            <span>Listen</span>
                          </div>
                        </div>

                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <button 
                            onClick={toggleHints}
                            className="bg-olive text-white text-[10px] px-4 py-1.5 rounded-full font-bold uppercase tracking-widest shadow-lg hover:scale-105 transition-transform cursor-pointer"
                          >
                            Hide Shortcuts
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-[32px] card-shadow p-12 text-center border border-olive/5"
                >
                  <h2 className="text-4xl serif font-bold text-olive mb-2">Quiz Complete!</h2>
                  <p className="text-gray-600 mb-8">You scored {score} out of 10</p>
                  
                  <div className="text-6xl font-bold text-olive mb-10">
                    {Math.round((score / 10) * 100)}%
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => setMode('menu')}
                      className="flex-1 border-2 border-olive text-olive py-4 rounded-2xl font-bold hover:bg-olive/5 transition-colors"
                    >
                      Menu
                    </button>
                    <button 
                      onClick={generateQuiz}
                      className="flex-1 bg-olive text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                    >
                      <RotateCcw size={20} />
                      Try Again
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-8 pb-8 text-center w-full max-w-lg mx-auto">
        <div className="flex flex-col items-center gap-4 text-olive/60">
          <div className="flex items-center gap-6">
            <a 
              href="mailto:zoey42zhang@gmail.com" 
              className="hover:text-olive text-sm transition-colors flex items-center gap-2"
              title="Contact via Email"
            >
              <Mail size={16} />
              <span>Contact</span>
            </a>
            <a 
              href="https://discord.gg/vpBvgSG3" 
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-olive text-sm transition-colors flex items-center gap-2"
              title="Join Discord Community"
            >
              <MessageCircle size={16} />
              <span>Discord</span>
            </a>
          </div>
          {mode !== 'menu' && !showHints && (
            <button 
              onClick={toggleHints}
              className="text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity cursor-pointer"
            >
              Show Shortcuts
            </button>
          )}
        </div>
      </footer>

      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
