// 生成 5 张屋顶素材（SVG，透明底）。
// 关键约束：屋顶底缘（檐口下沿）必须是整张图里每一列最靠下的不透明像素，
// 这样运行时用 Canvas 扫描出的轮廓 Profile 就等于屋檐下沿，文字才能咬合着挂上去。
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../public/roofs')
mkdirSync(OUT, { recursive: true })

const n = (v) => Math.round(v * 100) / 100

// 单层檐：上为正脊，下为上翘的檐口曲线（中央最低，两端翘起）
function tierPath(t) {
  const { cx, topY, halfTop, halfBot, eaveY, tipLift } = t
  const tipY = eaveY - tipLift
  const slope = eaveY - topY
  const spread = halfBot - halfTop
  // 檐口曲线的控制点：让曲线中点正好落在 eaveY
  const dip = eaveY + tipLift / 3
  return [
    `M ${n(cx - halfBot)} ${n(tipY)}`,
    // 左坡：先微微下凹，再翻到正脊
    `C ${n(cx - halfBot + halfBot * 0.06)} ${n(tipY - slope * 0.16)}`,
    ` ${n(cx - halfTop - spread * 0.42)} ${n(topY + slope * 0.40)}`,
    ` ${n(cx - halfTop)} ${n(topY)}`,
    `L ${n(cx + halfTop)} ${n(topY)}`,
    `C ${n(cx + halfTop + spread * 0.42)} ${n(topY + slope * 0.40)}`,
    ` ${n(cx + halfBot - halfBot * 0.06)} ${n(tipY - slope * 0.16)}`,
    ` ${n(cx + halfBot)} ${n(tipY)}`,
    // 檐口下沿（= 轮廓 Profile 来源）
    `C ${n(cx + halfBot * 0.52)} ${n(dip)} ${n(cx - halfBot * 0.52)} ${n(dip)} ${n(cx - halfBot)} ${n(tipY)}`,
    'Z',
  ].join(' ')
}

// 檐口下沿往上 h 像素的一条带子（椽子/斗栱），不会改变外轮廓
function eaveBand(t, h) {
  const { cx, halfBot, eaveY, tipLift } = t
  const tipY = eaveY - tipLift
  const dip = eaveY + tipLift / 3
  return [
    `M ${n(cx - halfBot)} ${n(tipY)}`,
    `C ${n(cx - halfBot * 0.52)} ${n(dip)} ${n(cx + halfBot * 0.52)} ${n(dip)} ${n(cx + halfBot)} ${n(tipY)}`,
    `L ${n(cx + halfBot)} ${n(tipY - h)}`,
    `C ${n(cx + halfBot * 0.52)} ${n(dip - h)} ${n(cx - halfBot * 0.52)} ${n(dip - h)} ${n(cx - halfBot)} ${n(tipY - h)}`,
    'Z',
  ].join(' ')
}

function tiles(t, id) {
  const { cx, topY, halfBot, eaveY } = t
  const out = []
  const step = Math.max(16, halfBot / 14)
  for (let x = cx - halfBot; x <= cx + halfBot; x += step) {
    const k = (x - cx) / halfBot
    out.push(
      `<path d="M ${n(x)} ${n(topY - 6)} Q ${n(x + k * 26)} ${n((topY + eaveY) / 2)} ${n(x + k * 52)} ${n(eaveY + 30)}" />`,
    )
  }
  return `<g clip-path="url(#clip-${id})" class="tile-line">${out.join('')}</g>`
}

// 擬宝珠（ぎぼし）：正脊上的金饰。小尺寸下比写实鸱吻更干净
function ornament(x, y, s, gold) {
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${n(s)})" fill="${gold}">
    <path d="M-11 0 L11 0 L9 -7 L-9 -7 Z"/>
    <ellipse cx="0" cy="-15" rx="8.5" ry="9.5"/>
    <path d="M0 -33 C 4.5 -28 6 -24 5 -20 L -5 -20 C -6 -24 -4.5 -28 0 -33 Z"/>
  </g>`
}

const ROOFS = [
  {
    id: 'gate',
    w: 1400, h: 760,
    tiers: [
      { cx: 700, topY: 120, halfTop: 205, halfBot: 430, eaveY: 360, tipLift: 46 },
      { cx: 700, topY: 372, halfTop: 330, halfBot: 640, eaveY: 640, tipLift: 62 },
    ],
    gable: { cx: 700, y: 128, w: 250, h: 190 },
    orn: [[700, 118, 1.5], [500, 132, 1.15], [900, 132, 1.15]],
    c: { tile: '#8d95ae', tileDark: '#5d6580', wood: '#8f3230', woodDark: '#5f1f1e', gold: '#c99a3f', wall: '#e8e2d4' },
  },
  {
    id: 'karahafu',
    w: 1400, h: 700,
    tiers: [{ cx: 700, topY: 190, halfTop: 300, halfBot: 610, eaveY: 585, tipLift: 88 }],
    karahafu: { cx: 700, y: 196, w: 300, h: 165 },
    orn: [[700, 186, 1.35]],
    c: { tile: '#7f8aa6', tileDark: '#525c78', wood: '#7d3a2c', woodDark: '#4d2019', gold: '#cfa64a', wall: '#efe9dc' },
  },
  {
    id: 'pagoda',
    w: 1400, h: 820,
    tiers: [
      { cx: 700, topY: 150, halfTop: 130, halfBot: 300, eaveY: 320, tipLift: 40 },
      { cx: 700, topY: 330, halfTop: 235, halfBot: 460, eaveY: 520, tipLift: 54 },
      { cx: 700, topY: 530, halfTop: 350, halfBot: 655, eaveY: 730, tipLift: 74 },
    ],
    sorin: { cx: 700, y: 148, h: 120 },
    c: { tile: '#6f7c96', tileDark: '#48526b', wood: '#9a3b2f', woodDark: '#63211a', gold: '#d0a busy', wall: '#e6dfd0' },
  },
  {
    id: 'hiroen',
    w: 1400, h: 620,
    tiers: [{ cx: 700, topY: 165, halfTop: 430, halfBot: 665, eaveY: 500, tipLift: 52 }],
    orn: [[700, 160, 1.2], [430, 168, 0.95], [970, 168, 0.95]],
    c: { tile: '#87826f', tileDark: '#57543f', wood: '#6f4a2a', woodDark: '#43290f', gold: '#c6a55c', wall: '#f0ead9' },
  },
  {
    id: 'chidori',
    w: 1400, h: 780,
    tiers: [
      { cx: 700, topY: 175, halfTop: 175, halfBot: 355, eaveY: 375, tipLift: 42 },
      { cx: 700, topY: 400, halfTop: 360, halfBot: 660, eaveY: 668, tipLift: 70 },
    ],
    gable: { cx: 700, y: 405, w: 215, h: 165 },
    orn: [[700, 170, 1.3]],
    c: { tile: '#6e7a8c', tileDark: '#464f5e', wood: '#8a4436', woodDark: '#552319', gold: '#c8a04a', wall: '#ece5d6' },
  },
]

for (const r of ROOFS) {
  const c = { ...r.c, gold: r.c.gold.includes(' ') ? '#c9a24a' : r.c.gold }
  const clips = r.tiers
    .map((t, i) => `<clipPath id="clip-${r.id}-${i}"><path d="${tierPath(t)}"/></clipPath>`)
    .join('')

  const body = r.tiers
    .map((t, i) => {
      const id = `${r.id}-${i}`
      return `<g>
        <path d="${tierPath(t)}" fill="url(#tileGrad-${r.id})"/>
        ${tiles(t, id)}
        <path d="${tierPath(t)}" fill="none" stroke="${c.woodDark}" stroke-width="3" stroke-opacity="0.55"/>
        <path d="${eaveBand(t, 26)}" fill="${c.wood}"/>
        <path d="${eaveBand(t, 9)}" fill="${c.woodDark}" fill-opacity="0.85"/>
        <path d="M ${n(t.cx - t.halfTop - 8)} ${n(t.topY - 10)} L ${n(t.cx + t.halfTop + 8)} ${n(t.topY - 10)}
                 L ${n(t.cx + t.halfTop + 8)} ${n(t.topY + 8)} L ${n(t.cx - t.halfTop - 8)} ${n(t.topY + 8)} Z"
              fill="${c.wood}"/>
      </g>`
    })
    .join('')

  // 层间壁：上层檐口与下层正脊之间补一段墙身，楼门才不会显得是两片浮着的顶。
  // 它整体位于下层轮廓之上，不会改变檐口下沿。
  let walls = ''
  for (let i = 0; i < r.tiers.length - 1; i++) {
    const up = r.tiers[i]
    const lo = r.tiers[i + 1]
    const y0 = up.eaveY - 6
    const y1 = lo.topY + 10
    if (y1 - y0 < 8) continue
    const hw = Math.min(up.halfBot * 0.82, lo.halfTop * 0.94)
    walls += `<g>
      <rect x="${n(up.cx - hw)}" y="${n(y0)}" width="${n(hw * 2)}" height="${n(y1 - y0)}" fill="${c.wall}"/>
      ${[-1, -0.34, 0.34, 1]
        .map((k) => `<rect x="${n(up.cx + k * hw - 7)}" y="${n(y0)}" width="14" height="${n(y1 - y0)}" fill="${c.wood}"/>`)
        .join('')}
      <rect x="${n(up.cx - hw)}" y="${n(y0)}" width="${n(hw * 2)}" height="9" fill="${c.woodDark}" fill-opacity=".7"/>
    </g>`
  }

  // 破风 / 唐破风 / 相轮 —— 只影响上轮廓，不动檐口下沿
  let extra = ''
  if (r.gable) {
    const g = r.gable
    extra += `<g>
      <path d="M ${n(g.cx)} ${n(g.y)} L ${n(g.cx + g.w)} ${n(g.y + g.h)} L ${n(g.cx - g.w)} ${n(g.y + g.h)} Z" fill="${c.wall}"/>
      <path d="M ${n(g.cx)} ${n(g.y - 12)} L ${n(g.cx + g.w + 18)} ${n(g.y + g.h)} L ${n(g.cx + g.w - 16)} ${n(g.y + g.h)}
               L ${n(g.cx)} ${n(g.y + 26)} L ${n(g.cx - g.w + 16)} ${n(g.y + g.h)} L ${n(g.cx - g.w - 18)} ${n(g.y + g.h)} Z"
            fill="${c.wood}"/>
      <circle cx="${n(g.cx)}" cy="${n(g.y + g.h * 0.52)}" r="16" fill="${c.gold}"/>
    </g>`
  }
  if (r.karahafu) {
    const g = r.karahafu
    extra += `<g>
      <path d="M ${n(g.cx - g.w)} ${n(g.y + g.h)}
               C ${n(g.cx - g.w * 0.55)} ${n(g.y + g.h)} ${n(g.cx - g.w * 0.42)} ${n(g.y)} ${n(g.cx)} ${n(g.y)}
               C ${n(g.cx + g.w * 0.42)} ${n(g.y)} ${n(g.cx + g.w * 0.55)} ${n(g.y + g.h)} ${n(g.cx + g.w)} ${n(g.y + g.h)}
               Z" fill="${c.wall}"/>
      <path d="M ${n(g.cx - g.w - 14)} ${n(g.y + g.h)}
               C ${n(g.cx - g.w * 0.55)} ${n(g.y + g.h)} ${n(g.cx - g.w * 0.42)} ${n(g.y - 14)} ${n(g.cx)} ${n(g.y - 14)}
               C ${n(g.cx + g.w * 0.42)} ${n(g.y - 14)} ${n(g.cx + g.w * 0.55)} ${n(g.y + g.h)} ${n(g.cx + g.w + 14)} ${n(g.y + g.h)}
               L ${n(g.cx + g.w)} ${n(g.y + g.h)}
               C ${n(g.cx + g.w * 0.55)} ${n(g.y + g.h)} ${n(g.cx + g.w * 0.42)} ${n(g.y)} ${n(g.cx)} ${n(g.y)}
               C ${n(g.cx - g.w * 0.42)} ${n(g.y)} ${n(g.cx - g.w * 0.55)} ${n(g.y + g.h)} ${n(g.cx - g.w)} ${n(g.y + g.h)} Z"
            fill="${c.wood}"/>
      <circle cx="${n(g.cx)}" cy="${n(g.y + g.h * 0.55)}" r="18" fill="${c.gold}"/>
    </g>`
  }
  if (r.sorin) {
    const s = r.sorin
    extra += `<g fill="${c.gold}">
      <rect x="${n(s.cx - 4)}" y="${n(s.y - s.h)}" width="8" height="${n(s.h)}"/>
      ${[0, 1, 2, 3, 4].map((i) => `<rect x="${n(s.cx - 22 + i * 2)}" y="${n(s.y - s.h + 24 + i * 14)}" width="${n(44 - i * 4)}" height="5" rx="2"/>`).join('')}
      <circle cx="${n(s.cx)}" cy="${n(s.y - s.h - 10)}" r="11"/>
    </g>`
  }
  const orns = (r.orn || []).map(([x, y, s]) => ornament(x, y, s, c.gold)).join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r.w} ${r.h}" width="${r.w}" height="${r.h}">
  <defs>
    ${clips}
    <linearGradient id="tileGrad-${r.id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c.tile}"/>
      <stop offset="1" stop-color="${c.tileDark}"/>
    </linearGradient>
    <style>.tile-line{fill:none;stroke:${c.tileDark};stroke-width:5;stroke-opacity:.55}</style>
  </defs>
  ${walls}
  ${body}
  ${extra}
  ${orns}
</svg>`
  writeFileSync(`${OUT}/${r.id}.svg`, svg)
  console.log('wrote', `${r.id}.svg`, svg.length, 'bytes')
}
