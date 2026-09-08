// 逐幕截图 + 自检：
//   门外 —— 咬合对齐、垂帘手感、贴地高度、空隙与底部堆叠
//   开门 —— 拉门滑开、暖光漫出、阵风把帘子吹开
//   门内 —— 3D 书斋是否真的渲染出来（读像素判断，不只看有没有 canvas）
import { chromium } from 'playwright'
import { existsSync, mkdirSync } from 'node:fs'

const URL = process.env.URL || 'http://127.0.0.1:5173'
const OUT = 'shots'
const LOCAL = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
mkdirSync(OUT, { recursive: true })

const PROFILES = [
  { name: 'desktop', width: 1440, height: 900, dsf: 1, full: true },
  { name: 'retina', width: 1440, height: 900, dsf: 2 },
  { name: 'mobile', width: 414, height: 812, dsf: 2 },
]

const browser = await chromium.launch(existsSync(LOCAL) ? { executablePath: LOCAL } : {})
let failures = 0
const fail = (msg) => {
  console.log(`     ⚠ ${msg}`)
  failures++
}

for (const prof of PROFILES) {
  const page = await browser.newPage({
    viewport: { width: prof.width, height: prof.height },
    deviceScaleFactor: prof.dsf,
  })
  page.on('pageerror', (e) => fail(`pageerror: ${e.message}`))
  console.log(`\n▌${prof.name}  ${prof.width}x${prof.height} @${prof.dsf}x`)

  // ── 门外：先把自动开门推远，从容检查闭门状态（开门另用点击与计时两条路各验一次）
  await page.goto(`${URL}?t=120`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__curtains && Object.keys(window.__curtains).length, null, { timeout: 20000 })
  await page.waitForTimeout(900)

  const stats = await page.evaluate(() => window.__curtains.chidori())
  const geo = await page.evaluate(() => {
    const gate = document.querySelector('.gate')
    const img = gate.querySelector('img').getBoundingClientRect()
    const door = gate.querySelector('.doorway').getBoundingClientRect()
    const cv = gate.querySelector('canvas')
    const root = gate.getBoundingClientRect()
    const z = (el) => +getComputedStyle(el).zIndex
    return {
      roofBottom: Math.round(img.bottom - root.top),
      doorTop: Math.round(door.top - root.top),
      doorW: Math.round(door.width),
      // 门必须在帘子后面：z(门) < z(canvas)
      order: z(gate.querySelector('.doorway')) < z(cv),
      ratio: +(cv.width / parseFloat(cv.style.width)).toFixed(2),
    }
  })
  const ink = await page.evaluate(() => {
    const cv = document.querySelector('.gate canvas')
    const ctx = cv.getContext('2d', { willReadFrequently: true })
    const { data } = ctx.getImageData(0, 0, cv.width, cv.height)
    const scale = cv.width / parseFloat(cv.style.width)
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (let y = 0; y < cv.height; y += 2)
      for (let x = 0; x < cv.width; x += 2)
        if (data[(y * cv.width + x) * 4 + 3] > 40) {
          if (x < x0) x0 = x; if (x > x1) x1 = x
          if (y < y0) y0 = y; if (y > y1) y1 = y
        }
    return { x0: Math.round(x0 / scale), y0: Math.round(y0 / scale), x1: Math.round(x1 / scale), y1: Math.round(y1 / scale) }
  })
  const drift = Math.max(
    Math.abs(ink.x0 - stats.box.x0), Math.abs(ink.x1 - stats.box.x1),
    Math.abs(ink.y0 - stats.box.y0), Math.abs(ink.y1 - stats.box.y1),
  )
  await page.screenshot({ path: `${OUT}/${prof.name}-1-gate.png` })

  console.log(
    `  门外  ropes=${stats.ropes} 粒子=${stats.particles} 字号=${stats.fontSize} ` +
      `画布=${stats.canvas.w}x${stats.canvas.h}(${geo.ratio}x) 檐口y=${geo.roofBottom} ` +
      `门顶y=${geo.doorTop} 门宽=${geo.doorW} 帘底=${stats.maxY}/${stats.bottom} ` +
      `余量=${stats.slack} 贴边=${stats.floorContacts} 错位=${drift}`,
  )
  if (!stats.ok) fail(`建帘失败(${stats.reason})`)
  if (stats.ropes < 8) fail(`绳数偏少 ${stats.ropes}（高度测量可能失败）`)
  if (stats.floorContacts > 0) fail(`底部堆叠 ${stats.floorContacts} 个粒子贴边`)
  if (stats.slack < 8) fail(`贴地过死 slack=${stats.slack}`)
  if (stats.maxAnchorGap > 1) fail(`锚点漂移 ${stats.maxAnchorGap}px`)
  if (drift > 14) fail(`墨迹与物理错位 ${drift}px`)
  if (Math.abs(geo.ratio - Math.min(2, prof.dsf)) > 0.01) fail(`Canvas 缩放比 ${geo.ratio}`)
  if (!geo.order) fail('拉门没有排在帘子后面')
  if (geo.doorTop < geo.roofBottom - 60) fail(`门顶(${geo.doorTop}) 离檐口(${geo.roofBottom}) 太远`)

  // ── 开门（点击路径）：抓滑动中与全开
  await page.mouse.click(prof.width / 2, prof.height * 0.28)
  await page.waitForFunction(() => document.querySelector('.gate.is-open'), null, { timeout: 5000 })
  await page.waitForTimeout(560)
  const mid = await page.evaluate(() => {
    const l = document.querySelector('.shoji--l')
    return l ? Math.round(new DOMMatrix(getComputedStyle(l).transform).m41) : 0
  })
  await page.screenshot({ path: `${OUT}/${prof.name}-2-opening.png` })
  if (mid >= -2) fail(`拉门没在滑动（左扇位移 ${mid}px）`)

  await page.waitForTimeout(1000)
  await page.screenshot({ path: `${OUT}/${prof.name}-3-open.png` })

  // ── 门内：等 3D 场景，读像素确认真的画出来了
  await page.waitForSelector('.room__canvas canvas', { timeout: 15000 })
  await page.waitForTimeout(3200)
  const room = await page.evaluate(() => {
    const cv = document.querySelector('.room__canvas canvas')
    const r = window.__room ? window.__room() : { objects: 0, lit: 0 }
    return { w: cv.width, h: cv.height, objects: r.objects, lit: r.lit }
  })
  const shot = `${OUT}/${prof.name}-4-room.png`
  await page.screenshot({ path: shot })
  console.log(`  门内  webgl=${room.w}x${room.h} 场景对象=${room.objects}`)
  if (room.objects < 10) fail(`3D 场景对象太少 ${room.objects}`)

  console.log(`        亮部占比=${room.lit}%`)
  if (room.lit < 8) fail(`3D 房间几乎全黑（亮部 ${room.lit}%）`)

  // ── 开门（计时路径）：不点任何东西，等它自己开
  await page.goto(`${URL}?t=3`, { waitUntil: 'domcontentloaded' })
  const t0 = Date.now()
  try {
    await page.waitForFunction(() => document.querySelector('.gate.is-open'), null, { timeout: 9000 })
    console.log(`  计时  未点击，${((Date.now() - t0) / 1000).toFixed(1)}s 后自动开门 ✓`)
  } catch {
    fail('到点没有自动开门')
  }

  if (prof.full) {
    // 交互：光标横扫推开字帘 / 直接进屋看书桌
    await page.goto(`${URL}?t=99`, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.__curtains && Object.keys(window.__curtains).length)
    await page.waitForTimeout(700)
    const box = await page.locator('.gate').boundingBox()
    for (let s = 0; s <= 12; s++) {
      await page.mouse.move(box.x + 140 + (box.width - 340) * (s / 12), box.y + box.height * 0.7)
      await page.waitForTimeout(28)
    }
    await page.screenshot({ path: `${OUT}/5-pointer-push.png` })

    await page.goto(`${URL}?room=1`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.room__canvas canvas')
    await page.waitForTimeout(3400)
    await page.screenshot({ path: `${OUT}/6-desk.png` })
    await page.mouse.move(1200, 300)
    await page.waitForTimeout(700)
    await page.screenshot({ path: `${OUT}/7-desk-parallax.png` })
  }

  await page.close()
}

await browser.close()
console.log(failures ? `\n✗ ${failures} 处待修` : '\n✓ 全部通过')
process.exit(failures ? 1 : 0)
