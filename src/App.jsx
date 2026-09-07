import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import RoofCard from './components/RoofCard.jsx'
import { CARDS } from './data/cards.js'

const hexToRgb = (h) => {
  const v = parseInt(h.slice(1), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}
const mix = (a, b, t) => {
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`
}

/** 背景随当前卡主色调渐变过渡；拖拽过程中按位移连续插值 */
function paint(el, progress) {
  const last = CARDS.length - 1
  const p = Math.max(0, Math.min(last, progress))
  const i = Math.min(last - 1, Math.floor(p))
  const t = last === 0 ? 0 : p - i
  const a = CARDS[i].palette
  const b = CARDS[Math.min(last, i + 1)].palette
  const from = mix(a.from, b.from, t)
  const to = mix(a.to, b.to, t)
  el.style.background = `radial-gradient(120% 90% at 50% -10%, ${from} 0%, ${from} 32%, ${to} 100%)`
}

export default function App() {
  const [index, setIndex] = useState(0)
  const stageRef = useRef(null)
  const trackRef = useRef(null)
  const bgRef = useRef(null)
  const dragRef = useRef({ id: null, startX: 0, x: 0, moved: false, t0: 0 })
  const widthRef = useRef(1)

  const apply = useCallback((offset, animate) => {
    const track = trackRef.current
    const bg = bgRef.current
    if (!track || !bg) return
    const w = widthRef.current
    track.style.transition = animate ? 'transform 560ms cubic-bezier(.22,.61,.36,1)' : 'none'
    track.style.transform = `translate3d(${-index * w + offset}px,0,0)`
    paint(bg, index - offset / w)
  }, [index])

  useLayoutEffect(() => {
    const measure = () => {
      widthRef.current = stageRef.current?.getBoundingClientRect().width || 1
      apply(0, false)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [apply])

  useLayoutEffect(() => {
    apply(0, true)
  }, [index, apply])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(CARDS.length - 1, i + 1))
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const d = dragRef.current
    d.id = e.pointerId
    d.startX = e.clientX
    d.x = 0
    d.moved = false
    d.t0 = performance.now()
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e) => {
    const d = dragRef.current
    if (d.id !== e.pointerId) return
    d.x = e.clientX - d.startX
    if (Math.abs(d.x) > 4) d.moved = true
    // 到头时加阻尼，拖不动的边界手感
    const w = widthRef.current
    let off = d.x
    if ((index === 0 && off > 0) || (index === CARDS.length - 1 && off < 0)) off *= 0.35
    apply(Math.max(-w, Math.min(w, off)), false)
  }

  const endDrag = (e) => {
    const d = dragRef.current
    if (d.id !== e.pointerId) return
    d.id = null
    const w = widthRef.current
    const dt = Math.max(1, performance.now() - d.t0)
    const v = d.x / dt // px/ms
    const far = Math.abs(d.x) > w * 0.18
    const flick = Math.abs(v) > 0.55
    let next = index
    if ((far || flick) && d.x < 0) next = Math.min(CARDS.length - 1, index + 1)
    if ((far || flick) && d.x > 0) next = Math.max(0, index - 1)
    if (next === index) apply(0, true)
    else setIndex(next)
  }

  return (
    <div className="stage" ref={stageRef}>
      <div className="stage__bg" ref={bgRef} />
      <div className="stage__grain" />
      <div
        className="track"
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {CARDS.map((card, i) => (
          <RoofCard
            key={card.id}
            card={card}
            index={i}
            active={Math.abs(i - index) <= 1}
          />
        ))}
      </div>
      <nav className="dots">
        {CARDS.map((card, i) => (
          <button
            key={card.id}
            className={`dot${i === index ? ' is-on' : ''}`}
            aria-label={card.title}
            onClick={() => setIndex(i)}
          />
        ))}
      </nav>
      <p className="hint">拖拽切换 · 光标划过帘子</p>
    </div>
  )
}
