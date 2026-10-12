// 把鳳凰堂模型烘成门外场景的静态图（需要 npm run dev 已启动）。
//
//   node scripts/bake-temple.mjs                 写入 public/temple/ 与 src/data/temple.json
//   node scripts/bake-temple.mjs --preview DIR   只写到 DIR，调构图用
//   额外参数原样透传给 debug/bake-temple.js：--fov=20 --cy=11 --cz=92 --ty=6.2 ...
//
// 为什么烘成图而不是在门外实时渲染：机位是固定的，实时跑 three.js 只为画
// 一张不动的画面，是让每个访客白付 WebGL 与 bundle 的钱。字帘的轮廓扫描也
// 原封不动——它本来就吃一张带 alpha 的图。
import { chromium } from 'playwright'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const URL = process.env.URL || 'http://127.0.0.1:5173'
const LOCAL = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

const args = process.argv.slice(2)
const previewIdx = args.indexOf('--preview')
const previewDir = previewIdx >= 0 ? resolve(args[previewIdx + 1]) : null
const params = new URLSearchParams()
for (const a of args) {
  const m = /^--(\w+)=(.+)$/.exec(a)
  if (m) params.set(m[1], m[2])
}

const browser = await chromium.launch(existsSync(LOCAL) ? { executablePath: LOCAL } : {})
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } })
page.setDefaultTimeout(180000) // 软件渲染下 4096 的阴影贴图 + 3000px 画布要一阵
page.on('pageerror', (e) => console.error('pageerror:', e.message))
await page.goto(`${URL}/debug/bake-temple.html?${params}`)
await page.waitForFunction(() => window.__bake)
const bake = await page.evaluate(() => window.__bake)
await browser.close()

const bytes = (dataUrl) => Buffer.from(dataUrl.split(',')[1], 'base64')
const full = bytes(bake.full)
const mask = bytes(bake.mask)

console.log('crop', bake.debug.crop, 'aspect', bake.meta.aspect, 'door', bake.meta.door)
console.log(`full ${(full.length / 1024).toFixed(0)}KB  mask ${(mask.length / 1024).toFixed(0)}KB`)
if (bake.debug.touchesEdge) {
  console.error('✗ 建筑碰到画布边缘了，会被裁掉一截——拉远机位或加宽画布')
  process.exit(1)
}

const out = previewDir
  ? { full: `${previewDir}/temple.webp`, mask: `${previewDir}/temple-mask.png`, meta: `${previewDir}/temple.json` }
  : {
      full: `${ROOT}/public/temple/phoenix-hall.webp`,
      mask: `${ROOT}/public/temple/phoenix-hall-eaves.png`,
      meta: `${ROOT}/src/data/temple.json`,
    }
for (const f of Object.values(out)) mkdirSync(dirname(f), { recursive: true })
writeFileSync(out.full, full)
writeFileSync(out.mask, mask)
writeFileSync(out.meta, JSON.stringify(bake.meta, null, 2) + '\n')
console.log('baked →', Object.values(out).join(', '))
