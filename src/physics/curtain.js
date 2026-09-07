import {
  PHYSICS,
  makeParticle,
  integrate,
  solveDistance,
  solveBounds,
} from './verlet.js'
import { sampleProfile, profileSpan } from '../lib/profile.js'

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smoothstep = (a, b, v) => {
  const t = clamp01((v - a) / (b - a || 1e-6))
  return t * t * (3 - 2 * t)
}
// 稳定伪随机：同一列每次重建都得到同样的长度/相位，重排不会“跳”
const hash = (n) => {
  const s = Math.sin(n * 127.1) * 43758.5453
  return s - Math.floor(s)
}

// 右下角消融权重：只用于渲染淡化，绝不参与物理，绳子始终完整连结
export function dissolveWeight(x, y, w, h) {
  const d = (x / w) * 0.55 + (y / h) * 0.45
  return smoothstep(0.62, 0.99, d)
}

export class Curtain {
  constructor() {
    this.ropes = []
    this.bounds = { w: 0, h: 0 }
    this.fontSize = 16
    this.spacing = 18
    this.colGap = 26
    this.time = 0
    this.diag = null
  }

  /**
   * @param {object} o
   * @param {{w:number,h:number}} o.bounds     画布尺寸（CSS 像素）
   * @param {{x:number,y:number,w:number,h:number}} o.roofRect 屋顶图在画布内的矩形
   * @param {object} o.profile  scanProfile 的结果
   * @param {string[]} o.lines  文字池
   */
  build({ bounds, roofRect, profile, lines }) {
    this.bounds = bounds
    this.ropes = []
    const span = profileSpan(profile)
    if (!span || bounds.h < 160 || roofRect.w < 40) {
      this.diag = { ok: false, reason: !span ? 'no-profile' : 'bad-layout', ropes: 0 }
      return false
    }

    // 字号随屋顶宽度而非画布宽度，屋顶多宽帘子就多密
    const fontSize = Math.max(12, Math.min(20, roofRect.w / 46))
    const spacing = fontSize * 1.06
    const colGap = fontSize * 1.78
    this.fontSize = fontSize
    this.spacing = spacing
    this.colGap = colGap

    // 底部留白：让绳子自然停在离底边一点的位置，
    // 而不是靠边界碰撞硬撑 —— 那样右下角会堆成一坨。
    const floor = bounds.h - Math.max(28, bounds.h * 0.06)
    const inset = colGap * 0.45
    const x0 = roofRect.x + span.u0 * roofRect.w + inset
    const x1 = roofRect.x + span.u1 * roofRect.w - inset
    const cols = Math.max(1, Math.floor((x1 - x0) / colGap))
    const step = cols > 1 ? (x1 - x0) / cols : 0

    let charCursor = 0
    const pool = lines.join('　')

    for (let c = 0; c <= cols; c++) {
      const ax = x0 + step * c
      const u = (ax - roofRect.x) / roofRect.w
      const py = sampleProfile(profile, u, 'bottom')
      if (py == null) continue

      // 咬合：锚点往檐口里塞 2px，杜绝屋顶与文字之间露出缝隙
      const anchorY = roofRect.y + py * roofRect.h - 2
      const avail = floor - anchorY
      if (avail < spacing * 3) continue

      const r = hash(c + 1)
      // 右侧稍短一些，形成飘散的帘尾；其余基本挂满
      const edge = clamp01((ax - roofRect.x) / roofRect.w)
      const lenScale = 1 - smoothstep(0.55, 1, edge) * (0.12 + r * 0.2)
      const count = Math.max(3, Math.floor((avail / spacing) * lenScale))

      const ps = [makeParticle(ax, anchorY, true)]
      const chars = ['']
      for (let i = 1; i <= count; i++) {
        ps.push(makeParticle(ax, anchorY + i * spacing))
        chars.push(pool[charCursor++ % pool.length])
      }
      this.ropes.push({ ps, chars, seed: r * 6.283, anchorY, ax })
    }

    this.diag = { ok: this.ropes.length > 0, reason: null, ropes: this.ropes.length }
    return this.ropes.length > 0
  }

  /** 预热：先跑若干步让帘子自然垂下，切卡时不会看到“掉下来”的突兀过程 */
  settle(steps = 240) {
    for (let i = 0; i < steps; i++) this.step(null, 16.7)
  }

  step(pointer, dtMs = 16.7) {
    const dt = Math.min(2, dtMs / 16.7)
    this.time += dtMs
    const { w, h } = this.bounds
    const t = this.time
    const R = PHYSICS.POINTER_RADIUS

    for (const rope of this.ropes) {
      const { ps } = rope
      // 风是一道横向传播的波，相邻列几乎同相 ——
      // 每列各摆各的会让帘子互相穿插打架，看着就散了。
      // 波长要远大于帘宽：相位差一大，左右两半就往相反方向倒，
      // 列一长（手机竖屏）末端摆幅放大，立刻互相穿插。
      const phase = rope.ax * 0.0012
      const w1 = Math.sin(t * 0.0011 + phase)
      const w2 = Math.sin(t * 0.0006 + phase * 0.5 + rope.seed * 0.12)
      for (let i = 1; i < ps.length; i++) {
        const p = ps[i]
        const depth = i / ps.length // 越靠下摆幅越大
        const wind = (w1 * 0.8 + w2 * 0.4) * PHYSICS.FORCE * (0.2 + depth * 0.8)
        integrate(p, wind * dt, PHYSICS.GRAVITY * dt)
      }
    }

    // 鼠标：划过推开，靠约束回弹，移开后自然荡回原位
    if (pointer && pointer.active) {
      const { x, y, dx, dy } = pointer
      for (const rope of this.ropes) {
        for (let i = 1; i < rope.ps.length; i++) {
          const p = rope.ps[i]
          const ox = p.x - x
          const oy = p.y - y
          const d2 = ox * ox + oy * oy
          if (d2 > R * R || d2 < 1e-6) continue
          const d = Math.sqrt(d2)
          const push = (1 - d / R) * PHYSICS.POINTER_PUSH
          p.x += (ox / d) * (R - d) * push * 0.16
          p.y += (oy / d) * (R - d) * push * 0.16
          p.x += dx * push * PHYSICS.POINTER_DRAG
          p.y += dy * push * PHYSICS.POINTER_DRAG
        }
      }
    }

    for (let k = 0; k < PHYSICS.ITERATIONS; k++) {
      for (const rope of this.ropes) {
        const { ps } = rope
        for (let i = 0; i < ps.length - 1; i++) solveDistance(ps[i], ps[i + 1], this.spacing)
        // 抗弯：向前后两点的中点靠拢，纸帘不打卷
        for (let i = 1; i < ps.length - 1; i++) {
          const p = ps[i]
          if (p.pinned) continue
          const mx = (ps[i - 1].x + ps[i + 1].x) * 0.5
          const my = (ps[i - 1].y + ps[i + 1].y) * 0.5
          p.x += (mx - p.x) * PHYSICS.BEND
          p.y += (my - p.y) * PHYSICS.BEND
        }
        for (let i = 1; i < ps.length; i++) solveBounds(ps[i], w, h, 2)
      }
    }

    // 相邻列的分离约束：帘子没有互相碰撞的概念，
    // 摆到一起就会字压字，这里只按横向最小间距轻轻推开。
    const minGap = this.colGap * 0.62
    for (let r = 0; r < this.ropes.length - 1; r++) {
      const a = this.ropes[r].ps
      const b = this.ropes[r + 1].ps
      const n = Math.min(a.length, b.length)
      for (let i = 1; i < n; i++) {
        const gap = b[i].x - a[i].x
        if (gap >= minGap) continue
        const push = (minGap - gap) * 0.25
        a[i].x -= push
        b[i].x += push
      }
    }

    // 收尾：自锚点向下把每一节硬压回固定间距。
    // 松弛法解不完长链，重力会把绳子拉长 —— 表现为越往下字距越开，
    // 末端还会一路坠到底边挤成一堆。这一遍让绳子彻底不可伸长。
    for (const rope of this.ropes) {
      const { ps } = rope
      for (let i = 1; i < ps.length; i++) {
        const a = ps[i - 1]
        const b = ps[i]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const k = this.spacing / (Math.hypot(dx, dy) || 1e-6)
        b.x = a.x + dx * k
        b.y = a.y + dy * k
      }
      for (let i = 1; i < ps.length; i++) solveBounds(ps[i], w, h, 2)
    }
  }

  draw(ctx, { ink, cord, font }) {
    const { w, h } = this.bounds
    ctx.clearRect(0, 0, w, h)

    // 悬绳：整绳始终完整连结、不参与消融
    ctx.strokeStyle = cord
    ctx.lineWidth = 1
    ctx.beginPath()
    for (const rope of this.ropes) {
      const { ps } = rope
      ctx.moveTo(ps[0].x, ps[0].y)
      for (let i = 1; i < ps.length; i++) ctx.lineTo(ps[i].x, ps[i].y)
    }
    ctx.stroke()

    ctx.fillStyle = ink
    ctx.font = font
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const rope of this.ropes) {
      const { ps, chars } = rope
      for (let i = 1; i < ps.length; i++) {
        const p = ps[i]
        const prev = ps[i - 1]
        const ch = chars[i]
        if (!ch || ch === '　') continue
        // 字随绳段方向转，绳子被推开时整列跟着倾斜
        const dx = p.x - prev.x
        const dy = p.y - prev.y
        const rot = Math.atan2(-dx, dy)
        // 注意：这里必须用 save/translate/rotate 叠加在既有变换上。
        // 直接 setTransform 会把外层的 DPR 缩放整个覆盖掉，
        // 高分屏上字就会缩到左上角、和绳子分家。
        ctx.globalAlpha = 1 - dissolveWeight(p.x, p.y, w, h) * 0.8
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(rot)
        ctx.fillText(ch, 0, 0)
        ctx.restore()
      }
    }
    ctx.globalAlpha = 1
  }

  /** 自检数据：给逐张截图验证用 —— 空隙、贴地堆叠、锚点咬合都在这里量 */
  stats() {
    const { w, h } = this.bounds
    let particles = 0
    let floorContacts = 0
    let maxY = 0
    let maxAnchorGap = 0
    let prevAx = null
    let maxColGap = 0
    const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }
    for (const rope of this.ropes) {
      particles += rope.ps.length
      for (const p of rope.ps) {
        if (p.x < box.x0) box.x0 = p.x
        if (p.x > box.x1) box.x1 = p.x
        if (p.y < box.y0) box.y0 = p.y
        if (p.y > box.y1) box.y1 = p.y
      }
      const last = rope.ps[rope.ps.length - 1]
      maxY = Math.max(maxY, last.y)
      for (const p of rope.ps) if (p.y > h - 4) floorContacts++
      maxAnchorGap = Math.max(maxAnchorGap, Math.abs(rope.ps[0].y - rope.anchorY))
      if (prevAx != null) maxColGap = Math.max(maxColGap, rope.ax - prevAx)
      prevAx = rope.ax
    }
    return {
      ...this.diag,
      particles,
      floorContacts,
      maxY: Math.round(maxY),
      bottom: Math.round(h),
      slack: Math.round(h - maxY),
      maxAnchorGap: Math.round(maxAnchorGap),
      maxColGap: Math.round(maxColGap),
      fontSize: Math.round(this.fontSize),
      // 物理包围盒（CSS 像素）：与画布上真实墨迹的包围盒对照，
      // 任何变换/DPR 错位都会在这里露馅
      box: {
        x0: Math.round(box.x0), y0: Math.round(box.y0),
        x1: Math.round(box.x1), y1: Math.round(box.y1),
      },
      canvas: { w: Math.round(w), h: Math.round(h) },
    }
  }
}
