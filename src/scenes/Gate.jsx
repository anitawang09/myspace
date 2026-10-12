import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Curtain } from '../physics/curtain.js'
import { scanProfile } from '../lib/profile.js'
import { SCENE } from '../data/scene.js'

// 门外这一幕是关键路径——标题、建筑、字帘、倒计时都得尽快画出来。
// 懒加载背景的流体效果，别让 three.js 拖慢首屏（和 Room 场景同一个套路）。
const LiquidEther = lazy(() => import('../effects/LiquidEther.jsx'))

const FONT = (size) => `${size}px "Noto Serif JP","Songti SC","Yu Mincho",serif`
const DOOR_SLIDE_MS = 1900 // 与 styles.css 里 .shoji 的过渡时长保持一致
const ZOOM_MS = 1100

// 系统关了动态效果就别硬塞一个全程流动的背景；只读一次，这个偏好
// 在一个会话里基本不会变，不值得为它再订阅 change 事件。
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * 入口：鳳凰堂 + Verlet 字帘，中堂正面的开间里是一道日式拉门。
 * 15 秒后门自动拉开 —— 门内的气流把帘子吹开，镜头推进门里。
 */
export default function Gate({ onEnter }) {
  const rootRef = useRef(null)
  const imgRef = useRef(null)
  const eavesRef = useRef(null)
  const headRef = useRef(null)
  const canvasRef = useRef(null)
  const curtainRef = useRef(null)
  const doorRef = useRef({ x: 0, y: 0 }) // 门口中心，阵风的起点
  const pointerRef = useRef({ x: 0, y: 0, dx: 0, dy: 0, active: false, until: 0 })
  const rafRef = useRef(0)
  const enteredRef = useRef(false)

  const [ready, setReady] = useState({ img: false, eaves: false })
  const loaded = ready.img && ready.eaves
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
    const eaves = eavesRef.current
    const canvas = canvasRef.current
    if (!root || !img || !eaves || !canvas || !img.complete || !eaves.complete) return false

    const rootRect = root.getBoundingClientRect()
    const imgRect = img.getBoundingClientRect()
    // 高度测量失败时不建帘，否则字数按 0 高度算会漏出大片空隙
    if (rootRect.height < 160 || imgRect.width < 40) return false

    // 扫的是只有屋顶的那张 mask：整栋建筑每列最靠下的不透明像素是石台
    const profile = scanProfile(eaves)
    if (!profile) return false

    const templeRect = {
      x: imgRect.left - rootRect.left,
      y: imgRect.top - rootRect.top,
      w: imgRect.width,
      h: imgRect.height,
    }

    // 门就是中堂正面那一间：烘焙时把开间的四角投影到图上，存成归一化矩形
    const d = SCENE.temple.door
    const doorX = Math.round(templeRect.x + d.x0 * templeRect.w)
    const doorTop = Math.round(templeRect.y + d.y0 * templeRect.h)
    const doorW = Math.round((d.x1 - d.x0) * templeRect.w)
    const doorH = Math.round((d.y1 - d.y0) * templeRect.h)
    root.style.setProperty('--door-x', `${doorX}px`)
    root.style.setProperty('--door-top', `${doorTop}px`)
    root.style.setProperty('--door-w', `${doorW}px`)
    root.style.setProperty('--door-h', `${doorH}px`)
    const doorCx = doorX + doorW / 2
    const doorCy = doorTop + doorH / 2
    doorRef.current = { x: doorCx, y: doorCy }
    // 镜头以门为原点推进，推到门洞盖满整个视口为止——门在整栋建筑里只占一小间，
    // 固定倍数推不进去，只会停在门外半空中淡出
    root.style.setProperty('--zoom-origin', `${doorCx}px ${doorCy}px`)
    const fill = Math.max(rootRect.width / doorW, rootRect.height / doorH)
    root.style.setProperty('--zoom-scale', Math.max(3.4, fill * 1.15).toFixed(2))

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
    const ok = curtain.build({ bounds: { w, h }, rect: templeRect, profile, lines: SCENE.lines })
    if (ok) {
      curtain.settle()
      curtain.draw(ctx, { ink: SCENE.palette.ink, cord: SCENE.palette.cord, font: FONT(curtain.fontSize) })
    }
    window.__curtain = () => curtain.stats()
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
    // 标题字体晚到：换上 Noto Serif JP 后标题变高，建筑整体下移几像素，
    // 根节点尺寸却没变。不盯着标题，门和帘子的锚点就停在旧位置上
    if (headRef.current) ro.observe(headRef.current)
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
    curtainRef.current?.gust(x, y)
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
    const r = rootRef.current.getBoundingClientRect()
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
      style={{
        '--ink': SCENE.palette.ink,
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
      {!prefersReducedMotion && (
        <Suspense fallback={null}>
          <LiquidEther
            className="gate__liquid"
            style={{ pointerEvents: 'none' }}
            colors={SCENE.palette.liquid}
            // 力道比示例默认值收着点：空闲的自动漂移不该把速度场推到
            // 调色板最暖的那一头，那样标题背后会无端冒出一团金色光斑
            mouseForce={9}
            cursorSize={90}
            // 它只是背景装饰，别为了"看起来更稠"多付一整圈粘性迭代的钱——
            // isViscous 会在每帧再跑一遍 iterationsViscous 次求解，
            // 在低端设备/软件渲染上这是最贵的一项，关掉之后默认的平流已经够看
            resolution={0.3}
            iterationsPoisson={20}
            autoSpeed={0.35}
            autoIntensity={1}
            takeoverDuration={0.4}
            autoResumeDelay={2200}
            autoRampDuration={1.2}
          />
        </Suspense>
      )}
      <div className="gate__grain" />

      {/* 帘后的拉门：门框 / 屋内 / 两扇障子 */}
      <div className="doorway">
        <div className="doorway__room" />
        <div className="doorway__glow" />
        <div className="shoji shoji--l" />
        <div className="shoji shoji--r" />
        <div className="doorway__frame" />
      </div>

      <header className="gate__head" ref={headRef}>
        <span className="gate__index">01</span>
        <h1 className="gate__title">{SCENE.title}</h1>
        <p className="gate__sub">{SCENE.subtitle}</p>
      </header>

      <div className="gate__temple" style={{ '--base': SCENE.temple.base }}>
        <img
          ref={imgRef}
          src={SCENE.temple.src}
          alt={SCENE.temple.alt}
          draggable="false"
          onLoad={() => setReady((r) => ({ ...r, img: true }))}
        />
        {/* 阿字池：同一张图上下翻转，沿石台下沿对称 */}
        <div className="gate__pond" aria-hidden="true">
          <img src={SCENE.temple.src} alt="" draggable="false" />
        </div>
        <img
          className="gate__eaves"
          ref={eavesRef}
          src={SCENE.temple.eaves}
          alt=""
          aria-hidden="true"
          onLoad={() => setReady((r) => ({ ...r, eaves: true }))}
        />
      </div>

      <canvas className="gate__canvas" ref={canvasRef} />

      <footer className={`gate__foot${opening ? ' is-hidden' : ''}`}>
        <span className="gate__count">{left}</span>
        <span className="gate__hint">秒後、門がひらく　·　押せばすぐに</span>
      </footer>
    </section>
  )
}
