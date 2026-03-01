'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, RefreshCw, Volume2, VolumeX, 
  ChevronDown, ChevronRight, Image as ImageIcon,
  Wand2, Speaker, AlertCircle, CheckCircle2, Loader2,
  Sparkles, BookOpen
} from 'lucide-react';
import { clsx } from 'clsx';

// Voice configuration mapping — Deepgram Aura-2 voice names
const VOICE_OPTIONS = [
  { id: 'asteria-en', label: 'Asteria (Confident)', flag: '🎙️' },
  { id: 'luna-en', label: 'Luna (Warm)', flag: '🌙' },
  { id: 'zeus-en', label: 'Zeus (Authoritative)', flag: '⚡' },
  { id: 'orion-en', label: 'Orion (Deep)', flag: '🌌' },
  { id: 'aurora-en', label: 'Aurora (Bright)', flag: '✨' },
  { id: 'hermes-en', label: 'Hermes (Smooth)', flag: '🪄' },
  { id: 'athena-en', label: 'Athena (Professional)', flag: '🦉' },
  { id: 'orpheus-en', label: 'Orpheus (Rich)', flag: '🎵' },
];

// Theme to voice mapping for automatic voice assignment
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

const DEFAULT_SCENES: Scene[] = [
  {
    id: 1,
    prompt: "A futuristic city skyline at sunset with flying cars and neon lights",
    narration: "Welcome to the future, where cities float among the clouds and technology connects every soul.",
    voiceId: 'asteria-en',
    imageUrl: null,
    isGeneratingImage: false,
    isGeneratingAudio: false,
    imageError: false,
    audioError: false,
  },
  {
    id: 2,
    prompt: "An astronaut floating in space with Earth visible in the background",
    narration: "In the vastness of space, humanity's journey continues, reaching for the stars.",
    voiceId: 'orion-en',
    imageUrl: null,
    isGeneratingImage: false,
    isGeneratingAudio: false,
    imageError: false,
    audioError: false,
  },
  {
    id: 3,
    prompt: "A magical forest with glowing mushrooms and fireflies at night",
    narration: "Deep in the enchanted forests, ancient magic still whispers through the trees.",
    voiceId: 'hermes-en',
    imageUrl: null,
    isGeneratingImage: false,
    isGeneratingAudio: false,
    imageError: false,
    audioError: false,
  },
  {
    id: 4,
    prompt: "A samurai standing on a hilltop overlooking ancient Japan during cherry blossom season",
    narration: "In old Japan, honor and tradition shaped the destiny of warriors.",
    voiceId: 'orion-en',
    imageUrl: null,
    isGeneratingImage: false,
    isGeneratingAudio: false,
    imageError: false,
    audioError: false,
  },
];

// Find matching theme voice from prompt
const getMatchingThemeVoice = (prompt: string): { voice: string; voiceLabel: string } => {
  const promptLower = prompt.toLowerCase();
  
  for (const [keyword, theme] of Object.entries(THEME_VOICES)) {
    if (promptLower.includes(keyword)) {
      return theme;
    }
  }
  
  return { voice: 'asteria-en', voiceLabel: 'story' };
};

// Browser-native Text-to-Speech using SpeechSynthesis API
const speakText = (text: string, voiceId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('SpeechSynthesis not supported'));
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Map voice IDs to browser-available voices
    const voiceIdMap: Record<string, string[]> = {
      'asteria-en': ['Microsoft Zira', 'Google US English', 'Samantha'],
      'luna-en': ['Microsoft Hazel', 'Google UK English Female', 'Victoria'],
      'zeus-en': ['Microsoft David', 'Google US English', 'Daniel'],
      'orion-en': ['Microsoft Mark', 'Google US English', 'Alex'],
      'aurora-en': ['Microsoft Zira', 'Google UK English Female', 'Samantha'],
      'hermes-en': ['Microsoft Zira', 'Google US English', 'Samantha'],
      'athena-en': ['Microsoft Zira', 'Google US English', 'Samantha'],
      'orpheus-en': ['Microsoft David', 'Google US English', 'Daniel'],
    };

    const preferredVoices = voiceIdMap[voiceId] || voiceIdMap['asteria-en'];
    
    const voices = window.speechSynthesis.getVoices();
    
    // Try to find a matching voice
    let selectedVoice = voices.find(v => 
      preferredVoices.some(pv => v.name.includes(pv)) && v.lang.startsWith('en')
    );
    
    if (!selectedVoice) {
      // Fallback to any English voice
      selectedVoice = voices.find(v => v.lang.startsWith('en'));
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => resolve();
    utterance.onerror = (e) => reject(e);

    window.speechSynthesis.speak(utterance);
  });
};

// Generate a unique gradient background SVG based on scene prompt
const generateSceneImageSvg = (prompt: string, sceneIndex: number): string => {
  const colors = [
    ['#667eea', '#764ba2'], // Purple-blue
    ['#f093fb', '#f5576c'], // Pink-orange
    ['#4facfe', '#00f2fe'], // Blue-cyan
    ['#43e97b', '#38f9d7'], // Green-teal
    ['#fa709a', '#fee140'], // Pink-yellow
    ['#a8edea', '#fed6e3'], // Soft pastel
    ['#ff9a9e', '#fecfef'], // Rose
    ['#ffecd2', '#fcb69f'], // Peach
    ['#ff6b6b', '#556270'], // Red-slate
    ['#4bc0c8', '#c779d0'], // Teal-purple
  ];
  
  const colorPair = colors[sceneIndex % colors.length];
  
  // Create a unique pattern based on the prompt hash
  const promptHash = prompt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const patternType = promptHash % 4;
  
  let patternSvg = '';
  
  if (patternType === 0) {
    // Radial gradient
    patternSvg = `
      <defs>
        <radialGradient id="grad${sceneIndex}" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
          <stop offset="0%" style="stop-color:${colorPair[0]};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colorPair[1]};stop-opacity:1" />
        </radialGradient>
      </defs>
      <rect width="800" height="450" fill="url(#grad${sceneIndex})"/>
      <circle cx="${200 + (promptHash % 300)}" cy="${150 + (promptHash % 150)}" r="${50 + (promptHash % 100)}" fill="rgba(255,255,255,0.1)"/>
      <circle cx="${400 + (promptHash % 200)}" cy="${250 + (promptHash % 100)}" r="${30 + (promptHash % 50)}" fill="rgba(255,255,255,0.15)"/>
    `;
  } else if (patternType === 1) {
    // Linear gradient diagonal
    patternSvg = `
      <defs>
        <linearGradient id="grad${sceneIndex}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colorPair[0]};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colorPair[1]};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="800" height="450" fill="url(#grad${sceneIndex})"/>
      <polygon points="${200 + (promptHash % 100)},50 ${300 + (promptHash % 100)},200 ${100 + (promptHash % 100)},200" fill="rgba(255,255,255,0.1)"/>
      <rect x="${400 + (promptHash % 100)}" y="${250 + (promptHash % 100)}" width="150" height="150" fill="rgba(255,255,255,0.08)" transform="rotate(${promptHash % 30} 475 325)"/>
    `;
  } else if (patternType === 2) {
    // Animated-looking pattern
    patternSvg = `
      <defs>
        <linearGradient id="grad${sceneIndex}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${colorPair[0]};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colorPair[1]};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="800" height="450" fill="url(#grad${sceneIndex})"/>
      <ellipse cx="${300 + (promptHash % 200)}" cy="225" rx="${100 + (promptHash % 50)}" ry="${80 + (promptHash % 40)}" fill="rgba(255,255,255,0.12)"/>
      <line x1="0" y1="${100 + (promptHash % 200)}" x2="800" y2="${150 + (promptHash % 200)}" stroke="rgba(255,255,255,0.1)" stroke-width="2"/>
      <line x1="0" y1="${250 + (promptHash % 150)}" x2="800" y2="${300 + (promptHash % 150)}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    `;
  } else {
    // Abstract shapes
    patternSvg = `
      <defs>
        <radialGradient id="grad${sceneIndex}" cx="30%" cy="30%" r="70%">
          <stop offset="0%" style="stop-color:${colorPair[0]};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colorPair[1]};stop-opacity:1" />
        </radialGradient>
      </defs>
      <rect width="800" height="450" fill="url(#grad${sceneIndex})"/>
      <circle cx="${200 + (promptHash % 200)}" cy="${100 + (promptHash % 100)}" r="${60 + (promptHash % 40)}" fill="rgba(255,255,255,0.1)"/>
      <circle cx="${500 + (promptHash % 150)}" cy="${300 + (promptHash % 100)}" r="${80 + (promptHash % 50)}" fill="rgba(255,255,255,0.08)"/>
      <rect x="${350 + (promptHash % 50)}" y="${180 + (promptHash % 50)}" width="100" height="100" fill="rgba(255,255,255,0.06)" rx="10"/>
    `;
  }

  // Add scene number and prompt text
  patternSvg += `
    <text x="400" y="400" font-family="system-ui, sans-serif" font-size="24" fill="rgba(255,255,255,0.8)" text-anchor="middle">Scene ${sceneIndex + 1}</text>
    <text x="400" y="430" font-family="system-ui, sans-serif" font-size="14" fill="rgba(255,255,255,0.5)" text-anchor="middle">${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}</text>
  `;

  return `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">${patternSvg}</svg>`)}`;
};

export default function PromptToVideoLive() {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  
  // Script generation state
  const [mainPrompt, setMainPrompt] = useState('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [scriptGenerated, setScriptGenerated] = useState(false);
  
  const sceneRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Update ref when isPlaying changes
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Auto-scroll to current scene
  useEffect(() => {
    if (autoScroll && isPlaying) {
      const currentElement = sceneRefs.current.get(scenes[currentSceneIndex]?.id);
      if (currentElement && containerRef.current) {
        currentElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }
  }, [currentSceneIndex, autoScroll, isPlaying, scenes]);

  // Generate script from main prompt
  const generateScript = async () => {
    if (!mainPrompt.trim()) return;
    
    setIsGeneratingScript(true);
    
    try {
      // Get matching theme voice based on prompt
      const matchedTheme = getMatchingThemeVoice(mainPrompt);
      
      // Generate scenes based on the main prompt theme
      const generatedScenes: Scene[] = generateScenesFromPrompt(mainPrompt, matchedTheme);
      
      setScenes(generatedScenes);
      setScriptGenerated(true);
      setCurrentSceneIndex(0);
      
    } catch (error) {
      console.error('Script generation error:', error);
      // Fallback to default scenes with modified prompts
      const matchedTheme = getMatchingThemeVoice(mainPrompt);
      const generatedScenes: Scene[] = generateScenesFromPrompt(mainPrompt, matchedTheme);
      setScenes(generatedScenes);
      setScriptGenerated(true);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Generate scenes from prompt - uses matched theme voice for each scene
  const generateScenesFromPrompt = (prompt: string, matchedTheme: { voice: string; voiceLabel: string }): Scene[] => {
    const promptLower = prompt.toLowerCase();
    const scenes: Scene[] = [];
    
    // Story arc templates - each scene uses the matched theme voice
    const storyArcs = [
      {
        type: 'opening',
        template: {
          prompt: `${prompt} - establishing shot, wide cinematic view, dramatic lighting`,
          narration: `Welcome to ${prompt}. This is where our journey begins, in a world where every moment holds wonder and possibility.`,
          // Use matched theme voice for opening
          voiceId: matchedTheme.voice
        }
      },
      {
        type: 'rising',
        template: {
          prompt: `${prompt} - action moment, dynamic composition, intense atmosphere`,
          narration: `As the story unfolds, we discover the true essence of this ${matchedTheme.voiceLabel}. Every detail reveals a deeper meaning.`,
          // Use matched theme voice for rising action
          voiceId: matchedTheme.voice
        }
      },
      {
        type: 'climax',
        template: {
          prompt: `${prompt} - dramatic peak moment, powerful visuals, emotional intensity`,
          narration: `At this pivotal moment, everything changes. The stakes are highest, and the journey reaches its dramatic peak.`,
          // Use matched theme voice for climax
          voiceId: matchedTheme.voice
        }
      },
      {
        type: 'resolution',
        template: {
          prompt: `${prompt} - peaceful conclusion, warm lighting, satisfying ending`,
          narration: `And so our tale comes to a peaceful close, leaving us with memories that will last forever.`,
          // Use matched theme voice for resolution
          voiceId: matchedTheme.voice
        }
      }
    ];
    
    // Generate 4 scenes following story arc
    storyArcs.forEach((arc, index) => {
      scenes.push({
        id: index + 1,
        prompt: arc.template.prompt,
        narration: arc.template.narration,
        voiceId: arc.template.voiceId,
        imageUrl: null,
        isGeneratingImage: false,
        isGeneratingAudio: false,
        imageError: false,
        audioError: false,
      });
    });
    
    return scenes;
  };

  // Reset to initial state
  const resetScript = () => {
    setScenes([]);
    setScriptGenerated(false);
    setMainPrompt('');
    setCurrentSceneIndex(0);
    setIsPlaying(false);
    // Cancel any ongoing speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Handle scene completion and progression
  const playNextScene = useCallback(async (index: number) => {
    if (!isPlayingRef.current || index >= scenes.length) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      // Cancel any ongoing speech
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    // Get fresh scene data from state to ensure we have the latest voiceId
    setScenes(prevScenes => {
      const scene = prevScenes[index];
      if (!scene) return prevScenes;
      
      setCurrentSceneIndex(index);

      // Wait for image to be ready
      if (!scene.imageUrl || scene.isGeneratingImage) {
        // Wait a bit and check again
        setTimeout(() => playNextScene(index), 500);
        return prevScenes;
      }

      // Use browser-native SpeechSynthesis for narration
      (async () => {
        try {
          // Debug log to verify correct voice is being used
          console.log(`[Audio Playback] Scene ${index + 1}: Using voice "${scene.voiceId}" for narration`);
          
          // Speak the narration using browser TTS
          await speakText(scene.narration, scene.voiceId);
          
        } catch (error) {
          console.error('Audio playback error:', error);
        }

        // Move to next scene
        playNextScene(index + 1);
      })();

      return prevScenes;
    });
  }, [scenes]);

  // Toggle play/pause
  const togglePlay = async () => {
    if (isPlaying) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      // Cancel any ongoing speech
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } else {
      const currentScene = scenes[currentSceneIndex];
      if (!currentScene.imageUrl && !currentScene.isGeneratingImage) {
        await generateSceneImage(currentSceneIndex);
      }
      setIsPlaying(true);
      isPlayingRef.current = true;
      playNextScene(currentSceneIndex);
    }
  };

  // Generate image for a scene - using SVG fallback for static export
  const generateSceneImage = async (index: number) => {
    const scene = scenes[index];
    if (!scene) return;

    setScenes(prev => prev.map((s, i) => 
      i === index ? { ...s, isGeneratingImage: true, imageError: false } : s
    ));

    try {
      // Generate SVG image inline (works without API routes)
      const svgDataUrl = generateSceneImageSvg(scene.prompt, index);
      
      setScenes(prev => prev.map((s, i) => 
        i === index ? { ...s, imageUrl: svgDataUrl, isGeneratingImage: false } : s
      ));
    } catch (error) {
      console.error('Image generation error:', error);
      setScenes(prev => prev.map((s, i) => 
        i === index ? { ...s, isGeneratingImage: false, imageError: true } : s
      ));
    }
  };

  // Generate audio for a scene - using browser SpeechSynthesis
  const generateSceneAudio = async (index: number) => {
    const scene = scenes[index];
    if (!scene) return;

    setScenes(prev => prev.map((s, i) => 
      i === index ? { ...s, isGeneratingAudio: true, audioError: false } : s
    ));

    try {
      // Debug log to verify narrator voice is being used
      console.log(`[Generate Audio] Scene ${index + 1}: Using voice "${scene.voiceId}" for narration: "${scene.narration.substring(0, 50)}..."`);

      // Test if SpeechSynthesis is available
      if (!('speechSynthesis' in window)) {
        throw new Error('SpeechSynthesis not supported');
      }

      // For pre-generation, we mark it as ready (actual playback uses speakText)
      // SpeechSynthesis doesn't generate audio files, so we just mark it ready
      setScenes(prev => prev.map((s, i) => 
        i === index ? { ...s, isGeneratingAudio: false, audioUrl: 'browser-tts-ready' } : s
      ));
    } catch (error) {
      console.error('Audio generation error:', error);
      setScenes(prev => prev.map((s, i) => 
        i === index ? { ...s, isGeneratingAudio: false, audioError: true } : s
      ));
    }
  };

  // Play audio manually for a scene
  const playSceneAudio = async (index: number) => {
    const scene = scenes[index];
    if (!scene) return;

    // Debug log to verify narrator voice is being used
    console.log(`[Play Audio] Scene ${index + 1}: Using voice "${scene.voiceId}"`);

    // Cancel any ongoing speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // Use browser-native TTS
    try {
      await speakText(scene.narration, scene.voiceId);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  // Generate all scenes
  const generateAllScenes = async () => {
    setGeneratingAll(true);
    for (let i = 0; i < scenes.length; i++) {
      await generateSceneImage(i);
      await generateSceneAudio(i);
    }
    setGeneratingAll(false);
  };

  // Update scene data
  const updateScene = (index: number, updates: Partial<Scene>) => {
    setScenes(prev => prev.map((s, i) => 
      i === index ? { ...s, ...updates } : s
    ));
  };

  // Skip to scene
  const skipToScene = (index: number) => {
    // Cancel any ongoing speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setCurrentSceneIndex(index);
    setIsPlaying(true);
    isPlayingRef.current = true;
    playNextScene(index);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-xl"
      >
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                Prompt to Video Live
              </h1>
              <p className="text-xs text-neutral-500">AI-powered video generation</p>
            </div>
          </div>

          {scriptGenerated && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={clsx(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                  autoScroll 
                    ? "bg-violet-600/20 text-violet-400 border border-violet-600/30" 
                    : "bg-neutral-800 text-neutral-400 border border-neutral-700"
                )}
              >
                {autoScroll ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                Auto-Scroll
              </button>

              <button
                onClick={generateAllScenes}
                disabled={generatingAll}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium text-sm hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {generatingAll ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                Generate All
              </button>
            </div>
          )}
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Prompt Input Section - Only show when script not generated */}
        {!scriptGenerated && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800"
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Create Your Video Script</h2>
                  <p className="text-sm text-neutral-400">Enter a prompt and we&apos;ll generate an engaging story with scenes</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <textarea
                  value={mainPrompt}
                  onChange={(e) => setMainPrompt(e.target.value)}
                  placeholder="Enter your prompt here... e.g., 'A hero's journey through ancient ruins' or 'The last robot on Earth' or 'A love story in Paris'"
                  className="w-full bg-neutral-800/50 border border-neutral-700 rounded-xl px-4 py-3 text-base resize-none focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 placeholder:text-neutral-500"
                  rows={3}
                />
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={generateScript}
                    disabled={isGeneratingScript || !mainPrompt.trim()}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium hover:from-violet-500 hover:to-indigo-500 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {isGeneratingScript ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating Script...
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-5 h-5" />
                        Generate Script
                      </>
                    )}
                  </button>
                  
                  <p className="text-xs text-neutral-500">
                    Your script will include 4 scenes with an engaging story arc: opening, rising action, climax, and resolution.
                  </p>
                </div>
              </div>

              {/* Example prompts */}
              <div className="pt-2">
                <p className="text-xs text-neutral-500 mb-2">Try these examples:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "A hero's journey through ancient ruins",
                    "The last robot on Earth",
                    "A love story in Paris",
                    "Space exploration adventure",
                    "Magical forest discovery"
                  ].map((example) => (
                    <button
                      key={example}
                      onClick={() => setMainPrompt(example)}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Controls - Only show when script is generated */}
        {scriptGenerated && scenes.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={togglePlay}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  className={clsx(
                    "w-14 h-14 rounded-full flex items-center justify-center transition-all",
                    isPlaying 
                      ? "bg-red-600 hover:bg-red-500" 
                      : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500"
                  )}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6 ml-1" />
                  )}
                </button>

                <div>
                  <p className="text-sm text-neutral-400">
                    {isPlaying ? 'Playing...' : 'Ready to play'}
                  </p>
                  <p className="text-lg font-semibold">
                    Scene {currentSceneIndex + 1} of {scenes.length}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={clsx(
                  "px-3 py-1 rounded-full text-xs font-medium",
                  autoScroll 
                    ? "bg-green-600/20 text-green-400" 
                    : "bg-neutral-800 text-neutral-500"
                )}>
                  {autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
                </span>
                
                <button
                  onClick={resetScript}
                  className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  New Script
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Timeline - Only show when script is generated */}
        {scriptGenerated && scenes.length > 0 && (
          <div className="relative">
            {/* Progress bar */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-neutral-800">
              <motion.div 
                className="w-full bg-gradient-to-b from-violet-600 to-indigo-600"
                style={{
                  height: `${((currentSceneIndex + 1) / scenes.length) * 100}%`,
                }}
                animate={{ height: `${((currentSceneIndex + 1) / scenes.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Scenes */}
            <div ref={containerRef} className="space-y-6 pl-20">
              <AnimatePresence>
                {scenes.map((scene, index) => (
                  <motion.div
                    key={scene.id}
                    ref={(el) => {
                      if (el) sceneRefs.current.set(scene.id, el);
                    }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ 
                      opacity: 1, 
                      x: 0,
                      scale: currentSceneIndex === index ? 1.02 : 1,
                    }}
                    transition={{ delay: index * 0.1 }}
                    className={clsx(
                      "relative p-6 rounded-2xl border transition-all duration-300",
                      currentSceneIndex === index 
                        ? "bg-neutral-900/80 border-violet-600/50 shadow-lg shadow-violet-600/10" 
                        : "bg-neutral-900/30 border-neutral-800"
                    )}
                  >
                    <div className={clsx(
                      "absolute -left-14 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      currentSceneIndex === index
                        ? "bg-gradient-to-r from-violet-600 to-indigo-600"
                        : "bg-neutral-800 text-neutral-500"
                    )}>
                      {index + 1}
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="aspect-video rounded-xl overflow-hidden bg-neutral-800 relative">
                        {scene.isGeneratingImage ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
                            <div className="flex flex-col items-center gap-3">
                              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                              <span className="text-sm text-neutral-400">Generating scene...</span>
                            </div>
                          </div>
                        ) : scene.imageUrl ? (
                          <img 
                            src={scene.imageUrl} 
                            alt={scene.prompt}
                            className="w-full h-full object-cover"
                          />
                        ) : scene.imageError ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-red-900/20">
                            <div className="flex flex-col items-center gap-2 text-red-400">
                              <AlertCircle className="w-8 h-8" />
                              <span className="text-sm">Failed to generate</span>
                            </div>
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <button
                              onClick={() => generateSceneImage(index)}
                              className="flex flex-col items-center gap-2 text-neutral-500 hover:text-violet-400 transition-colors"
                            >
                              <ImageIcon className="w-8 h-8" />
                              <span className="text-sm">Generate scene</span>
                            </button>
                          </div>
                        )}

                        {currentSceneIndex === index && isPlaying && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="absolute inset-0 bg-violet-600/20 flex items-center justify-center"
                          >
                            <div className="bg-black/60 px-4 py-2 rounded-full flex items-center gap-2">
                              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                              <span className="text-sm font-medium">Now Playing</span>
                            </div>
                          </motion.div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-xs text-neutral-500 uppercase tracking-wider font-medium">
                            Scene Prompt
                          </label>
                          <textarea
                            value={scene.prompt}
                            onChange={(e) => updateScene(index, { prompt: e.target.value })}
                            className="w-full mt-1 bg-neutral-800/50 border border-neutral-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-violet-500"
                            rows={2}
                          />
                        </div>

                        <div>
                          <label className="text-xs text-neutral-500 uppercase tracking-wider font-medium flex items-center gap-2">
                            <Speaker className="w-3 h-3" />
                            Narration
                          </label>
                          <textarea
                            value={scene.narration}
                            onChange={(e) => updateScene(index, { narration: e.target.value })}
                            className="w-full mt-1 bg-neutral-800/50 border border-neutral-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-violet-500"
                            rows={2}
                          />
                        </div>

                        <div>
                          <label className="text-xs text-neutral-500 uppercase tracking-wider font-medium flex items-center gap-2">
                            <Volume2 className="w-3 h-3" />
                            Voice: <span className="text-violet-400">{VOICE_OPTIONS.find(v => v.id === scene.voiceId)?.label || scene.voiceId}</span>
                          </label>
                          <select
                            value={scene.voiceId}
                            onChange={(e) => {
                              const newVoiceId = e.target.value;
                              console.log(`[Voice Change] Scene ${index + 1}: Changed voiceId to "${newVoiceId}"`);
                              updateScene(index, { voiceId: newVoiceId });
                            }}
                            className={clsx(
                              "w-full mt-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-500 transition-colors",
                              currentSceneIndex === index 
                                ? "bg-neutral-800/50 border-neutral-700 text-white" 
                                : "bg-neutral-800/20 border-neutral-800/50 text-neutral-500"
                            )}
                          >
                            {currentSceneIndex === index ? (
                              VOICE_OPTIONS.map((voice) => (
                                <option key={voice.id} value={voice.id} className="bg-neutral-900 text-white">
                                  {voice.label} {voice.flag}
                                </option>
                              ))
                            ) : (
                              <option value={scene.voiceId} className="bg-neutral-900 text-white">
                                {VOICE_OPTIONS.find(v => v.id === scene.voiceId)?.label || 'Voice'} {VOICE_OPTIONS.find(v => v.id === scene.voiceId)?.flag || ''}
                              </option>
                            )}
                          </select>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <button
                            onClick={() => generateSceneImage(index)}
                            disabled={scene.isGeneratingImage}
                            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {scene.isGeneratingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                            Image
                          </button>

                          <button
                            onClick={() => generateSceneAudio(index)}
                            disabled={scene.isGeneratingAudio}
                            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {scene.isGeneratingAudio ? <Loader2 className="w-3 h-3 animate-spin" /> : scene.audioError ? <AlertCircle className="w-3 h-3 text-red-400" /> : scene.audioUrl ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Volume2 className="w-3 h-3" />}
                            Audio
                          </button>

                          <button
                            onClick={() => playSceneAudio(index)}
                            disabled={scene.isGeneratingAudio}
                            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                          >
                            <Volume2 className="w-3 h-3" />
                            Play Audio
                          </button>

                          <button
                            onClick={() => skipToScene(index)}
                            className="px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 text-xs font-medium transition-colors"
                          >
                            Play from here
                          </button>
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
          <p className="text-sm text-neutral-500">
            Prompt to Video Live • AI-Powered Video Generation
          </p>
        </div>
      </footer>
    </div>
  );
}