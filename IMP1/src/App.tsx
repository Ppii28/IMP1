/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, 
  ChevronRight, 
  MessageSquare, 
  BarChart3, 
  CheckCircle2, 
  AlertCircle,
  Mic,
  MicOff,
  Send,
  RefreshCcw,
  Trophy,
  Target,
  Zap,
  Volume2,
  VolumeX,
  Bot,
  X,
  Headphones,
  StopCircle
} from 'lucide-react';
import { 
  InterviewSession, 
  InterviewQuestion, 
  InterviewResponse, 
  OverallEvaluation,
  ResponseEvaluation
} from './types';
import { geminiService } from './services/geminiService';
import { cn } from './lib/utils';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

// --- Components ---

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      const response = await geminiService.chatWithAssistant(userMsg, history);
      if (response) {
        setMessages(prev => [...prev, { role: 'model', text: response }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white dark:bg-slate-900 w-[350px] h-[500px] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden mb-4"
          >
            <div className="p-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot size={20} className="text-indigo-400" />
                <span className="font-bold">Career Coach</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <Bot size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">Ask me anything about your interview prep or career!</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={cn(
                  "max-w-[85%] p-3 rounded-2xl text-sm",
                  m.role === 'user' 
                    ? "bg-indigo-600 text-white ml-auto rounded-tr-none" 
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm border border-slate-100 dark:border-slate-700 rounded-tl-none"
                )}>
                  {m.text}
                </div>
              ))}
              {isTyping && (
                <div className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-none p-3 max-w-[85%] text-sm flex gap-1">
                  <span className="w-1 h-1 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" />
                  <span className="w-1 h-1 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1 h-1 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              )}
            </div>

            <form onSubmit={handleSend} className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Type a message..."
                  className="w-full pl-4 pr-10 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-600 hover:text-indigo-700">
                  <Send size={18} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-slate-900 text-white rounded-2xl shadow-xl flex items-center justify-center hover:scale-110 transition-transform"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>
    </div>
  );
};

const LiveMode = ({ onExit }: { onExit: () => void }) => {
  const [isConnecting, setIsConnecting] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState('');
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  useEffect(() => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const startLiveSession = async () => {
      try {
        const sessionPromise = ai.live.connect({
          model: "gemini-2.5-flash-native-audio-preview-09-2025",
          callbacks: {
            onopen: () => {
              setIsConnecting(false);
              setIsListening(true);
              sessionPromise.then(session => startMic(session));
            },
            onmessage: async (message: LiveServerMessage) => {
              const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (base64Audio) {
                playAudio(base64Audio);
              }
              if (message.serverContent?.modelTurn?.parts[0]?.text) {
                setTranscription(prev => prev + ' ' + message.serverContent?.modelTurn?.parts[0]?.text);
              }
            },
            onclose: () => onExit(),
            onerror: (err) => console.error("Live API Error:", err),
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
            },
            systemInstruction: "You are a professional interviewer. Conduct a realistic, conversational job interview. Ask follow-up questions based on the user's answers. Keep it professional but engaging.",
          },
        });
        
        sessionRef.current = await sessionPromise;
      } catch (error) {
        console.error("Failed to connect to Live API:", error);
        onExit();
      }
    };

    const startMic = async (session: any) => {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
        }
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        session.sendRealtimeInput({
          media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
        });
      };

      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
    };

    const playAudio = (base64: string) => {
      const audio = new Audio(`data:audio/wav;base64,${base64}`);
      audio.play();
    };

    startLiveSession();

    return () => {
      if (sessionRef.current) sessionRef.current.close();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-slate-900 z-[100] flex flex-col items-center justify-center p-8 text-white"
    >
      <div className="absolute top-8 right-8">
        <button onClick={onExit} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-all">
          <X size={24} />
        </button>
      </div>

      <div className="relative mb-12">
        <div className="w-48 h-48 rounded-full bg-indigo-600/20 flex items-center justify-center">
          <div className={cn(
            "w-32 h-32 rounded-full bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-500/50",
            !isConnecting && "animate-pulse"
          )}>
            <Headphones size={48} />
          </div>
        </div>
        {!isConnecting && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 border border-indigo-500/30 rounded-full animate-ping" />
          </div>
        )}
      </div>

      <div className="text-center max-w-lg">
        <h2 className="text-3xl font-bold mb-4">
          {isConnecting ? "Connecting to Live Interviewer..." : "Live Interview in Progress"}
        </h2>
        <p className="text-indigo-200/60 font-medium uppercase tracking-widest mb-8">
          {isConnecting ? "Initializing Audio Stream" : "Speak naturally, I'm listening"}
        </p>
        
        <div className="bg-white/5 p-6 rounded-3xl border border-white/10 min-h-[100px] flex items-center justify-center">
          <p className="text-slate-400 italic">
            {transcription || "Listening for your response..."}
          </p>
        </div>
      </div>

      <div className="mt-12">
        <button 
          onClick={onExit}
          className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-rose-700 transition-all shadow-xl shadow-rose-900/20"
        >
          <StopCircle size={24} /> End Session
        </button>
      </div>
    </motion.div>
  );
};

const SetupScreen = ({ onStart, onLiveStart, isLoading }: { 
  onStart: (role: string, difficulty: string, counts: { technical: number, behavioral: number, situational: number }) => void, 
  onLiveStart: () => void, 
  isLoading: boolean 
}) => {
  const [role, setRole] = useState('');
  const [difficulty, setDifficulty] = useState('mid');
  const [counts, setCounts] = useState({ technical: 3, behavioral: 2, situational: 1 });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role || isLoading) return;
    onStart(role, difficulty, counts);
  };

  const updateCount = (type: keyof typeof counts, val: number) => {
    setCounts(prev => ({ ...prev, [type]: Math.max(0, prev[type] + val) }));
  };

  const totalQuestions = counts.technical + counts.behavioral + counts.situational;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto p-8 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-black/5 dark:border-white/5"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-600 rounded-2xl text-white">
          <Briefcase size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Prepare for Success</h1>
          <p className="text-slate-500 dark:text-slate-400">Configure your AI-powered interview simulator</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Target Job Role</label>
          <input 
            type="text" 
            placeholder="e.g. Senior Software Engineer, Product Manager..."
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Experience Level</label>
          <div className="grid grid-cols-3 gap-4">
            {['entry', 'mid', 'senior'].map((level) => (
              <button
                key={level}
                type="button"
                disabled={isLoading}
                onClick={() => setDifficulty(level)}
                className={cn(
                  "py-3 px-4 rounded-xl border-2 transition-all capitalize font-medium",
                  difficulty === level 
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400" 
                    : "border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700"
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Question Mix ({totalQuestions} total)</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(['technical', 'behavioral', 'situational'] as const).map((type) => (
              <div key={type} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{type}</span>
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => updateCount(type, -1)}
                    className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    -
                  </button>
                  <span className="text-xl font-black text-slate-900 dark:text-white min-w-[20px] text-center">{counts[type]}</span>
                  <button 
                    type="button"
                    onClick={() => updateCount(type, 1)}
                    className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="submit"
            disabled={!role || isLoading || totalQuestions === 0}
            className="py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-slate-200 dark:shadow-none"
          >
            {isLoading ? (
              <RefreshCcw className="animate-spin" size={20} />
            ) : (
              <>
                Standard Mode <ChevronRight size={20} />
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={onLiveStart}
            disabled={isLoading}
            className="py-4 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
          >
            <Headphones size={20} /> Live Voice Mode
          </button>
        </div>
      </form>
    </motion.div>
  );
};

const InterviewScreen = ({ 
  session, 
  onResponse 
}: { 
  session: InterviewSession, 
  onResponse: (answer: string) => void 
}) => {
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const currentQuestion = session.questions[session.currentQuestionIndex];

  const handleTTS = async () => {
    if (isPlaying || !currentQuestion) return;
    setIsPlaying(true);
    try {
      const base64Audio = await geminiService.textToSpeech(currentQuestion.text);
      if (base64Audio) {
        const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
        audio.onended = () => setIsPlaying(false);
        audio.play();
      }
    } catch (error) {
      console.error("TTS error:", error);
      setIsPlaying(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          const text = await geminiService.transcribeAudio(base64Audio);
          if (text) setAnswer(prev => prev + (prev ? ' ' : '') + text);
          setIsRecording(false);
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Recording error:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || isSubmitting) return;
    setIsSubmitting(true);
    onResponse(answer);
    setAnswer('');
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-32 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-indigo-600"
              initial={{ width: 0 }}
              animate={{ width: `${((session.currentQuestionIndex) / session.questions.length) * 100}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Question {session.currentQuestionIndex + 1} of {session.questions.length}
          </span>
        </div>
        <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          {session.role} • {session.difficulty}
        </div>
      </div>

      {/* Main Interview Area */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Interviewer Avatar/Status */}
        <div className="md:col-span-4 space-y-4">
          <div className="aspect-square bg-slate-900 dark:bg-slate-950 rounded-3xl flex flex-col items-center justify-center p-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent opacity-50" />
            <div className="relative z-10 w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40 mb-4">
              <Zap className="text-white" size={40} />
            </div>
            <div className="relative z-10 text-center">
              <h3 className="text-white font-bold text-lg">AI Interviewer</h3>
              <p className="text-indigo-200/60 text-xs font-medium uppercase tracking-widest">Analyzing Live...</p>
            </div>
            
            {/* Pulsing rings when "listening" */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <div className="w-48 h-48 border border-white/10 rounded-full animate-ping opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Interview Tips</h4>
            <ul className="space-y-2">
              <li className="flex gap-2 text-sm text-slate-600 dark:text-slate-400">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>Be specific with examples (STAR method).</span>
              </li>
              <li className="flex gap-2 text-sm text-slate-600 dark:text-slate-400">
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                <span>Focus on your impact and results.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Chat Area */}
        <div className="md:col-span-8 flex flex-col gap-4">
          {session.currentQuestionIndex > 0 && session.responses[session.currentQuestionIndex - 1]?.evaluation && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-indigo-600" />
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Last Answer Confidence</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-24 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-1000" 
                    style={{ width: `${session.responses[session.currentQuestionIndex - 1].evaluation?.confidenceScore}%` }}
                  />
                </div>
                <span className="text-[10px] font-black text-indigo-600">{session.responses[session.currentQuestionIndex - 1].evaluation?.confidenceScore}%</span>
              </div>
            </motion.div>
          )}

          <motion.div 
            key={currentQuestion?.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-black/5 dark:border-white/5 min-h-[200px] flex flex-col justify-center relative"
          >
            <div className="flex justify-between items-start mb-4">
              <span className="inline-block px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-widest rounded w-fit">
                {currentQuestion?.category} Question
              </span>
              <button 
                onClick={handleTTS}
                disabled={isPlaying}
                className={cn(
                  "p-2 rounded-xl transition-all",
                  isPlaying ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
              >
                {isPlaying ? <Volume2 className="animate-pulse" size={18} /> : <Volume2 size={18} />}
              </button>
            </div>
            <h2 className="text-2xl font-medium text-slate-800 dark:text-slate-100 leading-tight">
              "{currentQuestion?.text}"
            </h2>
          </motion.div>

          <form onSubmit={handleSubmit} className="relative">
            <textarea
              placeholder="Type your answer or use the microphone..."
              className="w-full p-6 pr-48 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all min-h-[160px] resize-none shadow-sm text-slate-700 dark:text-slate-200"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                  "p-4 rounded-2xl transition-all shadow-lg",
                  isRecording 
                    ? "bg-rose-600 text-white animate-pulse shadow-rose-200" 
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 shadow-slate-100 dark:shadow-none"
                )}
              >
                {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
              <button
                type="submit"
                disabled={!answer.trim() || isSubmitting}
                className="px-6 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-200 dark:shadow-none font-bold flex items-center gap-2"
              >
                {isSubmitting ? (
                  <RefreshCcw className="animate-spin" size={20} />
                ) : (
                  <>
                    Submit Answer <Send size={20} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const EvaluationScreen = ({ 
  evaluation, 
  responses, 
  onRestart 
}: { 
  evaluation: OverallEvaluation, 
  responses: InterviewResponse[],
  onRestart: () => void 
}) => {
  const radarData = [
    { subject: 'Overall', A: evaluation.overallScore, fullMark: 100 },
    { subject: 'Communication', A: evaluation.communicationScore, fullMark: 100 },
    { subject: 'Confidence', A: evaluation.confidenceScore, fullMark: 100 },
    { subject: 'Technical', A: evaluation.technicalScore, fullMark: 100 },
  ];

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-rose-600';
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto space-y-8 pb-12"
    >
      {/* Header Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl border border-black/5 dark:border-white/5">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Interview Performance Report</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Comprehensive analysis of your session</p>
            </div>
            <div className="text-right">
              <div className={cn("text-5xl font-black", scoreColor(evaluation.overallScore))}>
                {evaluation.overallScore}%
              </div>
              <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Overall Score</div>
            </div>
          </div>
          
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg">
              {evaluation.summary}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            {evaluation.keyTakeaways.map((takeaway, i) => (
              <div key={i} className="flex gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <Target className="text-indigo-600 shrink-0" size={20} />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{takeaway}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 dark:bg-slate-950 p-8 rounded-3xl shadow-xl text-white flex flex-col justify-between border border-white/5">
          <div>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <BarChart3 size={20} className="text-indigo-400" />
              Skill Breakdown
            </h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Radar
                    name="Performance"
                    dataKey="A"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.6}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <button
            onClick={onRestart}
            className="w-full py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all mt-8"
          >
            <RefreshCcw size={20} /> Try Another Role
          </button>
        </div>
      </div>

      {/* Detailed Question Feedback */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white px-4">Question-by-Question Analysis</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {responses.map((resp, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-md border border-black/5 dark:border-white/5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Question {idx + 1}</span>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Confidence</p>
                    <p className="text-xs font-black text-indigo-600">{resp.evaluation?.confidenceScore}%</p>
                  </div>
                  <span className={cn("text-lg font-bold", scoreColor(resp.evaluation?.score || 0))}>
                    {resp.evaluation?.score}%
                  </span>
                </div>
              </div>
              <p className="font-medium text-slate-800 dark:text-slate-200 line-clamp-2 italic">
                "{resp.answer.substring(0, 100)}..."
              </p>
              
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="text-emerald-500 shrink-0 mt-1" size={16} />
                  <p className="text-xs text-slate-600 dark:text-slate-400"><span className="font-bold text-slate-800 dark:text-slate-200">Strength:</span> {resp.evaluation?.strengths[0]}</p>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="text-amber-500 shrink-0 mt-1" size={16} />
                  <p className="text-xs text-slate-600 dark:text-slate-400"><span className="font-bold text-slate-800 dark:text-slate-200">Improve:</span> {resp.evaluation?.improvements[0]}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const LandingPage = ({ onGetStarted }: { onGetStarted: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-24 pb-24"
    >
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <span className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-sm font-bold uppercase tracking-widest">
                AI-Powered Career Growth
              </span>
              <h1 className="text-6xl lg:text-7xl font-black tracking-tighter leading-[0.9] mt-6 text-slate-900 dark:text-white">
                Master Your <br />
                <span className="text-indigo-600 dark:text-indigo-400">Next Interview</span>
              </h1>
              <p className="text-xl text-slate-500 dark:text-slate-400 mt-8 max-w-lg leading-relaxed">
                IntervAI uses advanced Gemini intelligence to simulate realistic interviews, providing real-time feedback on your communication, confidence, and technical accuracy.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <button 
                onClick={onGetStarted}
                className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-lg hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-2xl shadow-slate-200 dark:shadow-none flex items-center justify-center gap-2 group"
              >
                Get Started Free <ChevronRight className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button className="px-8 py-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                View Demo
              </button>
            </motion.div>

            <div className="flex items-center gap-6 pt-4">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <img src={`https://picsum.photos/seed/${i + 10}/100/100`} alt="User" referrerPolicy="no-referrer" />
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                Joined by <span className="text-slate-900 dark:text-white font-bold">10,000+</span> ambitious professionals
              </p>
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="relative"
          >
            <div className="aspect-square bg-indigo-600 rounded-[3rem] rotate-3 absolute inset-0 opacity-10" />
            <div className="relative bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800">
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Communication Score</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white">92% <span className="text-xs text-emerald-500 dark:text-emerald-400 font-bold ml-1">+5% improvement</span></p>
                  </div>
                </div>
                
                <div className="p-6 bg-slate-900 dark:bg-slate-950 rounded-3xl text-white">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-bold text-indigo-400">AI Feedback</p>
                    <Zap size={16} className="text-indigo-400" />
                  </div>
                  <p className="text-sm text-slate-300 dark:text-slate-400 leading-relaxed italic">
                    "Your explanation of the STAR method was excellent. Try to maintain more consistent eye contact and reduce filler words like 'um' to boost your confidence score."
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-slate-100 dark:border-slate-800 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Confidence</p>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 w-[85%]" />
                    </div>
                  </div>
                  <div className="p-4 border border-slate-100 dark:border-slate-800 rounded-2xl">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Technical</p>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[78%]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Everything you need to ace it</h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 mt-4">Our platform combines multiple AI models to give you the most comprehensive interview prep available.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Live Voice Mode",
              desc: "Practice real-time conversations with our low-latency voice AI that responds just like a human recruiter.",
              icon: <Headphones className="text-indigo-600 dark:text-indigo-400" />,
              color: "bg-indigo-50 dark:bg-indigo-900/20"
            },
            {
              title: "Deep Analysis",
              desc: "Get detailed feedback on your answers using Gemini's 'Thinking Mode' for complex reasoning and evaluation.",
              icon: <BarChart3 className="text-emerald-600 dark:text-emerald-400" />,
              color: "bg-emerald-50 dark:bg-emerald-900/20"
            },
            {
              title: "Career Coach",
              desc: "A 24/7 AI assistant to help with resume tips, salary negotiation, and specific company research.",
              icon: <Bot className="text-amber-600 dark:text-amber-400" />,
              color: "bg-amber-50 dark:bg-amber-900/20"
            }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -5 }}
              className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-6"
            >
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", feature.color)}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{feature.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-slate-900 dark:bg-indigo-600 rounded-[3rem] p-12 lg:p-20 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-600/20 dark:bg-white/10 blur-[100px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-600/20 dark:bg-white/10 blur-[100px] translate-x-1/2 translate-y-1/2" />
        
        <div className="relative z-10 max-w-2xl mx-auto space-y-8">
          <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight">Ready to land your dream job?</h2>
          <p className="text-xl text-slate-400 dark:text-indigo-100">Join thousands of candidates who improved their interview scores by 40% in just one week.</p>
          <button 
            onClick={onGetStarted}
            className="px-10 py-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl font-bold text-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-2xl"
          >
            Start Your First Session
          </button>
        </div>
      </section>
    </motion.div>
  );
};

const UserDashboard = ({ 
  sessions, 
  onStartNew,
  dailyGoal,
  onUpdateGoal
}: { 
  sessions: any[], 
  onStartNew: () => void,
  dailyGoal: number,
  onUpdateGoal: (goal: number) => void
}) => {
  const averageScore = sessions.length > 0 
    ? Math.round(sessions.reduce((acc, s) => acc + s.evaluation.overallScore, 0) / sessions.length)
    : 0;

  const today = new Date().toLocaleDateString();
  const questionsToday = sessions
    .filter(s => s.date === today)
    .reduce((acc, s) => acc + (s.questionCount || 0), 0);
  
  const performanceData = sessions.map((s, i) => ({
    name: `Session ${i + 1}`,
    score: s.evaluation.overallScore,
    comm: s.evaluation.communicationScore,
    conf: s.evaluation.confidenceScore
  }));

  const goalProgress = Math.min(100, (questionsToday / dailyGoal) * 100);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-8 pb-12"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">User Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400">Track your progress and interview history</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end mr-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Daily Goal</span>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                value={dailyGoal}
                onChange={(e) => onUpdateGoal(parseInt(e.target.value) || 0)}
                className="w-12 bg-transparent border-b border-slate-200 dark:border-slate-800 text-right font-bold text-slate-900 dark:text-white focus:border-indigo-500 outline-none"
              />
              <span className="text-xs text-slate-400">questions</span>
            </div>
          </div>
          <button 
            onClick={onStartNew}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2"
          >
            <Zap size={18} /> New Interview
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Average Score</p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-slate-900 dark:text-white">{averageScore}%</span>
          </div>
          <div className="mt-4 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${averageScore}%` }}
              className="h-full bg-indigo-600"
            />
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Daily Progress</p>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-black text-slate-900 dark:text-white">{questionsToday}</span>
            <span className="text-xs font-bold text-slate-400 mb-1">/ {dailyGoal}</span>
          </div>
          <div className="mt-4 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${goalProgress}%` }}
              className={cn("h-full transition-all duration-1000", goalProgress >= 100 ? "bg-emerald-500" : "bg-indigo-600")}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Sessions</p>
          <span className="text-4xl font-black text-slate-900 dark:text-white">{sessions.length}</span>
          <p className="text-xs text-slate-500 mt-2">Last: {sessions.length > 0 ? 'Today' : 'None'}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Top Skill</p>
          <span className="text-2xl font-black text-slate-900 dark:text-white">Communication</span>
          <div className="flex gap-1 mt-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className={cn("h-1 flex-1 rounded-full", i <= 4 ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-800")} />
            ))}
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Performance Trends</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={performanceData}>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
              <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent History */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white px-2">Recent Interviews</h3>
        <div className="grid grid-cols-1 gap-4">
          {sessions.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700">
              <Briefcase className="mx-auto text-slate-300 mb-4" size={48} />
              <p className="text-slate-500">No interview history yet. Start your first session!</p>
            </div>
          ) : (
            sessions.map((s, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl flex items-center justify-center">
                    <Briefcase size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white">{s.role}</h4>
                    <p className="text-xs text-slate-500 uppercase tracking-widest">{s.difficulty} • {s.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-2xl font-black text-indigo-600">{s.evaluation.overallScore}%</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Score</p>
                  </div>
                  <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                    <ChevronRight size={20} className="text-slate-400" />
                  </button>
                </div>
              </div>
            )).reverse()
          )}
        </div>
      </div>
    </motion.div>
  );
};

const AuthModal = ({ 
  isOpen, 
  onClose, 
  initialMode, 
  onLoginSuccess 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  initialMode: 'login' | 'register',
  onLoginSuccess: (user: { email: string, name: string }) => void
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setMode(initialMode);
    setError('');
  }, [initialMode, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const users = JSON.parse(localStorage.getItem('users') || '[]');

    if (mode === 'register') {
      if (users.find((u: any) => u.email === email)) {
        setError('User already exists');
        return;
      }
      const newUser = { email, password, name };
      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
      setMode('login');
      setError('Registration successful! Please login.');
    } else {
      const user = users.find((u: any) => u.email === email);
      if (!user) {
        setError('User not found. Please register.');
        return;
      }
      if (user.password !== password) {
        setError('Incorrect password');
        return;
      }
      onLoginSuccess({ email: user.email, name: user.name });
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                </h2>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <VolumeX size={20} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
                    <input 
                      type="text" 
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Password</label>
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <p className={cn(
                    "text-sm font-medium p-3 rounded-xl",
                    error.includes('successful') ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  )}>
                    {error}
                  </p>
                )}

                <button 
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none mt-4"
                >
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-sm text-slate-500">
                  {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
                  <button 
                    onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                    className="ml-2 font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    {mode === 'login' ? 'Register Now' : 'Login Here'}
                  </button>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default function App() {
  const [view, setView] = useState<'landing' | 'setup' | 'interview' | 'evaluating' | 'completed' | 'dashboard'>('landing');
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [finalEvaluation, setFinalEvaluation] = useState<OverallEvaluation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email: string, name: string } | null>(null);
  const [dailyGoal, setDailyGoal] = useState(10);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [pastSessions, setPastSessions] = useState<any[]>([]);

  // Initialize theme and load sessions
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }

    const savedSessions = localStorage.getItem('interview_sessions');
    if (savedSessions) {
      setPastSessions(JSON.parse(savedSessions));
    }

    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setIsLoggedIn(true);
    }

    const savedGoal = localStorage.getItem('daily_goal');
    if (savedGoal) {
      setDailyGoal(parseInt(savedGoal));
    }
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const updateDailyGoal = (goal: number) => {
    setDailyGoal(goal);
    localStorage.setItem('daily_goal', goal.toString());
  };

  const handleLoginSuccess = (user: { email: string, name: string }) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setView('landing');
  };

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const startInterview = async (role: string, difficulty: string, counts: { technical: number, behavioral: number, situational: number }) => {
    setIsLoading(true);
    try {
      const questions = await geminiService.generateQuestions(role, difficulty, counts);
      setSession({
        id: Math.random().toString(36).substr(2, 9),
        role,
        difficulty: difficulty as any,
        questions,
        responses: [],
        currentQuestionIndex: 0,
        status: 'interviewing'
      });
      setView('interview');
    } catch (error) {
      console.error("Failed to start interview:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResponse = async (answer: string) => {
    if (!session) return;

    const currentQuestion = session.questions[session.currentQuestionIndex];
    const evaluation = await geminiService.evaluateResponse(currentQuestion.text, answer);
    
    const newResponses = [...session.responses, { 
      questionId: currentQuestion.id, 
      answer, 
      evaluation 
    }];

    if (session.currentQuestionIndex < session.questions.length - 1) {
      setSession({
        ...session,
        responses: newResponses,
        currentQuestionIndex: session.currentQuestionIndex + 1
      });
    } else {
      setView('evaluating');
      setSession({
        ...session,
        responses: newResponses,
        status: 'evaluating'
      });
      
      const history = session.questions.map((q, i) => ({
        question: q.text,
        answer: i === session.currentQuestionIndex ? answer : newResponses[i].answer,
        evaluation: i === session.currentQuestionIndex ? evaluation : newResponses[i].evaluation!
      }));

      const finalReport = await geminiService.generateFinalReport(session.role, history);
      setFinalEvaluation(finalReport);
      
      // Save to history
      const newSessionRecord = {
        role: session.role,
        difficulty: session.difficulty,
        date: new Date().toLocaleDateString(),
        questionCount: session.questions.length,
        evaluation: finalReport
      };
      const updatedSessions = [...pastSessions, newSessionRecord];
      setPastSessions(updatedSessions);
      localStorage.setItem('interview_sessions', JSON.stringify(updatedSessions));

      setView('completed');
      setSession(prev => prev ? { ...prev, status: 'completed' } : null);
    }
  };

  const restart = () => {
    setSession(null);
    setFinalEvaluation(null);
    setIsLiveMode(false);
    setView('landing');
  };

  const handleGetStarted = () => {
    if (isLoggedIn) {
      setView('setup');
    } else {
      openAuth('register');
    }
  };

  const handleLiveStart = () => {
    if (isLoggedIn) {
      setIsLiveMode(true);
    } else {
      openAuth('login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 selection:bg-indigo-100 dark:selection:bg-indigo-900 selection:text-indigo-900 dark:selection:text-indigo-100 transition-colors duration-300">
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        initialMode={authMode}
        onLoginSuccess={handleLoginSuccess}
      />
      
      {/* Navigation / Logo */}
      <nav className="p-6 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2 cursor-pointer" onClick={restart}>
          <div className="w-10 h-10 bg-slate-900 dark:bg-indigo-600 rounded-xl flex items-center justify-center text-white">
            <Zap size={24} />
          </div>
          <span className="text-xl font-black tracking-tighter dark:text-white">IntervAI</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500 dark:text-slate-400">
          <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">How it works</a>
          <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Pricing</a>
          
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
          
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all"
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>

            {!isLoggedIn ? (
              <>
                <button 
                  onClick={() => openAuth('login')}
                  className="hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Login
                </button>
                <button 
                  onClick={() => openAuth('register')}
                  className="px-5 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full hover:bg-slate-800 dark:hover:bg-slate-100 transition-all font-bold"
                >
                  Register
                </button>
              </>
            ) : (
              <div className="flex items-center gap-6 pl-2">
                <button 
                  onClick={() => setView('dashboard')}
                  className={cn(
                    "text-sm font-medium transition-colors",
                    view === 'dashboard' ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  Dashboard
                </button>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                    {currentUser?.name.split(' ').map(n => n[0]).join('') || 'JD'}
                  </div>
                  <div className="relative group">
                    <button className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors">
                      {currentUser?.name.split(' ')[0] || 'Profile'} <ChevronRight size={14} className="rotate-90" />
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-50">
                      <button 
                        onClick={() => setView('dashboard')}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium"
                      >
                        Dashboard
                      </button>
                      <button 
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium text-rose-500"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {view === 'landing' && !isLiveMode && (
            <LandingPage key="landing" onGetStarted={handleGetStarted} />
          )}

          {view === 'setup' && !isLiveMode && (
            <SetupScreen 
              key="setup" 
              onStart={startInterview} 
              onLiveStart={handleLiveStart}
              isLoading={isLoading} 
            />
          )}

          {isLiveMode && (
            <LiveMode key="live" onExit={() => setIsLiveMode(false)} />
          )}

          {view === 'dashboard' && (
            <UserDashboard 
              key="dashboard" 
              sessions={pastSessions} 
              onStartNew={handleGetStarted} 
              dailyGoal={dailyGoal}
              onUpdateGoal={updateDailyGoal}
            />
          )}

          {view === 'interview' && session && (
            <InterviewScreen 
              key="interview" 
              session={session} 
              onResponse={handleResponse} 
            />
          )}

          {view === 'evaluating' && (
            <motion.div 
              key="evaluating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center"
            >
              <div className="relative mb-8">
                <div className="w-24 h-24 border-4 border-indigo-100 dark:border-indigo-900 border-t-indigo-600 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <BarChart3 className="text-indigo-600" size={32} />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Analyzing Your Performance</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2">Our AI is reviewing your communication style and technical accuracy...</p>
            </motion.div>
          )}

          {view === 'completed' && finalEvaluation && session && (
            <EvaluationScreen 
              key="report" 
              evaluation={finalEvaluation} 
              responses={session.responses}
              onRestart={restart}
            />
          )}
        </AnimatePresence>
      </main>

      <Chatbot />

      {/* Footer */}
      <footer className="mt-20 border-t border-slate-200 dark:border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Zap className="text-indigo-600" size={20} />
            <span className="font-bold text-slate-900 dark:text-white">IntervAI</span>
            <span className="text-slate-400 text-sm ml-2">© 2026 AI Studio. All rights reserved.</span>
          </div>
          <div className="flex gap-8 text-sm font-medium text-slate-400">
            <a href="#" className="hover:text-slate-900 dark:hover:text-white">Privacy Policy</a>
            <a href="#" className="hover:text-slate-900 dark:hover:text-white">Terms of Service</a>
            <a href="#" className="hover:text-slate-900 dark:hover:text-white">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
