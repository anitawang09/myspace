import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Curtain } from '../physics/curtain.js'
import { scanProfile } from '../lib/profile.js'
import { SCENE } from '../data/scene.js'

const FONT = (size) => `${size}px "Noto Serif JP","Songti SC","Yu Mincho",serif`
const DOOR_SLIDE_MS = 1900 // 与 styles.css 里 .shoji 的过渡时长保持一致
const ZOOM_MS = 1100

/**
 * 入口：千鳥破風 + Verlet 字帘，帘后是一道日式拉门。
 * 15 秒后门自动拉开 —— 门内的气流把帘子吹开，镜头推进门里。
 */
export default function Gate({ onEnter }) {
  const rootRef = useRef(null)
  const imgRef = useRef(null)
  const canvasRef = useRef(null)
  const curtainRef = useRef(null)
  const doorRef = useRef({ x: 0, y: 0 }) // 门口中心，阵风的起点
  const pointerRef = useRef({ x: 0, y: 0, dx: 0, dy: 0, active: false, until: 0 })
  const rafRef = useRef(0)
  const enteredRef = useRef(false)

  const [loaded, setLoaded] = useState(false)
  const [opening, setOpening] = useState(false)
  const [zooming, setZooming] = useState(false)

  // ?t=2 把等待改成 2 秒，方便调试与截图
  const delay = (() => {
    const q = Number(new URLSearchParams(window.location.search).get('t'))
    return Number.isFinite(q) && q > 0 ? q * 1000 : SCENE.openAfterMs
  })()
  const [left, setLeft] = useState(Math.ceil(delay / 1000))

  const layout = useCallback(() => {
    const root = rootRef.current
    const img = imgRef.current
    const canvas = canvasRef.current
    if (!root || !img || !canvas || !img.complete) return false

    const rootRect = root.getBoundingClientRect()
    const imgRect = img.getBoundingClientRect()
    // 高度测量失败时不建帘，否则字数按 0 高度算会漏出大片空隙
    if (rootRect.height < 160 || imgRect.width < 40) return false

    const profile = scanProfile(img)
    if (!profile) return false

    const roofRect = {
      x: imgRect.left - rootRect.left,
      y: imgRect.top - rootRect.top,
      w: imgRect.width,
      h: imgRect.height,
    }

    // 门开在檐口正下方，是这座建筑的入口。
    // 底下留一段余地，好让敷居（下槛）和倒计时都露在画面里，
    // 不然门会被视口下缘齐齐切掉。
    const doorW = Math.round(roofRect.w * 0.52)
    const doorTop = Math.round(roofRect.y + roofRect.h - 26)
    const doorH = Math.max(150, Math.round(rootRect.height - doorTop - 62))
    root.style.setProperty('--door-w', `${doorW}px`)
    root.style.setProperty('--door-top', `${doorTop}px`)
    root.style.setProperty('--door-h', `${doorH}px`)
    // 檐下的墙身：让门看起来是嵌在这栋建筑里，而不是浮在渐变背景上
    root.style.setProperty('--wall-w', `${Math.round(roofRect.w * 0.94)}px`)
    root.style.setProperty('--wall-top', `${Math.round(roofRect.y + roofRect.h - 14)}px`)
    doorRef.current = { x: rootRect.width / 2, y: doorTop + 40 }
    // 镜头推进时以门口为原点
    root.style.setProperty('--zoom-origin', `50% ${doorTop + 60}px`)

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const w = Math.round(rootRect.width)
    const h = Math.round(rootRect.height)
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext('2d')
    // DPR 只作用在绘制变换上；物理全程用 CSS 像素
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const curtain = curtainRef.current || (curtainRef.current = new Curtain())
    const ok = curtain.build({
      bounds: { w, h },
      roofRect,
      profile,
      lines: SCENE.lines,
    })
    if (ok) {
      curtain.settle(260)
      curtain.draw(ctx, { ink: SCENE.palette.ink, cord: SCENE.palette.cord, font: FONT(curtain.fontSize) })
    }
    if (typeof window !== 'undefined') {
      window.__curtains = { [SCENE.id]: () => curtain.stats() }
    }
    return ok
  }, [])

  useLayoutEffect(() => {
    if (!loaded) return undefined
    let cancelled = false
    const run = () => {
      if (cancelled) return
      if (!layout()) requestAnimationFrame(run)
    }
    const fonts = document.fonts
    if (fonts && fonts.status !== 'loaded') fonts.ready.then(run)
    else run()

    const ro = new ResizeObserver(() => layout())
    if (rootRef.current) ro.observe(rootRef.current)
    return () => {
      cancelled = true
      ro.disconnect()
    }
  }, [loaded, layout])

  useEffect(() => {
    if (!loaded) return undefined
    let last = performance.now()
    const tick = (now) => {
      rafRef.current = requestAnimationFrame(tick)
      const dt = Math.min(48, now - last)
      last = now
      const curtain = curtainRef.current
      const canvas = canvasRef.current
      if (!curtain || !canvas || !curtain.ropes.length) return
      const pointer = pointerRef.current
      if (pointer.active && now > pointer.until) pointer.active = false
      curtain.step(pointer.active ? pointer : null, dt)
      pointer.dx *= 0.6
      pointer.dy *= 0.6
      curtain.draw(canvas.getContext('2d'), {
        ink: SCENE.palette.ink,
        cord: SCENE.palette.cord,
        font: FONT(curtain.fontSize),
      })
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [loaded])

  const open = useCallback(() => {
    if (enteredRef.current) return
    enteredRef.current = true
    setOpening(true)
    // 门一开，门内的气流把帘子吹开
    const { x, y } = doorRef.current
    curtainRef.current?.gust(x, y, 1)
    setTimeout(() => setZooming(true), DOOR_SLIDE_MS - 550)
    setTimeout(onEnter, DOOR_SLIDE_MS - 550 + ZOOM_MS)
  }, [onEnter])

  // 15 秒自动开门；不想等就点一下
  useEffect(() => {
    const timer = setTimeout(open, delay)
    const tick = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000)
    return () => {
      clearTimeout(timer)
      clearInterval(tick)
    }
  }, [delay, open])

  const onPointerMove = (e) => {
    const root = rootRef.current
    if (!root) return
    const r = root.getBoundingClientRect()
    const p = pointerRef.current
    const x = e.clientX - r.left
    const y = e.clientY - r.top
    p.dx = p.active ? x - p.x : 0
    p.dy = p.active ? y - p.y : 0
    p.x = x
    p.y = y
    p.active = true
    p.until = performance.now() + 900
  }

  return (
    <section
      className={`gate${opening ? ' is-open' : ''}${zooming ? ' is-zooming' : ''}`}
      ref={rootRef}
      data-card={SCENE.id}
      style={{
        '--ink': SCENE.palette.ink,
        '--paper': SCENE.palette.paper,
        '--glow': SCENE.palette.glow,
        '--from': SCENE.palette.from,
        '--to': SCENE.palette.to,
      }}
      onPointerMove={onPointerMove}
      onPointerLeave={() => {
        pointerRef.current.active = false
      }}
      onClick={open}
    >
      <div className="gate__bg" />
      <div className="gate__grain" />
      <div className="gate__wall" />

      {/* 帘后的拉门：门框 / 屋内 / 两扇障子 */}
      <div className="doorway">
        <div className="doorway__room" />
        <div className="doorway__glow" />
        <div className="shoji shoji--l" />
        <div className="shoji shoji--r" />
        <div className="doorway__frame" />
      </div>

      <header className="gate__head">
        <span className="gate__index">01</span>
        <h1 className="gate__title">{SCENE.title}</h1>
        <p className="gate__sub">{SCENE.subtitle}</p>
      </header>

      <div className="gate__roof">
        <img ref={imgRef} src={SCENE.roof} alt={SCENE.title} draggable="false" onLoad={() => setLoaded(true)} />
      </div>

      <canvas className="gate__canvas" ref={canvasRef} />

      <footer className={`gate__foot${opening ? ' is-hidden' : ''}`}>
        <span className="gate__count">{left}</span>
        <span className="gate__hint">秒後、門がひらく　·　押せばすぐに</span>
      </footer>
    </section>
  )
}
