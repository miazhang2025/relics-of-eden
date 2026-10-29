// 音频总线：ambience / sfx / master。
// ambience：每个探索场景一首循环背景音乐（public/audio/<scene>.mp3，源文件在 art/textures/music/，用 ffmpeg 转成 mp3，
// 并用 loudnorm 统一响度到 -20 LUFS，保证各场景音量一致、不会太响），
// 走 WebAudio GainNode 做淡入淡出（iOS Safari 不认 HTMLAudioElement.volume）。landing、ending 页也各有一首（public/audio/landing.mp3、ending.mp3）。
// sfx 素材未到位，仍是静音占位（只打 console.debug），调用点已经埋好。

import type { AudioConfig, SceneId } from '../config/schema'
import { useConfigStore } from '../state/useConfigStore'

export type AmbienceKey = SceneId | 'landing' | 'ending'

export type SfxName = 'zoneEnter' | 'assetNear' | 'collect' | 'boxReveal' | 'photoExport'

const AMBIENCE: Partial<Record<AmbienceKey, string>> = {
  landing: 'audio/landing.mp3',
  cave: 'audio/cave.mp3',
  garden: 'audio/garden.mp3',
  ocean: 'audio/ocean.mp3',
  ending: 'audio/ending.mp3',
}

/** ending 没有自己的 audio 段，淡入在场景 fadeIn 的基础上再拉长这么多秒，让音乐慢慢浮上来 */
const ENDING_EXTRA_FADE_IN = 4.5

const url = (path: string) => `${import.meta.env.BASE_URL}${path}`

interface Track {
  key: AmbienceKey
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

/** 当前探索场景的音频参数；landing / ending 没有 audio 段，沿用最近一次探索场景的（landing 时是默认的 cave） */
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
    // 只断开元素，不 revoke blob：同一首以后还会再用（比如从 ending 回到开始页）
    track.el.removeAttribute('src')
    track.el.load()
    track.gain.disconnect()
  }, seconds * 1000 + 100)
}

/**
 * 整首 mp3 先下载成 blob 再交给 <audio>：开始页同时在预加载几十 MB 的模型 / 贴图，
 * 用流式 <audio> 会被挤到后面，要等很久才出声。fetch 和 index.html 里的 <link rel=preload> 命中同一份请求。
 */
const blobs = new Map<AmbienceKey, Promise<string>>()

function loadTrack(key: AmbienceKey): Promise<string> {
  const src = AMBIENCE[key]
  if (!src) return Promise.reject(new Error(`no ambience for ${key}`))
  let p = blobs.get(key)
  if (!p) {
    p = fetch(url(src), { priority: 'high' } as RequestInit)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${src}`)
        return r.blob()
      })
      .then((b) => URL.createObjectURL(b))
    // 失败了下次重新下载；这次退回直接用网络地址
    p.catch(() => blobs.delete(key))
    blobs.set(key, p)
  }
  return p
}

function tryPlay(track: Track) {
  if (current !== track || !track.el.src) return
  void ctx?.resume()
  // 没有用户手势时会被拒绝，等下面的手势监听再播
  track.el.play().catch(() => {})
}

// 开始页、或直接刷新进场景页时没有用户手势，浏览器不让出声：每次点击 / 按键都检查一下，把该播的播起来
for (const type of ['pointerdown', 'keydown'] as const) {
  window.addEventListener(type, () => {
    if (current?.el.paused) tryPlay(current)
    else void ctx?.resume()
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
  playAmbience(scene: AmbienceKey | null) {
    const cfg = audioCfg()
    if (current?.key === scene) return
    if (current) fadeOutAndDispose(current, cfg.ambience.fadeOut)
    current = null

    const src = scene ? AMBIENCE[scene] : undefined
    const audio = getCtx()
    if (!scene || !src || !audio) return

    const el = new Audio()
    el.loop = true
    el.preload = 'auto'
    const gain = audio.createGain()
    gain.gain.value = 0
    audio.createMediaElementSource(el).connect(gain).connect(audio.destination)
    const track: Track = { key: scene, el, gain }
    current = track
    // 真正开始出声时才淡入，不然下载 / 等手势期间淡入就已经走完了
    el.addEventListener(
      'playing',
      () => {
        if (current !== track) return
        const c = audioCfg()
        rampTo(gain, ambienceLevel(c), c.ambience.fadeIn + (scene === 'ending' ? ENDING_EXTRA_FADE_IN : 0))
      },
      { once: true },
    )
    loadTrack(scene)
      .catch(() => url(src))
      .then((blobUrl) => {
        if (current !== track) return
        el.src = blobUrl
        tryPlay(track)
      })
  },
  /**
   * 在用户手势里调用（开始页前的 Enter 黑屏）：恢复 AudioContext 并立刻播当前曲目。
   * blob 还没下完时直接改用网络地址边下边播——Safari 只认手势里同步调用的 play()，等下完再播会被拦。
   */
  unlock() {
    void getCtx()?.resume()
    if (!current?.el.paused) return
    const src = AMBIENCE[current.key]
    if (!current.el.src && src) current.el.src = url(src)
    tryPlay(current)
  },
  /** 提前把某首下载好（开始页先下 landing，再顺带下第一个场景的） */
  preload(key: AmbienceKey): Promise<void> {
    return loadTrack(key).then(
      () => {},
      () => {},
    )
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
