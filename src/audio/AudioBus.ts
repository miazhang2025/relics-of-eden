// 音频总线：ambience / sfx / master。
// ambience：每个探索场景一首循环背景音乐（public/audio/<scene>.mp3，源文件在 art/textures/music/，用 ffmpeg 转成 mp3），
// 走 WebAudio GainNode 做淡入淡出（iOS Safari 不认 HTMLAudioElement.volume）。ending 页也有一首（public/audio/ending.mp3）。
// sfx 素材未到位，仍是静音占位（只打 console.debug），调用点已经埋好。

import type { AudioConfig, SceneId } from '../config/schema'
import { useConfigStore } from '../state/useConfigStore'

export type SfxName = 'zoneEnter' | 'assetNear' | 'collect' | 'boxReveal' | 'photoExport'

const AMBIENCE: Partial<Record<SceneId | 'ending', string>> = {
  cave: 'audio/cave.mp3',
  garden: 'audio/garden.mp3',
  ocean: 'audio/ocean.mp3',
  ending: 'audio/ending.mp3',
}

const url = (path: string) => `${import.meta.env.BASE_URL}${path}`

interface Track {
  key: SceneId | 'ending'
  el: HTMLAudioElement
  gain: GainNode
}

let ctx: AudioContext | null = null
let current: Track | null = null

function getCtx(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
  } catch {
    /* 不支持 WebAudio 时静默 */
  }
  return ctx
}

/** 当前探索场景的音频参数；ending 没有 audio 段，沿用最近一次探索场景的 */
function audioCfg(): AudioConfig {
  const s = useConfigStore.getState()
  return s.configs[s.scene].audio
}

function ambienceLevel(cfg = audioCfg()): number {
  if (cfg.master.mute || cfg.ambience.mute) return 0
  return cfg.master.volume * cfg.ambience.volume
}

function rampTo(gain: GainNode, value: number, seconds: number) {
  const now = gain.context.currentTime
  gain.gain.cancelScheduledValues(now)
  gain.gain.setValueAtTime(gain.gain.value, now)
  gain.gain.linearRampToValueAtTime(value, now + Math.max(0.01, seconds))
}

function fadeOutAndDispose(track: Track, seconds: number) {
  rampTo(track.gain, 0, seconds)
  window.setTimeout(() => {
    track.el.pause()
    track.el.removeAttribute('src')
    track.el.load()
    track.gain.disconnect()
  }, seconds * 1000 + 100)
}

function tryPlay(el: HTMLAudioElement) {
  el.play().catch(() => {
    // 直接刷新进场景页时没有用户手势，等第一次交互再播
    const retry = () => {
      void ctx?.resume()
      void el.play().catch(() => {})
    }
    window.addEventListener('pointerdown', retry, { once: true })
    window.addEventListener('keydown', retry, { once: true })
  })
}

// look dev 面板改音量 / 静音时实时生效
useConfigStore.subscribe((s, prev) => {
  if (!current || s.configs === prev.configs) return
  rampTo(current.gain, ambienceLevel(), 0.2)
})

export const AudioBus = {
  /** 必须在用户手势内调用（Landing 的进入按钮），解除浏览器自动播放限制 */
  resume() {
    void getCtx()?.resume()
  },
  playAmbience(scene: SceneId | 'ending' | null) {
    const cfg = audioCfg()
    if (current?.key === scene) return
    if (current) fadeOutAndDispose(current, cfg.ambience.fadeOut)
    current = null

    const src = scene ? AMBIENCE[scene] : undefined
    const audio = getCtx()
    if (!scene || !src || !audio) return

    const el = new Audio(url(src))
    el.loop = true
    el.preload = 'auto'
    const gain = audio.createGain()
    gain.gain.value = 0
    audio.createMediaElementSource(el).connect(gain).connect(audio.destination)
    current = { key: scene, el, gain }
    void audio.resume()
    tryPlay(el)
    rampTo(gain, ambienceLevel(cfg), cfg.ambience.fadeIn)
  },
  stopAmbience() {
    if (!current) return
    fadeOutAndDispose(current, audioCfg().ambience.fadeOut)
    current = null
  },
  playSfx(name: SfxName) {
    console.debug('[audio] sfx', name)
  },
}
