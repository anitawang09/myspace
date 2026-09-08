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
  await page.waitForSelector('.room__canvas canvas', { timeout: 45000 }) // dev 首次编译 three 的分包可能很慢
  await page.waitForTimeout(3200)
  const room = await page.evaluate(() => {
    const cv = document.querySelector('.room__canvas canvas')
    const r = window.__room ? window.__room() : { objects: 0, lit: 0, hotspots: [], screen: {} }
    return { w: cv.width, h: cv.height, ...r }
  })
  const shot = `${OUT}/${prof.name}-4-room.png`
  await page.screenshot({ path: shot })
  console.log(`  门内  webgl=${room.w}x${room.h} 场景对象=${room.objects} 热点=${room.hotspots.join(',')}`)
  if (room.objects < 10) fail(`3D 场景对象太少 ${room.objects}`)
  for (const id of ['resume', 'gallery', 'travel']) {
    if (!room.hotspots.includes(id)) fail(`缺少热点 ${id}`)
  }

  // 热点在画面里的位置：相机要在左上、纸在中间、卡与机票在右下
  const S = room.screen
  const inFrame = ([x, y]) => x > 0.02 && x < 0.98 && y > 0.02 && y < 0.98
  console.log(
    `        位置 相机=${S.gallery} 纸=${S.resume} 卡票=${S.travel}`,
  )
  for (const [id, p] of Object.entries(S)) if (!inFrame(p)) fail(`热点 ${id} 不在画面内 ${p}`)
  if (S.gallery[0] > 0.45 || S.gallery[1] > 0.5) fail(`相机不在左上 ${S.gallery}`)
  if (S.resume[0] < 0.25 || S.resume[0] > 0.75) fail(`纸不在画面中部 ${S.resume}`)
  if (S.travel[0] < 0.55 || S.travel[1] < 0.5) fail(`卡与机票不在右下 ${S.travel}`)

  console.log(`        亮部占比=${room.lit}% 平均亮度=${room.mean}`)
  if (room.mean < 18) fail(`3D 房间几乎全黑（平均亮度 ${room.mean}）`)

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

    // 悬停与点击：逐个热点走一遍
    const S2 = (await page.evaluate(() => window.__room())).screen
    for (const id of ['resume', 'gallery', 'travel']) {
      // 镜头有鼠标视差：移过去之后物体会挪位，按新坐标再校正一次
      let [nx, ny] = S2[id]
      await page.mouse.move(nx * prof.width, ny * prof.height)
      await page.waitForTimeout(200)
      ;[nx, ny] = (await page.evaluate(() => window.__room())).screen[id]
      await page.mouse.move(nx * prof.width, ny * prof.height)
      await page.waitForTimeout(420)
      const label = await page.evaluate(() => {
        const el = document.querySelector('.room__label')
        return { on: el.classList.contains('is-on'), text: el.textContent.trim() }
      })
      if (!label.on) fail(`悬停 ${id} 没有出现标签`)
      await page.screenshot({ path: `${OUT}/7-hover-${id}.png` })

      await page.mouse.click(nx * prof.width, ny * prof.height)
      await page.waitForTimeout(520)
      const opened = await page.evaluate(() => {
        const p = document.querySelector('.ov__panel')
        return p ? p.querySelector('.ov__title').textContent : null
      })
      if (!opened) fail(`点击 ${id} 没有打开覆盖层`)
      else console.log(`  点击  ${id.padEnd(7)} → 「${opened}」 标签「${label.text}」 ✓`)
      await page.screenshot({ path: `${OUT}/8-open-${id}.png` })

      await page.keyboard.press('Escape')
      await page.waitForTimeout(360)
      const closed = await page.evaluate(() => !document.querySelector('.ov__panel'))
      if (!closed) fail(`${id} 的覆盖层 Esc 关不掉`)
    }

    // 拍立得横向滑轨确实能滑
    await page.goto(`${URL}?open=gallery`, { waitUntil: 'networkidle' })
    await page.waitForSelector('.rail')
    await page.waitForTimeout(600)
    const scrolled = await page.evaluate(async () => {
      const rail = document.querySelector('.rail')
      const before = rail.scrollLeft
      rail.scrollLeft = 400
      await new Promise((r) => setTimeout(r, 60))
      return { before, after: rail.scrollLeft, overflow: rail.scrollWidth > rail.clientWidth }
    })
    if (!scrolled.overflow || scrolled.after <= scrolled.before) fail('拍立得滑轨滑不动')
    await page.screenshot({ path: `${OUT}/9-gallery-scrolled.png` })
  }

  await page.close()
}

await browser.close()
console.log(failures ? `\n✗ ${failures} 处待修` : '\n✓ 全部通过')
process.exit(failures ? 1 : 0)
