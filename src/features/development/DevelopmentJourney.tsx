import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'
import { journeyChapters, JOURNEY_DURATION, stageIndexAt, sceneAt } from './stages'
import './development.css'

const clock = (seconds: number) => `0:${Math.floor(seconds).toString().padStart(2, '0')}`

export function DevelopmentJourney() {
  const headingId = useId()
  const container = useRef<HTMLElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const time = useRef(17.5)
  const started = useRef(false)
  const [position, setPosition] = useState(time.current)
  const [playing, setPlaying] = useState(false)
  const [sound, setSound] = useState(false)
  const [playError, setPlayError] = useState(false)
  const [allowed, setAllowed] = useState(false)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)
  const [inView, setInView] = useState(false)
  const [activated, setActivated] = useState(false)
  const [visible, setVisible] = useState(true)
  const current = stageIndexAt(position)
  const stage = sceneAt(position)
  const active = playing && ready && allowed && !failed && inView && visible

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; addEventListener?: (type: string, listener: () => void) => void; removeEventListener?: (type: string, listener: () => void) => void } }
    const connection = nav.connection
    const evaluate = () => {
      const enabled = !preference.matches && !connection?.saveData && !(nav.deviceMemory && nav.deviceMemory <= 2)
      setAllowed(enabled)
      if (!enabled) setPlaying(false)
    }
    const onVisibility = () => setVisible(document.visibilityState === 'visible')
    evaluate(); onVisibility()
    preference.addEventListener('change', evaluate)
    connection?.addEventListener?.('change', evaluate)
    document.addEventListener('visibilitychange', onVisibility)
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting)
      if (entry.isIntersecting) setActivated(true)
    }, { threshold: 0.05 })
    if (container.current) observer.observe(container.current)
    return () => {
      observer.disconnect()
      preference.removeEventListener('change', evaluate)
      connection?.removeEventListener?.('change', evaluate)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  useEffect(() => {
    const element = video.current
    if (!element) return
    let cancelled = false
    if (active) {
      void element.play().catch(() => {
        if (!cancelled) { setPlaying(false); setPlayError(true) }
      })
    } else element.pause()
    return () => { cancelled = true; element.pause() }
  }, [active])

  function seek(value: number) {
    started.current = true
    time.current = value
    setPosition(value)
    if (video.current && video.current.readyState > 0) video.current.currentTime = value
    if (value >= JOURNEY_DURATION) setPlaying(false)
  }
  function togglePlay() {
    if (!started.current || time.current >= JOURNEY_DURATION) seek(0)
    setPlayError(false)
    setPlaying(value => !value)
  }

  const still = !allowed || failed
  return (
    <section ref={container} className="development-journey" aria-labelledby={headingId}>
      <div className="development-main">
        <div className="development-visual">
          <img src={`/development/scene-${stage.at}.webp`} alt={`${stage.title} An illustration surrounded by golden light.`} hidden={ready && !still} />
          <video ref={video} hidden={!ready || still}
            src={allowed && activated ? '/videos/a-little-sun-bonding-43s.mp4' : undefined}
            poster="/videos/a-little-sun-bonding-poster.jpg"
            preload="metadata" playsInline muted={!sound}
            aria-label="A Little Sun: the illustrated bonding film"
            onLoadedMetadata={event => { event.currentTarget.currentTime = time.current; setReady(true) }}
            onTimeUpdate={event => { time.current = event.currentTarget.currentTime; setPosition(time.current) }}
            onEnded={() => { time.current = JOURNEY_DURATION; setPosition(JOURNEY_DURATION); setPlaying(false) }}
            onError={() => { setFailed(true); setPlaying(false) }}>
            <track kind="captions" src="/videos/a-little-sun-bonding-43s.en.vtt" srcLang="en" label="English" />
          </video>
        </div>
        <div className="development-copy">
          <p className="eyebrow">FROM A SPARK TO A SUNRISE</p>
          <h2 id={headingId}>A little sun. A growing connection.</h2>
          <p className="development-intro">Follow a life growing in light, with a voice, a story, and a gentle melody along the way.</p>
          <div className="development-stages" role="group" aria-label="Journey chapter">
            {journeyChapters.map((item, index) => <button type="button" key={item.label} aria-pressed={current === index} onClick={() => { setPlaying(false); seek(item.preview) }}>
              <span>{item.label}</span>
            </button>)}
          </div>
          <div className="development-description" aria-live="polite" aria-atomic="true">
            <h3>{stage.title}</h3>
            <p>{stage.description}</p>
          </div>
          <div className="development-controls">
            <button className="development-play" type="button" disabled={still || !ready} onClick={togglePlay}>
              {still ? 'Still view' : playing ? 'Pause' : position >= JOURNEY_DURATION ? 'Replay journey' : 'Play journey'}
            </button>
            <button type="button" aria-pressed={sound} disabled={still || !ready} onClick={() => setSound(value => !value)}><Icon name="music" size={16} />{sound ? 'Sound on' : 'Sound off'}</button>
          </div>
          <div className="development-progress">
            <label htmlFor={`${headingId}-seek`} className="sr-only">Journey position</label>
            <input id={`${headingId}-seek`} type="range" min="0" max={JOURNEY_DURATION} step="0.1" value={position} onChange={event => seek(Number(event.target.value))} aria-valuetext={`${clock(position)} of 0:43`} />
            <span>{clock(position)} / 0:43</span>
          </div>
          {still && <p className="development-note">{failed ? 'The video is unavailable. Explore the stages as still illustrations.' : 'Explore at your own pace with still illustrations.'}</p>}
          {playError && <p role="status" className="development-note">Playback could not start. Press Play journey to try again.</p>}
          <p className="development-note">Developmental timing varies. Light effects are symbolic.</p>
          <details className="development-sources"><summary>About this journey</summary><p>Based on our original A Little Sun bonding film, with illustrated growth and symbolic voice, story, and music effects. Pregnancy stages are approximate. It does not show guaranteed learning outcomes.</p><a href="https://www.acog.org/womens-health/infographics/changes-during-pregnancy" target="_blank" rel="noreferrer">ACOG: Changes during pregnancy</a><a href="https://www.healthychildren.org/English/tips-tools/ask-the-pediatrician/Pages/I%E2%80%99m-pregnant-and-would-like-to-sing-to-my-unborn-baby.aspx/" target="_blank" rel="noreferrer">AAP: Hearing before birth</a></details>
        </div>
      </div>
    </section>
  )
}
