import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Curtain } from '../physics/curtain.js'
import { scanProfile } from '../lib/profile.js'

/**
 * 一张卡片 = 屋顶图 + 一整块 Canvas 垂帘。
 * 屋顶图加载后扫描轮廓，文字锚点动态咬合檐口下沿。
 * 只有当前卡（及左右相邻）跑物理，其余暂停。
 */
export default function RoofCard({ card, active, index }) {
  const rootRef = useRef(null)
  const imgRef = useRef(null)
  const canvasRef = useRef(null)
  const curtainRef = useRef(null)
  const pointerRef = useRef({ x: 0, y: 0, dx: 0, dy: 0, active: false, until: 0 })
  const rafRef = useRef(0)
  const activeRef = useRef(active)
  const [loaded, setLoaded] = useState(false)

  activeRef.current = active

  const layout = useCallback(() => {
    const root = rootRef.current
    const img = imgRef.current
    const canvas = canvasRef.current
    if (!root || !img || !canvas || !img.complete) return false

    const rootRect = root.getBoundingClientRect()
    const imgRect = img.getBoundingClientRect()
    // 高度测量失败（还没布局完 / display:none）时不建帘，
    // 否则字数按 0 高度算出来会漏出大片空隙。
    if (rootRect.height < 160 || imgRect.width < 40) return false

    const profile = scanProfile(img)
    if (!profile) return false

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

    const roofRect = {
      x: imgRect.left - rootRect.left,
      y: imgRect.top - rootRect.top,
      w: imgRect.width,
      h: imgRect.height,
    }
    // 纸幅顶边跟着屋檐走：上缘留 110px 渐隐带，接住檐口的弧线
    root.style.setProperty('--paper-top', `${Math.round(roofRect.y + roofRect.h - 110)}px`)
    root.style.setProperty('--paper-w', `${Math.round(roofRect.w * 1.02)}px`)

    const curtain = curtainRef.current || (curtainRef.current = new Curtain())
    const ok = curtain.build({
      bounds: { w, h },
      roofRect,
      profile,
      lines: card.lines,
    })
    if (ok) {
      curtain.settle(260)
      curtain.draw(ctx, {
        ink: card.palette.ink,
        cord: card.palette.cord,
        font: `${curtain.fontSize}px "Noto Serif JP","Songti SC","Yu Mincho",serif`,
      })
    }
    // 调试出口：截图脚本会读它逐张核对空隙 / 堆叠 / 咬合
    if (typeof window !== 'undefined') {
      window.__curtains = window.__curtains || {}
      window.__curtains[card.id] = () => curtain.stats()
    }
    return ok
  }, [card])

  useLayoutEffect(() => {
    if (!loaded) return
    // 字体没就位时字宽会变，布局稳定后再建帘
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
      if (!activeRef.current) return
      const pointer = pointerRef.current
      if (pointer.active && now > pointer.until) pointer.active = false
      curtain.step(pointer.active ? pointer : null, dt)
      pointer.dx *= 0.6
      pointer.dy *= 0.6
      curtain.draw(canvas.getContext('2d'), {
        ink: card.palette.ink,
        cord: card.palette.cord,
        font: `${curtain.fontSize}px "Noto Serif JP","Songti SC","Yu Mincho",serif`,
      })
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [loaded, card])

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
      className="card"
      ref={rootRef}
      data-card={card.id}
      style={{ '--ink': card.palette.ink, '--paper': card.palette.paper }}
      onPointerMove={onPointerMove}
      onPointerLeave={() => {
        pointerRef.current.active = false
      }}
    >
      <div className="card__paper" />
      <header className="card__head">
        <span className="card__index">{String(index + 1).padStart(2, '0')}</span>
        <h2 className="card__title">{card.title}</h2>
        <p className="card__sub">{card.subtitle}</p>
      </header>
      <div className="card__roof">
        <img
          ref={imgRef}
          src={card.roof}
          alt={card.title}
          draggable="false"
          onLoad={() => setLoaded(true)}
        />
      </div>
      <canvas className="card__canvas" ref={canvasRef} />
    </section>
  )
}
