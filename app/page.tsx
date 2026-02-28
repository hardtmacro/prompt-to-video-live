'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, RefreshCw, Volume2, VolumeX, 
  ChevronDown, ChevronRight, Image as ImageIcon,
  Wand2, Speaker, AlertCircle, CheckCircle2, Loader2
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
    voiceId: 'zeus-en',
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
    voiceId: 'luna-en',
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

export default function PromptToVideoLive() {
  const [scenes, setScenes] = useState<Scene[]>(DEFAULT_SCENES);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  
  const sceneRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);

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

  // Handle scene completion and progression
  const playNextScene = useCallback(async (index: number) => {
    if (!isPlayingRef.current || index >= scenes.length) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      return;
    }

    // Get fresh scene data from state to ensure we have the latest voiceId
    setScenes(prevScenes => {
      const scene = prevScenes[index];
      if (!scene) return prevScenes;
      
      setCurrentSceneIndex(index);

      // Wait for image and audio to be ready
      if (!scene.imageUrl || scene.isGeneratingImage || scene.isGeneratingAudio) {
        // Wait a bit and check again
        setTimeout(() => playNextScene(index), 500);
        return prevScenes;
      }

      // Generate and play audio
      (async () => {
        try {
          // First ensure we have audio generated
          let audioUrlToPlay = scene.audioUrl;
          
          if (!audioUrlToPlay) {
            // Debug log to verify voice is being used
            console.log(`[Audio Generation] Scene ${index + 1}: Using voiceId="${scene.voiceId}" for narration`);
            
            // Generate audio on-the-fly if not already generated
            const res = await fetch('/api/text-to-speech', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                text: scene.narration, 
                voiceId: scene.voiceId 
              }),
            });

            if (!res.ok) {
              console.error('Audio generation failed:', res.status);
              // Move to next scene even if audio fails
              playNextScene(index + 1);
              return;
            }

            if (res.headers.get('content-type')?.includes('audio')) {
              const blob = await res.blob();
              audioUrlToPlay = URL.createObjectURL(blob);
              
              // Store the audio URL for future use
              setScenes(prev => prev.map((s, i) => 
                i === index ? { ...s, audioUrl: audioUrlToPlay } : s
              ));
            } else {
              console.error('Invalid audio response');
              playNextScene(index + 1);
              return;
            }
          }

          // Play the audio
          if (audioUrlToPlay) {
            // Clean up previous audio
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current = null;
            }
            if (currentAudioUrl) {
              URL.revokeObjectURL(currentAudioUrl);
            }

            setCurrentAudioUrl(audioUrlToPlay);
            
            const audio = new Audio(audioUrlToPlay);
            audioRef.current = audio;

            // Wait for audio to load and start playing
            await new Promise<void>((resolve) => {
              const handleCanPlay = () => {
                audio.removeEventListener('canplay', handleCanPlay);
                audio.removeEventListener('error', handleError);
                
                // Try to play and handle autoplay restrictions
                audio.play()
                  .then(() => {
                    // Audio is playing, wait for it to end
                    audio.onended = () => {
                      audio.onended = null;
                      resolve();
                    };
                  })
                  .catch((err) => {
                    console.error('Audio play error:', err);
                    // Even if play fails, try to proceed
                    resolve();
                  });
              };

              const handleError = (e: Event) => {
                audio.removeEventListener('canplay', handleCanPlay);
                audio.removeEventListener('error', handleError);
                console.error('Audio error event:', e);
                resolve();
              };

              audio.addEventListener('canplay', handleCanPlay);
              audio.addEventListener('error', handleError);
              audio.load();
            });
          }
        } catch (error) {
          console.error('Audio playback error:', error);
        }

        // Move to next scene
        playNextScene(index + 1);
      })();

      return prevScenes;
    });
  }, [scenes, currentAudioUrl]);

  // Toggle play/pause
  const togglePlay = async () => {
    if (isPlaying) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
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

  // Generate image for a scene
  const generateSceneImage = async (index: number) => {
    const scene = scenes[index];
    if (!scene) return;

    setScenes(prev => prev.map((s, i) => 
      i === index ? { ...s, isGeneratingImage: true, imageError: false } : s
    ));

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: scene.prompt }),
      });

      if (!res.ok) throw new Error('Image generation failed');

      const data = await res.json();
      
      setScenes(prev => prev.map((s, i) => 
        i === index ? { ...s, imageUrl: data.url, isGeneratingImage: false } : s
      ));
    } catch (error) {
      console.error('Image generation error:', error);
      setScenes(prev => prev.map((s, i) => 
        i === index ? { ...s, isGeneratingImage: false, imageError: true } : s
      ));
    }
  };

  // Generate audio for a scene - ensuring voiceId is always used
  const generateSceneAudio = async (index: number) => {
    // Get fresh scene data to ensure we have the latest voiceId
    const currentScenes = scenes;
    const scene = currentScenes[index];
    if (!scene) return;

    setScenes(prev => prev.map((s, i) => 
      i === index ? { ...s, isGeneratingAudio: true, audioError: false } : s
    ));

    try {
      // Debug log to verify voice is being used
      console.log(`[Generate Audio] Scene ${index + 1}: Using voiceId="${scene.voiceId}" for narration: "${scene.narration.substring(0, 50)}..."`);

      const res = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: scene.narration, 
          voiceId: scene.voiceId 
        }),
      });

      if (!res.ok) throw new Error('Audio generation failed');

      if (res.headers.get('content-type')?.includes('audio')) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        
        setScenes(prev => prev.map((s, i) => 
          i === index ? { ...s, isGeneratingAudio: false, audioUrl: url } : s
        ));
      } else {
        setScenes(prev => prev.map((s, i) => 
          i === index ? { ...s, isGeneratingAudio: false, audioError: true } : s
        ));
      }
    } catch (error) {
      console.error('Audio generation error:', error);
      setScenes(prev => prev.map((s, i) => 
        i === index ? { ...s, isGeneratingAudio: false, audioError: true } : s
      ));
    }
  };

  // Play audio manually for a scene (for testing)
  const playSceneAudio = async (index: number) => {
    // Get fresh scene data to ensure we have the latest voiceId
    const scene = scenes[index];
    if (!scene) return;

    // Debug log to verify voice is being used
    console.log(`[Play Audio] Scene ${index + 1}: Using voiceId="${scene.voiceId}"`);

    // If audio doesn't exist, generate it first
    if (!scene.audioUrl) {
      await generateSceneAudio(index);
      // Re-get the scene after generation - use functional update to get latest
      setScenes(prev => {
        const updatedScene = prev[index];
        if (!updatedScene?.audioUrl) {
          return prev;
        }
        // Continue playing with updated scene
        (async () => {
          // Stop current audio if playing
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }

          // Play the audio
          const audio = new Audio(updatedScene.audioUrl);
          audioRef.current = audio;

          try {
            await audio.play();
          } catch (error) {
            console.error('Error playing audio:', error);
          }
        })();
        return prev;
      });
      return;
    }

    // Stop current audio if playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Play the audio
    const audio = new Audio(scene.audioUrl);
    audioRef.current = audio;

    try {
      await audio.play();
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
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
    setCurrentSceneIndex(index);
    setIsPlaying(true);
    isPlayingRef.current = true;
    playNextScene(index);
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
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
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Controls */}
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

            <div className="flex items-center gap-2">
              <span className={clsx(
                "px-3 py-1 rounded-full text-xs font-medium",
                autoScroll 
                  ? "bg-green-600/20 text-green-400" 
                  : "bg-neutral-800 text-neutral-500"
              )}>
                {autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Timeline */}
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
                          disabled={!scene.audioUrl || scene.isGeneratingAudio}
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