// Verlet 链式物理常量。全部按「CSS 像素 / 帧」为单位，
// Canvas 只在 ctx 上做 DPR 缩放，绝不把 DPR 混进物理量，
// 否则高分屏上重力相当于被放大，粒子会一路砸到底部堆叠。
export const PHYSICS = {
  GRAVITY: 0.28,       // 重力
  FORCE: 0.025,        // 风 / 外力系数
  BOUNCE: 0.6,         // 边缘弹性反弹
  DAMPING: 0.986,      // 速度阻尼
  ITERATIONS: 6,       // 约束松弛迭代
  BEND: 0.055,         // 抗弯（纸帘感，避免绳子打卷）
  POINTER_RADIUS: 92,  // 鼠标推开半径
  POINTER_PUSH: 0.42,  // 推开强度
  POINTER_DRAG: 0.22,  // 跟随鼠标速度的拖带
}

export function makeParticle(x, y, pinned = false) {
  return { x, y, px: x, py: y, pinned }
}

// 一步 Verlet 积分：位置 += (位置 - 上一帧位置) * 阻尼 + 加速度
export function integrate(p, ax, ay, damping = PHYSICS.DAMPING) {
  if (p.pinned) {
    p.px = p.x
    p.py = p.y
    return
  }
  const vx = (p.x - p.px) * damping
  const vy = (p.y - p.py) * damping
  p.px = p.x
  p.py = p.y
  p.x += vx + ax
  p.y += vy + ay
}

// 距离约束（两端各承担一半，pinned 端不动）
export function solveDistance(a, b, rest) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const d = Math.hypot(dx, dy) || 1e-6
  const diff = (d - rest) / d
  const ax = a.pinned ? 0 : b.pinned ? 1 : 0.5
  const bx = b.pinned ? 0 : a.pinned ? 1 : 0.5
  a.x += dx * diff * ax
  a.y += dy * diff * ax
  b.x -= dx * diff * bx
  b.y -= dy * diff * bx
}

// 边界：碰到画布四壁按 BOUNCE 反弹（用 Verlet 的“改写上一帧位置”来表达速度反向）
export function solveBounds(p, w, h, pad = 0) {
  if (p.pinned) return false
  let hit = false
  const e = PHYSICS.BOUNCE
  if (p.x < pad) {
    const v = p.px - p.x
    p.x = pad
    p.px = p.x - v * e
    hit = true
  } else if (p.x > w - pad) {
    const v = p.px - p.x
    p.x = w - pad
    p.px = p.x - v * e
    hit = true
  }
  if (p.y > h - pad) {
    const v = p.py - p.y
    p.y = h - pad
    p.py = p.y - v * e
    hit = true
  } else if (p.y < pad) {
    const v = p.py - p.y
    p.y = pad
    p.py = p.y - v * e
    hit = true
  }
  return hit
}
