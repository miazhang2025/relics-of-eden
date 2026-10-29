import { AudioBus } from '../audio/AudioBus'
import { useEffect, useState } from 'react'
import { copy } from '../data/copy'
import { ScenePreloader } from '../scene/Preloader'
import { useLangStore, type Lang } from '../state/useLangStore'
import { SCENE_ORDER, useRunStore } from '../state/useRunStore'
import { useRevealOnMount, useTransition } from '../ui/Transition'
import { DecoField, OrnateFrame, SparkleIcon, type DecoItem } from '../ui/Deco'

/** Landing 上可能出现的 3D 物件，设计待定，本期不实现 */
function LandingArtifactSlot() {
  // TODO: 3D 物件设计确定后在这里实现（独立的小 Canvas，绝对定位，不影响现有排版）
  return null
}

/** 预加载最长等多久（毫秒），超时后开始按钮也放行 */
const PRELOAD_TIMEOUT_MS = 45000
/** 开始页音乐最多先下载这么久，之后不管下没下完都开始预加载场景 */
const AUDIO_FIRST_MAX_MS = 4000

const LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'EN' },
  { id: 'zh', label: '中' },
]

// 黑底上的粉色闪光（与结尾同款，只放在四周）：[类型, left%, top%, 尺寸px, 动画延迟s]
const DECO: DecoItem[] = [
  ['sparkle', 7, 12, 20, 0],
  ['sparkle', 26, 22, 12, 1.3],
  ['sparkle', 74, 10, 16, 0.6],
  ['sparkle', 92, 24, 22, 2.1],
  ['star', 88, 62, 14, 1.7],
  ['sparkle', 22, 86, 16, 0.9],
  ['sparkle', 78, 88, 12, 2.4],
  ['sparkle', 5, 60, 14, 1.1],
  ['star', 12, 36, 12, 0.4],
]

/** 本次打开页面是否已经点过 Enter 黑屏（从结尾回到开始页时不再出现） */
let gatePassed = false

/**
 * 开始页前的黑屏，只有一个 Enter：浏览器不允许无手势自动出声，点这一下解锁音频，开始页音乐随开始页一起出现。
 * 黑屏期间开始页已在背后挂载，音乐和场景预加载照常进行。
 */
function EnterGate() {
  const [state, setState] = useState<'shown' | 'leaving' | 'gone'>(gatePassed ? 'gone' : 'shown')
  if (state === 'gone') return null
  const open = () => {
    if (state !== 'shown') return
    gatePassed = true
    AudioBus.unlock()
    setState('leaving')
  }
  return (
    <div
      className={`enter-gate ${state === 'leaving' ? 'is-leaving' : ''}`}
      onTransitionEnd={(e) => e.target === e.currentTarget && setState('gone')}
    >
      <button className="enter-gate__btn" onClick={open} autoFocus>
        Enter
      </button>
    </div>
  )
}

/** 把步骤句子里的 {name} 换成高亮的场景名 */
function StepText({ scene }: { scene: string }) {
  const [before, after] = copy(`landing.step.${scene}.text`).split('{name}')
  return (
    <p className="landing__step-text">
      {before}
      <span className="landing__step-name">{copy(`landing.step.${scene}.name`)}</span>
      {after}
    </p>
  )
}

export default function Landing() {
  useRevealOnMount()
  // 订阅语言，切换时整页重渲染（copy() 本身不是 hook）
  const lang = useLangStore((s) => s.lang)
  const setLang = useLangStore((s) => s.setLang)

  // 停留在开始页期间把三个场景和结尾要用的模型 / 贴图全部加载解码（见 scene/Preloader.tsx），
  // 加载完才能开始；万一卡住，超时后也放行（进场景时再加载）
  const [progress, setProgress] = useState({ done: 0, total: 1 })
  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    // 浏览器不允许无手势自动出声，第一次点击 / 按键时才真正开始播
    AudioBus.playAmbience('landing')
    return () => AudioBus.stopAmbience()
  }, [])
  // 先让开始页音乐下载完，再开始预加载场景（模型 / 贴图很大，同时下载会把音乐挤到很后面）；
  // 音乐下载卡住时最多等 AUDIO_FIRST_MAX_MS 就放行。之后再顺带下第一个场景的音乐
  const [audioFirst, setAudioFirst] = useState(false)
  useEffect(() => {
    const go = () => setAudioFirst(true)
    const id = window.setTimeout(go, AUDIO_FIRST_MAX_MS)
    void AudioBus.preload('landing').then(() => {
      go()
      void AudioBus.preload(SCENE_ORDER[0])
    })
    return () => clearTimeout(id)
  }, [])
  useEffect(() => {
    const id = window.setTimeout(() => setTimedOut(true), PRELOAD_TIMEOUT_MS)
    return () => clearTimeout(id)
  }, [])
  const ready = timedOut || (progress.total > 0 && progress.done >= progress.total)
  const percent = Math.round((Math.min(progress.done, progress.total) / Math.max(1, progress.total)) * 100)

  const enter = () => {
    if (!ready) return
    AudioBus.resume()
    useRunStore.getState().reset()
    useTransition.getState().go('/cave')
  }

  return (
    <main className={`page landing landing--${lang}`}>
      <div className="landing__bg" />
      <DecoField items={DECO} className="landing__deco" />
      <div className="landing__artifact">
        <LandingArtifactSlot />
      </div>
      <div className="landing__lang" role="group" aria-label={copy('landing.lang.switch')}>
        {LANGS.map(({ id, label }) => (
          <button
            key={id}
            className="landing__lang-btn"
            aria-pressed={lang === id}
            lang={id === 'zh' ? 'zh-CN' : 'en'}
            onClick={() => setLang(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="landing__content">
        {/* 与结尾同款的卷草花框，里面只放标签 / 标题 / 标语，简介在框外 */}
        <header className="landing__hero">
          <OrnateFrame className="landing__plate">
            <p className="landing__label">
              <SparkleIcon className="landing__label-spark" />
              {copy('landing.eyebrow')}
              <SparkleIcon className="landing__label-spark" />
            </p>
            <h1 className="landing__title">{copy('landing.title')}</h1>
            <p className="landing__tagline">{copy('landing.tagline')}</p>
          </OrnateFrame>
        </header>
        <div className="landing__lede">
          <p>{copy('landing.lede.1')}</p>
          <p>{copy('landing.lede.2')}</p>
          <p>{copy('landing.lede.3')}</p>
        </div>
        <section className="landing__journey" aria-labelledby="landing-howto">
          <p id="landing-howto" className="landing__label">
            <SparkleIcon className="landing__label-spark" />
            {copy('landing.howto')}
            <SparkleIcon className="landing__label-spark" />
          </p>
          <ol className="landing__steps">
            {SCENE_ORDER.map((scene, i) => (
              <li key={scene} className={`landing__step landing__step--${scene}`}>
                <span className="landing__step-num">{String(i + 1).padStart(2, '0')}</span>
                <StepText scene={scene} />
              </li>
            ))}
          </ol>
          <p className="landing__journey-end">{copy('landing.howto.end')}</p>
        </section>
        <div className="landing__cta">
          <button
            className={`btn btn--primary landing__enter ${ready ? '' : 'is-loading'}`}
            onClick={enter}
            disabled={!ready}
            aria-busy={!ready}
          >
            {ready ? copy('landing.button.enter') : `${copy('landing.button.loading')} ${percent}%`}
          </button>
          {/* 预加载进度：一条细线 */}
          <div className={`landing__loading ${ready ? 'is-done' : ''}`} aria-hidden="true">
            <i style={{ width: `${Math.max(2, percent)}%` }} />
          </div>
        </div>
      </div>
      <EnterGate />
      {audioFirst && <ScenePreloader onProgress={(done, total) => setProgress({ done, total })} />}
    </main>
  )
}
