// 逐张截图 + 自检：咬合对齐、垂帘手感、贴地高度、空隙与底部堆叠。
// 三种视口跑一遍 —— 高 DPR 是「粒子堆到底部」最容易翻车的场景。
import { chromium } from 'playwright'
import { existsSync, mkdirSync } from 'node:fs'

const URL = process.env.URL || 'http://127.0.0.1:5173'
const OUT = 'shots'
const LOCAL = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
mkdirSync(OUT, { recursive: true })

const PROFILES = [
  { name: 'desktop', width: 1440, height: 900, dsf: 1, shots: 'all' },
  { name: 'retina', width: 1440, height: 900, dsf: 2, shots: 'first' },
  { name: 'mobile', width: 414, height: 812, dsf: 2, shots: 'first' },
]

const browser = await chromium.launch(existsSync(LOCAL) ? { executablePath: LOCAL } : {})
let failures = 0

for (const prof of PROFILES) {
  const page = await browser.newPage({
    viewport: { width: prof.width, height: prof.height },
    deviceScaleFactor: prof.dsf,
  })
  page.on('pageerror', (e) => {
    console.log('  ! pageerror:', e.message)
    failures++
  })
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForFunction(
    () => window.__curtains && Object.keys(window.__curtains).length >= 5,
    null,
    { timeout: 20000 },
  )
  const ids = await page.evaluate(() => Object.keys(window.__curtains))
  console.log(`\n▌${prof.name}  ${prof.width}x${prof.height} @${prof.dsf}x`)

  for (let i = 0; i < ids.length; i++) {
    await page.evaluate((n) => document.querySelectorAll('.dot')[n].click(), i)
    await page.waitForTimeout(900)
    const id = ids[i]
    const stats = await page.evaluate((k) => window.__curtains[k](), id)
    // 端到端核对：把 Canvas 上真实墨迹的包围盒换算回 CSS 像素，
    // 与物理包围盒比对 —— DPR / 变换错位会让两者对不上
    const ink = await page.evaluate((k) => {
      const cv = document.querySelector(`[data-card="${k}"] canvas`)
      const ctx = cv.getContext('2d', { willReadFrequently: true })
      const { data } = ctx.getImageData(0, 0, cv.width, cv.height)
      const scale = cv.width / parseFloat(cv.style.width)
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
      for (let y = 0; y < cv.height; y += 2) {
        for (let x = 0; x < cv.width; x += 2) {
          if (data[(y * cv.width + x) * 4 + 3] > 40) {
            if (x < x0) x0 = x
            if (x > x1) x1 = x
            if (y < y0) y0 = y
            if (y > y1) y1 = y
          }
        }
      }
      return {
        x0: Math.round(x0 / scale), y0: Math.round(y0 / scale),
        x1: Math.round(x1 / scale), y1: Math.round(y1 / scale),
      }
    }, id)

    const geo = await page.evaluate((k) => {
      const card = document.querySelector(`[data-card="${k}"]`)
      const img = card.querySelector('img').getBoundingClientRect()
      const root = card.getBoundingClientRect()
      const cv = card.querySelector('canvas')
      return {
        roofBottom: Math.round(img.bottom - root.top),
        // Canvas 后备缓冲 / CSS 尺寸的比值必须等于 DPR，否则物理和绘制不同尺
        ratio: +(cv.width / parseFloat(cv.style.width)).toFixed(2),
      }
    }, id)

    if (prof.shots === 'all' || i === 0) {
      const tag = prof.shots === 'all' ? `${String(i + 1).padStart(2, '0')}-${id}` : `${prof.name}-${id}`
      await page.screenshot({ path: `${OUT}/${tag}.png` })
    }

    const problems = []
    if (!stats.ok) problems.push(`建帘失败(${stats.reason})`)
    if (stats.ropes < 8) problems.push(`绳数偏少 ${stats.ropes}（高度测量可能失败）`)
    if (stats.floorContacts > 0) problems.push(`底部堆叠 ${stats.floorContacts} 个粒子贴边`)
    if (stats.slack < 8) problems.push(`贴地过死 slack=${stats.slack}`)
    if (stats.maxAnchorGap > 1) problems.push(`锚点漂移 ${stats.maxAnchorGap}px（咬合失效）`)
    if (stats.maxColGap > stats.fontSize * 2.4) problems.push(`列间空隙 ${stats.maxColGap}px`)
    if (Math.abs(geo.ratio - Math.min(2, prof.dsf)) > 0.01) problems.push(`Canvas 缩放比 ${geo.ratio}`)
    const drift = Math.max(
      Math.abs(ink.x0 - stats.box.x0), Math.abs(ink.x1 - stats.box.x1),
      Math.abs(ink.y0 - stats.box.y0), Math.abs(ink.y1 - stats.box.y1),
    )
    if (drift > 14) problems.push(`墨迹与物理错位 ${drift}px（变换/DPR 没对上）`)
    if (problems.length) failures++

    console.log(
      `  ${id.padEnd(9)} ropes=${String(stats.ropes).padStart(3)} 粒子=${String(stats.particles).padStart(4)} ` +
        `字号=${stats.fontSize} 画布=${stats.canvas.w}x${stats.canvas.h}(${geo.ratio}x) ` +
        `檐口y=${geo.roofBottom} 帘底=${stats.maxY}/${stats.bottom} 余量=${stats.slack} 贴边=${stats.floorContacts} ` +
        `错位=${drift} ` +
        (problems.length ? `\n     ⚠ ${problems.join(' / ')}` : '✓'),
    )
  }

  if (prof.name === 'desktop') {
    // 交互：光标横扫推开 → 移开回弹 → 拖拽中间态 → 落位
    await page.evaluate(() => document.querySelectorAll('.dot')[0].click())
    await page.waitForTimeout(700)
    const box = await page.locator('.card').first().boundingBox()
    for (let s = 0; s <= 12; s++) {
      await page.mouse.move(box.x + 140 + (box.width - 340) * (s / 12), box.y + box.height * 0.68)
      await page.waitForTimeout(28)
    }
    await page.screenshot({ path: `${OUT}/06-pointer-push.png` })
    await page.mouse.move(box.x + box.width / 2, 6)
    await page.waitForTimeout(1600)
    await page.screenshot({ path: `${OUT}/07-pointer-rebound.png` })

    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.3)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.42, box.y + box.height * 0.3, { steps: 14 })
    await page.waitForTimeout(120)
    await page.screenshot({ path: `${OUT}/08-drag-midway.png` })
    await page.mouse.up()
    await page.waitForTimeout(900)
    await page.screenshot({ path: `${OUT}/09-after-drag.png` })
  }
  await page.close()
}

await browser.close()
console.log(failures ? `\n✗ ${failures} 处待修` : '\n✓ 全部通过')
process.exit(failures ? 1 : 0)
