'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Wand2,
  Volume2,
  Loader2,
  Film,
  ImageIcon,
  ChevronDown,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import clsx from 'clsx'
import Image from 'next/image'

const VOICE_OPTIONS = [
  { id: 'asteria-en', label: 'Asteria', gender: 'F' },
  { id: 'luna-en', label: 'Luna', gender: 'F' },
  { id: 'stella-en', label: 'Stella', gender: 'F' },
  { id: 'athena-en', label: 'Athena', gender: 'F' },
  { id: 'hera-en', label: 'Hera', gender: 'F' },
  { id: 'orion-en', label: 'Orion', gender: 'M' },
  { id: 'arcas-en', label: 'Arcas', gender: 'M' },
  { id: 'perseus-en', label: 'Perseus', gender: 'M' },
  { id: 'angus-en', label: 'Angus', gender: 'M' },
  { id: 'orpheus-en', label: 'Orpheus', gender: 'M' },
  { id: 'helios-en', label: 'Helios', gender: 'M' },
  { id: 'zeus-en', label: 'Zeus', gender: 'M' },
  { id: 'apollo-en', label: 'Apollo', gender: 'M' },
  { id: 'hermes-en', label: 'Hermes', gender: 'M' },
]

const THEMES = [
  { name: 'Epic Fantasy', voice: 'zeus-en', style: 'cinematic fantasy landscape' },
  { name: 'Sci-Fi', voice: 'orion-en', style: 'futuristic sci-fi scene' },
  { name: 'Horror', voice: 'orpheus-en', style: 'dark atmospheric horror' },
  { name: 'Romance', voice: 'luna-en', style: 'romantic soft lighting' },
  { name: 'Adventure', voice: 'perseus-en', style: 'adventure dramatic landscape' },
  { name: 'Mystery', voice: 'athena-en', style: 'mysterious noir atmosphere' },
]

interface Scene {
  id: number
  narration: string
  imagePrompt: string
  imageUrl: string | null
  audioUrl: string | null
  voiceId: string
  isGeneratingImage: boolean
  isGeneratingAudio: boolean
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash)
}

function detectTheme(prompt: string): typeof THEMES[0] {
  const lower = prompt.toLowerCase()
  if (/fantasy|dragon|wizard|magic|sword|quest/.test(lower)) return THEMES[0]
  if (/space|future|robot|cyber|alien|tech/.test(lower)) return THEMES[1]
  if (/horror|dark|ghost|haunted|fear|dead/.test(lower)) return THEMES[2]
  if (/love|romance|heart|kiss|passion/.test(lower)) return THEMES[3]
  if (/adventure|journey|explore|treasure|hero/.test(lower)) return THEMES[4]
  if (/mystery|detective|clue|secret|shadow/.test(lower)) return THEMES[5]
  return THEMES[0]
}

function generateScenesFromPrompt(prompt: string): Scene[] {
  const theme = detectTheme(prompt)
  const h = hashCode(prompt)
  const offsets = [0, 5, 11, 7]

  const sceneTemplates = [
    {
      narration: `In a world shaped by "${prompt}", our story begins. The stage is set for something extraordinary.`,
      imagePrompt: `${theme.style}, opening scene, ${prompt}, wide establishing shot, dramatic lighting, 4k cinematic`,
    },
    {
      narration: `The journey deepens. Characters emerge from the shadows, driven by purpose and destiny.`,
      imagePrompt: `${theme.style}, character introduction scene, ${prompt}, medium shot, detailed, atmospheric, 4k cinematic`,
    },
    {
      narration: `Tension rises as forces collide. Every choice matters, every moment counts.`,
      imagePrompt: `${theme.style}, climactic confrontation, ${prompt}, dramatic angle, intense lighting, 4k cinematic`,
    },
    {
      narration: `And so the tale reaches its crescendo. What was begun must now find its end.`,
      imagePrompt: `${theme.style}, epic finale scene, ${prompt}, sweeping vista, golden hour lighting, 4k cinematic`,
    },
  ]

  return sceneTemplates.map((tpl, i) => ({
    id: i,
    narration: tpl.narration,
    imagePrompt: tpl.imagePrompt,
    imageUrl: null,
    audioUrl: null,
    voiceId: i === 0 ? theme.voice : VOICE_OPTIONS[(h + offsets[i]) % VOICE_OPTIONS.length].id,
    isGeneratingImage: false,
    isGeneratingAudio: false,
  }))
}

export default function PromptToVideoPage() {
  const [prompt, setPrompt] = useState('')
  const [scenes, setScenes] = useState<Scene[]>([])
  const scenesRef = useRef<Scene[]>([])
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const isPlayingRef = useRef(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    scenesRef.current = scenes
  }, [scenes])

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  const updateScene = useCallback((index: number, updates: Partial<Scene>) => {
    setScenes(prev => {
      const next = prev.map((s, i) => (i === index ? { ...s, ...updates } : s))
      scenesRef.current = next
      return next
    })
  }, [])

  const generateSceneImage = useCallback(async (scene: Scene, index: number) => {
    updateScene(index, { isGeneratingImage: true })
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: scene.imagePrompt }),
      })
      if (!res.ok) throw new Error('Image generation failed')
      const data = await res.json()
      updateScene(index, { imageUrl: data.url, isGeneratingImage: false })
    } catch {
      updateScene(index, { isGeneratingImage: false })
    }
  }, [updateScene])

  const generateSceneAudio = useCallback(async (index: number): Promise<string | null> => {
    const current = scenesRef.current[index]
    if (!current || current.isGeneratingAudio) return current?.audioUrl || null
    
    updateScene(index, { isGeneratingAudio: true })
    try {
      const res = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: current.narration, voiceId: current.voiceId }),
      })
      if (!res.ok) throw new Error('TTS failed')
      const blob = await res.blob()
      const audioUrl = URL.createObjectURL(blob)
      updateScene(index, { audioUrl, isGeneratingAudio: false })
      return audioUrl
    } catch {
      updateScene(index, { isGeneratingAudio: false })
      return null
    }
  }, [updateScene])

  const playSceneAudio = useCallback(async (index: number) => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    const scene = scenesRef.current[index]
    if (!scene) return

    let url: string | null = scene.audioUrl
    if (!url) {
      url = await generateSceneAudio(index)
    }
    if (!url) return

    const audio = new Audio(url)
    audioRef.current = audio

    audio.onended = () => {
      const nextIndex = index + 1
      if (nextIndex < scenesRef.current.length && isPlayingRef.current) {
        setCurrentSceneIndex(nextIndex)
        playSceneAudio(nextIndex)
      } else {
        setIsPlaying(false)
      }
    }

    try {
      await audio.play()
    } catch {
      setIsPlaying(false)
    }
  }, [generateSceneAudio])

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return
    setIsGenerating(true)
    setIsPlaying(false)
    setCurrentSceneIndex(0)

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    const newScenes = generateScenesFromPrompt(prompt)
    setScenes(newScenes)
    scenesRef.current = newScenes
    setHasGenerated(true)

    // Trigger all generations in parallel without blocking the UI
    newScenes.forEach((scene, i) => {
      generateSceneImage(scene, i)
      generateSceneAudio(i)
    })

    // Allow UI to become interactive immediately
    setIsGenerating(false)
    setIsPlaying(true)
    playSceneAudio(0)
  }, [prompt, isGenerating, generateSceneImage, generateSceneAudio, playSceneAudio])

  const handlePlay = useCallback(() => {
    if (scenes.length === 0) return
    setIsPlaying(true)
    playSceneAudio(currentSceneIndex)
  }, [scenes.length, currentSceneIndex, playSceneAudio])

  const handlePause = useCallback(() => {
    setIsPlaying(false)
    if (audioRef.current) {
      audioRef.current.pause()
    }
  }, [])

  const handleNext = useCallback(() => {
    if (currentSceneIndex < scenes.length - 1) {
      const next = currentSceneIndex + 1
      setCurrentSceneIndex(next)
      if (isPlaying) {
        playSceneAudio(next)
      }
    }
  }, [currentSceneIndex, scenes.length, isPlaying, playSceneAudio])

  const handlePrev = useCallback(() => {
    if (currentSceneIndex > 0) {
      const prev = currentSceneIndex - 1
      setCurrentSceneIndex(prev)
      if (isPlaying) {
        playSceneAudio(prev)
      }
    }
  }, [currentSceneIndex, isPlaying, playSceneAudio])

  const handleVoiceChange = useCallback((index: number, voiceId: string) => {
    updateScene(index, { voiceId, audioUrl: null })
  }, [updateScene])

  const handleRegenerateAudio = useCallback(async (index: number) => {
    updateScene(index, { audioUrl: null })
    await generateSceneAudio(index)
  }, [updateScene, generateSceneAudio])

  const currentScene = scenes[currentSceneIndex] || null

  if (!mounted) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <header className="border-b border-neutral-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <Film className="w-7 h-7 text-purple-500" />
          <h1 className="text-xl font-bold tracking-tight">Prompt to Video</h1>
          <span className="text-xs text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded-full ml-2">
            LIVE
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Prompt Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <label htmlFor="prompt-input" className="block text-sm font-medium text-neutral-400 mb-2">
            Describe your video story
          </label>
          <div className="flex gap-3">
            <input
              id="prompt-input"
              type="text"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              placeholder="A dragon awakens in a forgotten kingdom..."
              className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className={clsx(
                'flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all',
                !prompt.trim() || isGenerating
                  ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20'
              )}
            >
              {isGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Wand2 className="w-5 h-5" />
              )}
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {hasGenerated && (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Video Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Main Viewer */}
                <div className="lg:col-span-2">
                  <div className="relative aspect-video bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-800">
                    <AnimatePresence mode="wait">
                      {currentScene && (
                        <motion.div
                          key={currentScene.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5 }}
                          className="absolute inset-0"
                        >
                          {currentScene.isGeneratingImage ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-900">
                              <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
                              <p className="text-sm text-neutral-400">Generating image...</p>
                            </div>
                          ) : currentScene.imageUrl ? (
                            <Image
                              src={currentScene.imageUrl}
                              alt={`Scene ${currentScene.id + 1}`}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-neutral-900">
                              <ImageIcon className="w-10 h-10 text-neutral-700" />
                              <p className="text-sm text-neutral-500">No image yet</p>
                            </div>
                          )}

                          {/* Narration Overlay */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6">
                            <p className="text-sm md:text-base leading-relaxed text-neutral-200 drop-shadow-lg">
                              {currentScene.narration}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Scene Counter */}
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium">
                      Scene {currentSceneIndex + 1} / {scenes.length}
                    </div>
                  </div>

                  {/* Playback Controls */}
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <button
                      onClick={handlePrev}
                      disabled={currentSceneIndex === 0}
                      className={clsx(
                        'p-2 rounded-lg transition-colors',
                        currentSceneIndex === 0
                          ? 'text-neutral-700 cursor-not-allowed'
                          : 'text-neutral-300 hover:bg-neutral-800'
                      )}
                    >
                      <SkipBack className="w-5 h-5" />
                    </button>

                    <button
                      onClick={isPlaying ? handlePause : handlePlay}
                      disabled={scenes.length === 0}
                      className={clsx(
                        'p-3 rounded-full transition-all',
                        scenes.length === 0
                          ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                          : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                      )}
                    >
                      {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                    </button>

                    <button
                      onClick={handleNext}
                      disabled={currentSceneIndex >= scenes.length - 1}
                      className={clsx(
                        'p-2 rounded-lg transition-colors',
                        currentSceneIndex >= scenes.length - 1
                          ? 'text-neutral-700 cursor-not-allowed'
                          : 'text-neutral-300 hover:bg-neutral-800'
                      )}
                    >
                      <SkipForward className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex gap-1.5 mt-3">
                    {scenes.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setCurrentSceneIndex(i)
                          if (isPlaying) playSceneAudio(i)
                        }}
                        className={clsx(
                          'flex-1 h-1.5 rounded-full transition-all',
                          i === currentSceneIndex
                            ? 'bg-purple-500'
                            : i < currentSceneIndex
                            ? 'bg-purple-500/40'
                            : 'bg-neutral-800'
                        )}
                      />
                    ))}
                  </div>
                </div>

                {/* Scene List */}
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                    Scenes
                  </h2>
                  {scenes.map((scene, i) => (
                    <motion.div
                      key={scene.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => {
                        setCurrentSceneIndex(i)
                        if (isPlaying) playSceneAudio(i)
                      }}
                      className={clsx(
                        'p-3 rounded-xl border cursor-pointer transition-all',
                        i === currentSceneIndex
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative w-16 h-10 rounded-md overflow-hidden bg-neutral-800 flex-shrink-0">
                          {scene.isGeneratingImage ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                            </div>
                          ) : scene.imageUrl ? (
                            <Image
                              src={scene.imageUrl}
                              alt={`Scene ${i + 1} thumbnail`}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-neutral-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-neutral-300 mb-1">
                            Scene {i + 1}
                          </p>
                          <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                            {scene.narration}
                          </p>
                        </div>
                      </div>

                      {/* Voice & Audio controls */}
                      <div className="mt-2 flex items-center gap-2">
                        <Volume2 className="w-3 h-3 text-neutral-500 flex-shrink-0" />
                        <div className="relative flex-1">
                          <select
                            value={scene.voiceId}
                            onChange={e => {
                              e.stopPropagation()
                              handleVoiceChange(i, e.target.value)
                            }}
                            onClick={e => e.stopPropagation()}
                            className="w-full bg-neutral-800 border border-neutral-700 text-xs text-neutral-300 rounded-md px-2 py-1 pr-6 appearance-none focus:outline-none focus:ring-1 focus:ring-purple-500"
                          >
                            {VOICE_OPTIONS.map(v => (
                              <option key={v.id} value={v.id}>
                                {v.label} ({v.gender})
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-500 pointer-events-none" />
                        </div>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            handleRegenerateAudio(i)
                          }}
                          disabled={scene.isGeneratingAudio}
                          className={clsx(
                            'p-1 rounded transition-colors flex-shrink-0',
                            scene.isGeneratingAudio
                              ? 'text-neutral-600 cursor-not-allowed'
                              : 'text-neutral-400 hover:text-purple-400 hover:bg-neutral-800'
                          )}
                          title="Regenerate audio"
                        >
                          {scene.isGeneratingAudio ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3 h-3" />
                          )}
                        </button>
                        {scene.audioUrl && (
                          <Sparkles className="w-3 h-3 text-green-500 flex-shrink-0" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!hasGenerated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-6">
              <Film className="w-10 h-10 text-neutral-700" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-300 mb-2">
              Create your video story
            </h2>
            <p className="text-sm text-neutral-500 max-w-md">
              Enter a prompt above and we&apos;ll generate a multi-scene video with AI-generated
              images and narration.
            </p>
          </motion.div>
        )}
      </main>
    </div>
  )
}