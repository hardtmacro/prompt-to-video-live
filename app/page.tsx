'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, RefreshCw, Volume2, VolumeX, 
  ChevronDown, ChevronRight, Image as ImageIcon,
  Wand2, AlertCircle, CheckCircle2, Loader2,
  Sparkles, BookOpen
} from 'lucide-react';
import { clsx } from 'clsx';

const VOICE_OPTIONS = [
  { id: 'apollo-en', label: 'Apollo', flag: '☀️' },
  { id: 'arcas-en', label: 'Arcas', flag: '🐻' },
  { id: 'asteria-en', label: 'Asteria', flag: '🎙️' },
  { id: 'athena-en', label: 'Athena', flag: '🦉' },
  { id: 'aurora-en', label: 'Aurora', flag: '✨' },
  { id: 'draco-en', label: 'Draco', flag: '🐉' },
  { id: 'hera-en', label: 'Hera', flag: '👸' },
  { id: 'hermes-en', label: 'Hermes', flag: '🪄' },
  { id: 'iris-en', label: 'Iris', flag: '🌈' },
  { id: 'luna-en', label: 'Luna', flag: '🌙' },
  { id: 'orion-en', label: 'Orion', flag: '🌌' },
  { id: 'orpheus-en', label: 'Orpheus', flag: '🎵' },
  { id: 'pandora-en', label: 'Pandora', flag: '📦' },
  { id: 'phoebe-en', label: 'Phoebe', flag: '🌓' },
  { id: 'zeus-en', label: 'Zeus', flag: '⚡' },
];

const THEME_VOICES: Record<string, { voice: string; voiceLabel: string }> = {
  'adventure': { voice: 'zeus-en', voiceLabel: 'adventure' },
  'love': { voice: 'luna-en', voiceLabel: 'romance' },
  'romance': { voice: 'luna-en', voiceLabel: 'romance' },
  'mystery': { voice: 'orpheus-en', voiceLabel: 'mystery' },
  'sci-fi': { voice: 'asteria-en', voiceLabel: 'sci-fi' },
  'scifi': { voice: 'asteria-en', voiceLabel: 'sci-fi' },
  'fantasy': { voice: 'hermes-en', voiceLabel: 'fantasy' },
  'magical': { voice: 'hermes-en', voiceLabel: 'fantasy' },
  'history': { voice: 'orion-en', voiceLabel: 'historical' },
  'historical': { voice: 'orion-en', voiceLabel: 'historical' },
  'nature': { voice: 'aurora-en', voiceLabel: 'nature' },
  'technology': { voice: 'athena-en', voiceLabel: 'tech' },
  'tech': { voice: 'athena-en', voiceLabel: 'tech' },
  'hero': { voice: 'zeus-en', voiceLabel: 'heroic' },
  'space': { voice: 'orion-en', voiceLabel: 'space' },
  'robot': { voice: 'athena-en', voiceLabel: 'tech' },
  'paris': { voice: 'luna-en', voiceLabel: 'romance' },
  'ancient': { voice: 'orion-en', voiceLabel: 'historical' },
  'ruins': { voice: 'orpheus-en', voiceLabel: 'mystery' },
  'forest': { voice: 'aurora-en', voiceLabel: 'nature' },
  'ocean': { voice: 'iris-en', voiceLabel: 'ocean' },
  'sea': { voice: 'iris-en', voiceLabel: 'ocean' },
  'war': { voice: 'zeus-en', voiceLabel: 'war' },
  'battle': { voice: 'zeus-en', voiceLabel: 'war' },
  'journey': { voice: 'arcas-en', voiceLabel: 'journey' },
  'drama': { voice: 'hera-en', voiceLabel: 'drama' },
  'music': { voice: 'orpheus-en', voiceLabel: 'music' },
  'sun': { voice: 'apollo-en', voiceLabel: 'solar' },
  'night': { voice: 'phoebe-en', voiceLabel: 'nocturnal' },
  'dark': { voice: 'draco-en', voiceLabel: 'dark' },
};

interface Scene {
  id: number;
  prompt: string;
  narration: string;
  voiceId: string;
  imageUrl: string | null;
  isGeneratingImage: boolean;
  isGeneratingAudio: boolean;
  imageError: boolean;
  audioError: boolean;
  audioUrl?: string;
}

const getMatchingThemeVoice = (prompt: string): { voice: string; voiceLabel: string } => {
  const promptLower = prompt.toLowerCase();
  for (const [keyword, theme] of Object.entries(THEME_VOICES)) {
    if (promptLower.includes(keyword)) return theme;
  }
  return { voice: 'luna-en', voiceLabel: 'story' };
};

const generateSceneImageSvg = (prompt: string, sceneIndex: number): string => {
  const colors = [
    ['#667eea', '#764ba2'], ['#f093fb', '#f5576c'], ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'], ['#fa709a', '#fee140'], ['#a8edea', '#fed6e3'],
    ['#ff9a9e', '#fecfef'], ['#ffecd2', '#fcb69f'], ['#ff6b6b', '#556270'],
    ['#4bc0c8', '#c779d0'],
  ];
  const colorPair = colors[sceneIndex % colors.length];
  const promptHash = prompt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const patternType = promptHash % 4;
  let patternSvg = '';
  if (patternType === 0) {
    patternSvg = `<defs><radialGradient id="grad${sceneIndex}" cx="50%" cy="50%" r="50%"><stop offset="0%" style="stop-color:${colorPair[0]};stop-opacity:1" /><stop offset="100%" style="stop-color:${colorPair[1]};stop-opacity:1" /></radialGradient></defs><rect width="800" height="450" fill="url(#grad${sceneIndex})"/><circle cx="${200 + (promptHash % 300)}" cy="${150 + (promptHash % 150)}" r="${50 + (promptHash % 100)}" fill="rgba(255,255,255,0.1)"/>`;
  } else if (patternType === 1) {
    patternSvg = `<defs><linearGradient id="grad${sceneIndex}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:${colorPair[0]};stop-opacity:1" /><stop offset="100%" style="stop-color:${colorPair[1]};stop-opacity:1" /></linearGradient></defs><rect width="800" height="450" fill="url(#grad${sceneIndex})"/>`;
  } else if (patternType === 2) {
    patternSvg = `<defs><linearGradient id="grad${sceneIndex}" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:${colorPair[0]};stop-opacity:1" /><stop offset="100%" style="stop-color:${colorPair[1]};stop-opacity:1" /></linearGradient></defs><rect width="800" height="450" fill="url(#grad${sceneIndex})"/>`;
  } else {
    patternSvg = `<defs><radialGradient id="grad${sceneIndex}" cx="30%" cy="30%" r="70%"><stop offset="0%" style="stop-color:${colorPair[0]};stop-opacity:1" /><stop offset="100%" style="stop-color:${colorPair[1]};stop-opacity:1" /></radialGradient></defs><rect width="800" height="450" fill="url(#grad${sceneIndex})"/>`;
  }
  patternSvg += `<text x="400" y="400" font-family="system-ui, sans-serif" font-size="24" fill="rgba(255,255,255,0.8)" text-anchor="middle">Scene ${sceneIndex + 1}</text>`;
  return `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">${patternSvg}</svg>`)}`;
};

export default function PromptToVideoLive() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [mainPrompt, setMainPrompt] = useState('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [scriptGenerated, setScriptGenerated] = useState(false);

  const sceneRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const scenesRef = useRef<Scene[]>([]);

  useEffect(() => { scenesRef.current = scenes; }, [scenes]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  useEffect(() => {
    if (autoScroll && isPlaying) {
      const el = sceneRefs.current.get(scenes[currentSceneIndex]?.id);
      if (el && containerRef.current) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentSceneIndex, autoScroll, isPlaying, scenes]);

  const playAudioUrl = useCallback((url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => resolve();
      audio.onerror = (e) => reject(e);
      audio.play().catch(reject);
    });
  }, []);

  const fetchTtsAudio = useCallback(async (text: string, voiceId: string): Promise<string> => {
    console.log(`[TTS Fetch] Calling /api/tts with voiceId="${voiceId}"`);
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId }),
    });
    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Unknown error');
      throw new Error(`TTS API error ${res.status}: ${errorText}`);
    }
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }, []);

  const generateScenesFromPrompt = (prompt: string, matchedTheme: { voice: string; voiceLabel: string }): Scene[] => {
    const storyArcs = [
      { type: 'opening', template: { prompt: `${prompt} - establishing shot, wide cinematic view, dramatic lighting`, narration: `Welcome to ${prompt}. This is where our journey begins, in a world where every moment holds wonder and possibility.`, voiceId: matchedTheme.voice } },
      { type: 'rising', template: { prompt: `${prompt} - action moment, dynamic composition, intense atmosphere`, narration: `As the story unfolds, we discover the true essence of this ${matchedTheme.voiceLabel}. Every detail reveals a deeper meaning.`, voiceId: matchedTheme.voice } },
      { type: 'climax', template: { prompt: `${prompt} - dramatic peak moment, powerful visuals, emotional intensity`, narration: `At this pivotal moment, everything changes. The stakes are highest, and the journey reaches its dramatic peak.`, voiceId: matchedTheme.voice } },
      { type: 'resolution', template: { prompt: `${prompt} - peaceful conclusion, warm lighting, satisfying ending`, narration: `And so our tale comes to a peaceful close, leaving us with memories that will last forever.`, voiceId: matchedTheme.voice } },
    ];
    return storyArcs.map((arc, index) => ({
      id: index + 1, prompt: arc.template.prompt, narration: arc.template.narration,
      voiceId: arc.template.voiceId, imageUrl: null, isGeneratingImage: false,
      isGeneratingAudio: false, imageError: false, audioError: false,
    }));
  };

  const generateSceneImage = async (index: number) => {
    const scene = scenesRef.current[index];
    if (!scene) return;
    setScenes(prev => prev.map((s, i) => i === index ? { ...s, isGeneratingImage: true, imageError: false } : s));
    try {
      console.log(`[Image] Calling /api/image for scene ${index + 1}`);
      const res = await fetch('/api/image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: scene.prompt }) });
      if (!res.ok) throw new Error(`Image API error ${res.status}`);
      const data = await res.json();
      const imageUrl = data.url || data.imageUrl;
      if (!imageUrl) throw new Error('No image URL in response');
      setScenes(prev => prev.map((s, i) => i === index ? { ...s, imageUrl, isGeneratingImage: false } : s));
    } catch (error) {
      console.error('Image generation error, using SVG fallback:', error);
      const svgDataUrl = generateSceneImageSvg(scene.prompt, index);
      setScenes(prev => prev.map((s, i) => i === index ? { ...s, imageUrl: svgDataUrl, isGeneratingImage: false } : s));
    }
  };

  const generateSceneAudio = async (index: number) => {
    const scene = scenesRef.current[index];
    if (!scene) return;
    setScenes(prev => prev.map((s, i) => i === index ? { ...s, isGeneratingAudio: true, audioError: false } : s));
    try {
      console.log(`[Audio Gen] Scene ${index + 1}: Calling /api/tts with voiceId="${scene.voiceId}"`);
      const audioUrl = await fetchTtsAudio(scene.narration, scene.voiceId);
      setScenes(prev => prev.map((s, i) => i === index ? { ...s, isGeneratingAudio: false, audioUrl } : s));
    } catch (error) {
      console.error('Audio generation error:', error);
      setScenes(prev => prev.map((s, i) => i === index ? { ...s, isGeneratingAudio: false, audioError: true } : s));
    }
  };

  // FIX: generateScript now syncs scenesRef immediately and triggers /api/ calls
  const generateScript = async () => {
    if (!mainPrompt.trim()) return;
    setIsGeneratingScript(true);

    let generatedScenes: Scene[] = [];
    try {
      const matchedTheme = getMatchingThemeVoice(mainPrompt);
      generatedScenes = generateScenesFromPrompt(mainPrompt, matchedTheme);
      setScenes(generatedScenes);
      scenesRef.current = generatedScenes; // FIX: sync ref immediately so generation functions can read it
      setScriptGenerated(true);
      setCurrentSceneIndex(0);
    } catch (error) {
      console.error('Script generation error:', error);
      const matchedTheme = getMatchingThemeVoice(mainPrompt);
      generatedScenes = generateScenesFromPrompt(mainPrompt, matchedTheme);
      setScenes(generatedScenes);
      scenesRef.current = generatedScenes; // FIX: sync ref immediately
      setScriptGenerated(true);
      setCurrentSceneIndex(0);
    } finally {
      setIsGeneratingScript(false);
    }

    // FIX: auto-trigger /api/image and /api/tts calls for every scene
    if (generatedScenes.length > 0) {
      setGeneratingAll(true);
      try {
        for (let i = 0; i < generatedScenes.length; i++) {
          await generateSceneImage(i);
          await generateSceneAudio(i);
        }
      } catch (error) {
        console.error('Asset generation error:', error);
      } finally {
        setGeneratingAll(false);
      }
    }
  };

  const resetScript = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setScenes([]); scenesRef.current = [];
    setScriptGenerated(false); setMainPrompt('');
    setCurrentSceneIndex(0); setIsPlaying(false); isPlayingRef.current = false;
  };

  const playNextScene = useCallback(async (index: number) => {
    if (!isPlayingRef.current) { setIsPlaying(false); return; }
    const currentScenes = scenesRef.current;
    if (index >= currentScenes.length) { setIsPlaying(false); isPlayingRef.current = false; return; }
    setCurrentSceneIndex(index);
    const scene = currentScenes[index];
    if (!scene) return;
    let audioUrl = scene.audioUrl;
    if (!audioUrl) {
      try {
        audioUrl = await fetchTtsAudio(scene.narration, scene.voiceId);
        setScenes(prev => prev.map((s, i) => i === index ? { ...s, audioUrl } : s));
      } catch (error) {
        console.error(`[Playback] TTS error for scene ${index + 1}:`, error);
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (isPlayingRef.current) await playNextScene(index + 1);
        return;
      }
    }
    if (audioUrl) {
      try { await playAudioUrl(audioUrl); } catch (error) { console.error(`[Playback] Audio play error:`, error); }
    }
    if (isPlayingRef.current) await playNextScene(index + 1);
  }, [fetchTtsAudio, playAudioUrl]);

  const togglePlay = async () => {
    if (isPlaying) {
      setIsPlaying(false); isPlayingRef.current = false;
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    } else {
      const currentScene = scenesRef.current[currentSceneIndex];
      if (currentScene && !currentScene.imageUrl && !currentScene.isGeneratingImage) {
        await generateSceneImage(currentSceneIndex);
      }
      setIsPlaying(true); isPlayingRef.current = true;
      playNextScene(currentSceneIndex);
    }
  };

  const playSceneAudio = async (index: number) => {
    const scene = scenesRef.current[index];
    if (!scene) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    let audioUrl = scene.audioUrl;
    if (!audioUrl) {
      try {
        audioUrl = await fetchTtsAudio(scene.narration, scene.voiceId);
        setScenes(prev => prev.map((s, i) => i === index ? { ...s, audioUrl } : s));
      } catch (error) { console.error('Error fetching TTS:', error); return; }
    }
    try { await playAudioUrl(audioUrl); } catch (error) { console.error('Error playing audio:', error); }
  };

  const generateAllScenes = async () => {
    setGeneratingAll(true);
    for (let i = 0; i < scenesRef.current.length; i++) {
      await generateSceneImage(i);
      await generateSceneAudio(i);
    }
    setGeneratingAll(false);
  };

  const updateScene = (index: number, updates: Partial<Scene>) => {
    setScenes(prev => prev.map((s, i) => i === index ? { ...s, ...updates } : s));
  };

  const skipToScene = (index: number) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setCurrentSceneIndex(index); setIsPlaying(true); isPlayingRef.current = true;
    playNextScene(index);
  };

  useEffect(() => { return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } }; }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <motion.header initial={{ y: -100 }} animate={{ y: 0 }} className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">Prompt to Video Live</h1>
              <p className="text-xs text-neutral-500">AI-powered video generation</p>
            </div>
          </div>
          {scriptGenerated && (
            <div className="flex items-center gap-3">
              <button onClick={() => setAutoScroll(!autoScroll)} className={clsx("px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2", autoScroll ? "bg-violet-600/20 text-violet-400 border border-violet-600/30" : "bg-neutral-800 text-neutral-400 border border-neutral-700")}>
                {autoScroll ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />} Auto-Scroll
              </button>
              <button onClick={generateAllScenes} disabled={generatingAll} className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium text-sm hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-50 flex items-center gap-2">
                {generatingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Generate All
              </button>
            </div>
          )}
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {!scriptGenerated && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center"><Sparkles className="w-5 h-5 text-white" /></div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Create Your Video Script</h2>
                  <p className="text-sm text-neutral-400">Enter a prompt and we&apos;ll generate an engaging story with scenes</p>
                </div>
              </div>
              <div className="space-y-3">
                <textarea value={mainPrompt} onChange={(e) => setMainPrompt(e.target.value)} placeholder="Enter your prompt here... e.g., 'A hero's journey through ancient ruins'" className="w-full bg-neutral-800/50 border border-neutral-700 rounded-xl px-4 py-3 text-base resize-none focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 placeholder:text-neutral-500" rows={3} />
                <div className="flex items-center gap-3">
                  <button onClick={generateScript} disabled={isGeneratingScript || !mainPrompt.trim()} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-50 flex items-center gap-2">
                    {isGeneratingScript ? (<><Loader2 className="w-5 h-5 animate-spin" />Generating Script...</>) : (<><BookOpen className="w-5 h-5" />Generate Script</>)}
                  </button>
                  <p className="text-xs text-neutral-500">Your script will include 4 scenes with an engaging story arc.</p>
                </div>
              </div>
              <div className="pt-2">
                <p className="text-xs text-neutral-500 mb-2">Try these examples:</p>
                <div className="flex flex-wrap gap-2">
                  {["A hero's journey through ancient ruins", "The last robot on Earth", "A love story in Paris", "Space exploration adventure", "Magical forest discovery"].map((example) => (
                    <button key={example} onClick={() => setMainPrompt(example)} className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 transition-colors">{example}</button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {scriptGenerated && scenes.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"} className={clsx("w-14 h-14 rounded-full flex items-center justify-center transition-all", isPlaying ? "bg-red-600 hover:bg-red-500" : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500")}>
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                </button>
                <div>
                  <p className="text-sm text-neutral-400">{isPlaying ? 'Playing...' : 'Ready to play'}</p>
                  <p className="text-lg font-semibold">Scene {currentSceneIndex + 1} of {scenes.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={clsx("px-3 py-1 rounded-full text-xs font-medium", autoScroll ? "bg-green-600/20 text-green-400" : "bg-neutral-800 text-neutral-500")}>{autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}</span>
                <button onClick={resetScript} className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm font-medium transition-colors flex items-center gap-2"><RefreshCw className="w-4 h-4" />New Script</button>
              </div>
            </div>
          </motion.div>
        )}

        {scriptGenerated && scenes.length > 0 && (
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-neutral-800">
              <motion.div className="w-full bg-gradient-to-b from-violet-600 to-indigo-600" style={{ height: `${((currentSceneIndex + 1) / scenes.length) * 100}%` }} animate={{ height: `${((currentSceneIndex + 1) / scenes.length) * 100}%` }} transition={{ duration: 0.3 }} />
            </div>
            <div ref={containerRef} className="space-y-6 pl-20">
              <AnimatePresence>
                {scenes.map((scene, index) => (
                  <motion.div key={scene.id} ref={(el) => { if (el) sceneRefs.current.set(scene.id, el); }} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0, scale: currentSceneIndex === index ? 1.02 : 1 }} transition={{ delay: index * 0.1 }} className={clsx("relative p-6 rounded-2xl border transition-all duration-300", currentSceneIndex === index ? "bg-neutral-900/80 border-violet-600/50 shadow-lg shadow-violet-600/10" : "bg-neutral-900/30 border-neutral-800")}>
                    <div className={clsx("absolute -left-14 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold", currentSceneIndex === index ? "bg-gradient-to-r from-violet-600 to-indigo-600" : "bg-neutral-800 text-neutral-500")}>{index + 1}</div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="aspect-video rounded-xl overflow-hidden bg-neutral-800 relative">
                        {scene.isGeneratingImage ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-neutral-800"><div className="flex flex-col items-center gap-3"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /><span className="text-sm text-neutral-400">Generating scene...</span></div></div>
                        ) : scene.imageUrl ? (
                          <img src={scene.imageUrl} alt={scene.prompt} className="w-full h-full object-cover" />
                        ) : scene.imageError ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-red-900/20"><div className="flex flex-col items-center gap-2 text-red-400"><AlertCircle className="w-8 h-8" /><span className="text-sm">Failed to generate</span></div></div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center"><button onClick={() => generateSceneImage(index)} className="flex flex-col items-center gap-2 text-neutral-500 hover:text-violet-400 transition-colors"><ImageIcon className="w-8 h-8" /><span className="text-sm">Generate scene</span></button></div>
                        )}
                        {currentSceneIndex === index && isPlaying && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-violet-600/20 flex items-center justify-center"><div className="bg-black/60 px-4 py-2 rounded-full flex items-center gap-2"><span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /><span className="text-sm font-medium">Now Playing</span></div></motion.div>
                        )}
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs text-neutral-500 uppercase tracking-wider font-medium">Scene Prompt</label>
                          <textarea value={scene.prompt} onChange={(e) => updateScene(index, { prompt: e.target.value })} className="w-full mt-1 bg-neutral-800/50 border border-neutral-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-violet-500" rows={2} />
                        </div>
                        <div>
                          <label className="text-xs text-neutral-500 uppercase tracking-wider font-medium flex items-center gap-2"><Volume2 className="w-3 h-3" />Narration</label>
                          <textarea value={scene.narration} onChange={(e) => updateScene(index, { narration: e.target.value })} className="w-full mt-1 bg-neutral-800/50 border border-neutral-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-violet-500" rows={2} />
                        </div>
                        <div>
                          <label className="text-xs text-neutral-500 uppercase tracking-wider font-medium flex items-center gap-2"><Volume2 className="w-3 h-3" />Voice: <span className="text-violet-400">{VOICE_OPTIONS.find(v => v.id === scene.voiceId)?.label || scene.voiceId}</span></label>
                          <select value={scene.voiceId} onChange={(e) => { const newVoiceId = e.target.value; updateScene(index, { voiceId: newVoiceId, audioUrl: undefined }); }} className="w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors bg-neutral-800/50 border-neutral-700 text-white">
                            {VOICE_OPTIONS.map((voice) => (<option key={voice.id} value={voice.id} className="bg-neutral-900 text-white">{voice.label} {voice.flag}</option>))}
                          </select>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                          <button onClick={() => generateSceneImage(index)} disabled={scene.isGeneratingImage} className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5">
                            {scene.isGeneratingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />} Image
                          </button>
                          <button onClick={() => generateSceneAudio(index)} disabled={scene.isGeneratingAudio} className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5">
                            {scene.isGeneratingAudio ? <Loader2 className="w-3 h-3 animate-spin" /> : scene.audioError ? <AlertCircle className="w-3 h-3 text-red-400" /> : scene.audioUrl ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Volume2 className="w-3 h-3" />} Audio
                          </button>
                          <button onClick={() => playSceneAudio(index)} disabled={scene.isGeneratingAudio} className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"><Volume2 className="w-3 h-3" />Play Audio</button>
                          <button onClick={() => skipToScene(index)} className="px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 text-xs font-medium transition-colors">Play from here</button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-neutral-800 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-neutral-500">Prompt to Video Live • AI-Powered Video Generation</p>
        </div>
      </footer>
    </div>
  );
}