import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { makeTexture } from './textures.js'

// 床の間のある座敷（Tokonoma_Tatami_Room.html 的模型，改写成可读的模块）。
// 房间自己的坐标：x 0→5.4，障子墙在 x=0；z 0→5.4，床の間那面墙在 z=0，
// 向 -z 凹进去 0.9。+x 与 +z 两侧敞开，镜头从那里看进来。
const W = 5.4
const D = 5.4
const H = 2.55
const FLOOR = 0.055 // 榻榻米面
const KAMOI = 1.95 // 鴨居：拉门上沿

// Room.jsx 摆放可点物件时要用：床の間的床板面、矮桌（桌旗面的高度在桌子的局部坐标里）
export const TOKONOMA = { x0: 1.68, x1: 3.42, depth: 0.9, top: 0.18 }
export const TABLE = { x: 2.45, z: 2.5, rotY: 0.5, runnerY: 0.378 }
export const TATAMI_TOP = FLOOR + 0.0025

// 固定种子：每次进屋，纹理和盆栽的枝叶都一样
const seeded = (seed) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296

const speckle = (rand, ctx, w, h, count, alpha, colors, size = 2) => {
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = alpha * rand()
    ctx.fillStyle = colors[(rand() * colors.length) | 0]
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * size, 1 + rand() * size)
  }
  ctx.globalAlpha = 1
}

const grain = (rand, base, dark, light, repeat = [1, 1]) =>
  makeTexture(
    128,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = base
      ctx.fillRect(0, 0, w, h)
      for (let i = 0; i < 70; i++) {
        ctx.strokeStyle = rand() > 0.5 ? dark : light
        ctx.globalAlpha = 0.1 + rand() * 0.22
        ctx.lineWidth = 0.6 + rand() * 1.6
        const x = rand() * w
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.bezierCurveTo(x + (rand() - 0.5) * 12, h * 0.3, x + (rand() - 0.5) * 12, h * 0.7, x + (rand() - 0.5) * 6, h)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    },
    { repeat },
  )

// 水墨远山：一条起伏的剪影，自带一个独立种子
function ridge(ctx, w, bottom, top, amp, color, seed) {
  let s = seed
  const rand = () => (s = (s * 16807) % 2147483647) / 2147483647
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(0, bottom)
  for (let x = 0; x <= w; x += 6) {
    ctx.lineTo(x, top - Math.abs(Math.sin(x * 0.012 + rand())) * amp * (0.5 + 0.5 * rand()))
  }
  ctx.lineTo(w, bottom)
  ctx.closePath()
  ctx.fill()
}

/** 掛軸：远山、雾带、一棵松、一方朱印 */
const scrollTexture = () =>
  makeTexture(256, 640, (ctx, w, h) => {
    ctx.fillStyle = '#d6cdb0'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#e9e4d4'
    ctx.fillRect(0, 0, w, 118)
    ctx.fillStyle = '#cfc6a6'
    ctx.fillRect(0, 118, w, 6)
    ctx.fillStyle = '#a89c78'
    ctx.fillRect(0, 124, w, 3)

    const x = 26
    const y = 150
    const pw = w - 52
    const ph = 372
    ctx.fillStyle = '#e8e3d2'
    ctx.fillRect(x - 6, y - 6, pw + 12, ph + 12)
    const paper = ctx.createLinearGradient(0, y, 0, y + ph)
    paper.addColorStop(0, '#efece0')
    paper.addColorStop(1, '#d9d6c6')
    ctx.fillStyle = paper
    ctx.fillRect(x, y, pw, ph)

    ctx.save()
    ctx.beginPath()
    ctx.rect(x, y, pw, ph)
    ctx.clip()
    ridge(ctx, w, y + ph, y + 170, 90, 'rgba(140,150,150,0.55)', 7)
    ridge(ctx, w, y + ph, y + 220, 80, 'rgba(95,105,105,0.7)', 11)
    ridge(ctx, w, y + ph, y + 285, 50, 'rgba(60,68,66,0.85)', 3)
    ctx.fillStyle = 'rgba(235,235,225,0.55)'
    ctx.fillRect(x, y + 230, pw, 26)
    ctx.strokeStyle = '#2d2f2b'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x + 40, y + ph)
    ctx.quadraticCurveTo(x + 55, y + 320, x + 90, y + 300)
    ctx.stroke()
    ctx.fillStyle = 'rgba(40,50,40,0.8)'
    for (let i = 0; i < 6; i++) {
      ctx.beginPath()
      ctx.ellipse(x + 70 + i * 9, y + 296 + (i % 3) * 8, 20, 6, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

    ctx.fillStyle = '#c4381f'
    ctx.fillRect(x + pw - 22, y + ph - 30, 12, 12)
    ctx.fillStyle = '#cfc6a6'
    ctx.fillRect(0, y + ph + 10, w, 80)
    ctx.fillStyle = '#a89c78'
    ctx.fillRect(0, y + ph + 6, w, 3)
    ctx.fillRect(0, h - 10, w, 3)
  })

/** 襖纸：下半截画着淡墨远山与几块石 */
const fusumaTexture = (rand, seed) =>
  makeTexture(256, 512, (ctx, w, h) => {
    ctx.fillStyle = '#efe9da'
    ctx.fillRect(0, 0, w, h)
    speckle(rand, ctx, w, h, 900, 0.1, ['#d5ccb4', '#fff9ea'])
    ctx.save()
    ctx.globalAlpha = 0.85
    ridge(ctx, w, h, h * 0.8, 38, 'rgba(165,170,165,0.45)', seed)
    ridge(ctx, w, h, h * 0.87, 30, 'rgba(120,125,120,0.5)', seed + 5)
    ctx.fillStyle = 'rgba(90,92,88,0.65)'
    for (let i = 0; i < 9; i++) {
      ctx.beginPath()
      ctx.ellipse(30 + rand() * (w - 60), h * 0.92 + rand() * 18, 14 + rand() * 12, 4, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  })

function makeMaterials(rand) {
  const std = (o) => new THREE.MeshStandardMaterial(o)
  const tatami = makeTexture(
    256,
    512,
    (ctx, w, h) => {
      ctx.fillStyle = '#c4bf96'
      ctx.fillRect(0, 0, w, h)
      for (let y = 0; y < h; y += 2) {
        ctx.fillStyle = (y / 2) % 2 ? 'rgba(120,115,80,0.16)' : 'rgba(235,230,190,0.18)'
        ctx.fillRect(0, y, w, 1)
      }
      ctx.lineWidth = 1
      for (let i = 0; i < 220; i++) {
        ctx.strokeStyle = rand() > 0.5 ? 'rgba(95,95,60,0.18)' : 'rgba(240,235,200,0.2)'
        const y = rand() * h
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y + (rand() - 0.5) * 3)
        ctx.stroke()
      }
      speckle(rand, ctx, w, h, 1800, 0.25, ['#8d8a62', '#e1ddb4', '#a9a57c'])
    },
    { repeat: [1, 1] },
  )
  const plaster = makeTexture(
    256,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = '#d9cdb2'
      ctx.fillRect(0, 0, w, h)
      speckle(rand, ctx, w, h, 2500, 0.18, ['#b8aa8c', '#efe5cc', '#a89a7c'])
    },
    { repeat: [1, 1] },
  )
  const ceiling = grain(rand, '#b89a72', '#6e5436', '#d8c19a', [3, 1])
  const post = grain(rand, '#b58f63', '#6e4c2c', '#d9bb90', [1, 3])
  const table = grain(rand, '#7b3a22', '#3d1608', '#a95a38', [2, 1])
  const dark = grain(rand, '#3a2c22', '#1a120c', '#5c4638')
  const cushion = makeTexture(
    128,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = '#a79f8d'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = 'rgba(255,255,255,0.05)'
      for (let x = 0; x < w; x += 3) {
        ctx.fillRect(x, 0, 1, h)
        ctx.fillRect(0, x, w, 1)
      }
      speckle(rand, ctx, w, h, 600, 0.25, ['#8c8574', '#c0b8a5'])
    },
    { repeat: [1, 1] },
  )
  const runner = makeTexture(
    128,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = '#8f8878'
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = 'rgba(0,0,0,0.05)'
      for (let x = 0; x < w; x += 2) ctx.fillRect(x, 0, 1, h)
      speckle(rand, ctx, w, h, 500, 0.2, ['#756f61', '#a9a291'])
    },
    { repeat: [1, 1] },
  )

  return {
    tatami: std({ map: tatami, roughness: 0.95 }),
    heri: std({ color: '#45463d', roughness: 0.85 }),
    plaster: std({ map: plaster, roughness: 1 }),
    ceiling: std({ map: ceiling, roughness: 0.8 }),
    post: std({ map: post, roughness: 0.6 }),
    table: std({ map: table, roughness: 0.42 }),
    dark: std({ map: dark, roughness: 0.5 }),
    lacquer: std({ color: '#14100e', roughness: 0.25, metalness: 0.1 }),
    paper: std({ color: '#f2ecde', emissive: '#ffeed0', emissiveIntensity: 0.22, roughness: 1 }),
    kumiko: std({ color: '#a97d4e', roughness: 0.6 }),
    cushion: std({ map: cushion, roughness: 1 }),
    runner: std({ map: runner, roughness: 1, side: THREE.DoubleSide }),
    ceramic: std({ color: '#d9d4c6', roughness: 0.35 }),
    leaf: std({ color: '#4f7d3c', roughness: 0.8, flatShading: true }),
    leafLight: std({ color: '#6e9a4a', roughness: 0.8, flatShading: true }),
    bark: std({ color: '#4d3425', roughness: 0.9 }),
    pot: std({ color: '#5b4332', roughness: 0.55 }),
    moss: std({ color: '#3f6a2c', roughness: 1, flatShading: true }),
    pink: std({ color: '#e0788f', roughness: 0.6 }),
    blossom: std({ color: '#f0cfd0', roughness: 0.6 }),
    orange: std({ color: '#e8934a', roughness: 0.6 }),
    stem: std({ color: '#5f7d3a', roughness: 0.8 }),
    gold: std({ color: '#b9964f', roughness: 0.4, metalness: 0.7 }),
    black: std({ color: '#111111', roughness: 0.3 }),
  }
}

function box(parent, mat, x, y, z, w, h, d) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  m.position.set(x, y, z)
  m.castShadow = true
  m.receiveShadow = true
  parent.add(m)
  return m
}

function mesh(parent, geometry, mat, x, y, z, castShadow = false) {
  const m = new THREE.Mesh(geometry, mat)
  m.position.set(x, y, z)
  m.castShadow = castShadow
  parent.add(m)
  return m
}

export function createTokonomaRoom() {
  const rand = seeded(20261012)
  const mat = makeMaterials(rand)
  const room = new THREE.Group()

  // ── 地面：底板 + 18 畳（半畳按半张算），每张带黑色畳縁
  box(room, mat.dark, W / 2, 0.02, D / 2, W + 0.1, 0.04, D + 0.1)
  const mats = new Map() // 按长度共用材质：贴图的重复次数随长度变
  const tatamiMat = (len) => {
    if (!mats.has(len)) {
      const m = mat.tatami.clone()
      m.map = mat.tatami.map.clone()
      m.map.repeat.set(1, len / 1.8)
      m.map.rotation = Math.PI / 2
      m.map.center.set(0.5, 0.5)
      mats.set(len, m)
    }
    return mats.get(len)
  }
  const tatami = (x, z, len) => {
    const g = new THREE.Group()
    g.position.set(x + len / 2, 0, z + 0.45)
    box(g, tatamiMat(len), 0, TATAMI_TOP - 0.015, 0, len - 0.006, 0.03, 0.894)
    for (const side of [-1, 1]) box(g, mat.heri, 0, TATAMI_TOP, side * 0.42, len - 0.006, 0.006, 0.05)
    room.add(g)
  }
  for (let row = 0; row < 6; row++) {
    const z = row * 0.9
    if (row % 2 === 0) {
      for (let i = 0; i < 3; i++) tatami(i * 1.8, z, 1.8)
    } else {
      tatami(0, z, 0.9)
      tatami(0.9, z, 1.8)
      tatami(2.7, z, 1.8)
      tatami(4.5, z, 0.9)
    }
  }

  // ── 天井
  box(room, mat.ceiling, W / 2, H + 0.02, D / 2, W, 0.04, D).castShadow = false

  // ── 障子：四扇，两条轨道交错。纸面不挡光，窗格投下格子影
  const panelW = 1.2
  const rail = 0.07
  const panelH = KAMOI - rail - 0.04
  const latticeW = panelW - 0.1
  const unit = new THREE.BoxGeometry(1, 1, 1)
  const bar = (y, z, sx, sy, sz) =>
    new THREE.Matrix4().compose(new THREE.Vector3(0.004, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz))
  for (let i = 0; i < 4; i++) {
    const panel = new THREE.Group()
    panel.position.set(i % 2 === 0 ? 0.03 : -0.01, 0, 0.42 + panelW * (i + 0.5))
    room.add(panel)

    const paper = mesh(panel, new THREE.PlaneGeometry(panelW, panelH), mat.paper, 0, rail + panelH / 2, 0)
    paper.rotation.y = Math.PI / 2
    box(panel, mat.kumiko, 0, rail + panelH - 0.03, 0, 0.045, 0.06, panelW)
    box(panel, mat.kumiko, 0, rail + 0.04, 0, 0.045, 0.08, panelW)
    for (const side of [-1, 1]) {
      box(panel, mat.kumiko, 0, rail + panelH / 2, side * (panelW / 2 - 0.025), 0.045, panelH, 0.05)
    }

    const bars = []
    for (let k = 1; k < 4; k++) {
      bars.push(bar(rail + panelH / 2, -latticeW / 2 + (latticeW * k) / 4, 0.02, panelH - 0.1, 0.014))
    }
    for (let k = 0; k < 8; k++) {
      bars.push(bar(rail + 0.62 + ((panelH - 0.72) * (k + 1)) / 9, 0, 0.02, 0.014, latticeW))
    }
    // 腰板的上下框与下段两根细横
    bars.push(bar(rail + 0.62, 0, 0.026, 0.05, latticeW), bar(rail + 0.28, 0, 0.026, 0.05, latticeW))
    for (let k = 0; k < 2; k++) bars.push(bar(rail + 0.1 + k * 0.09, 0, 0.02, 0.014, latticeW))
    const lattice = new THREE.InstancedMesh(unit, mat.kumiko, bars.length)
    bars.forEach((m, k) => lattice.setMatrixAt(k, m))
    lattice.castShadow = true
    lattice.receiveShadow = true
    panel.add(lattice)
  }
  box(room, mat.dark, 0.02, 0.03, D / 2 + 0.2, 0.09, 0.03, D - 0.2) // 敷居
  box(room, mat.post, 0.02, KAMOI + 0.05, D / 2 + 0.2, 0.12, 0.1, D - 0.2) // 鴨居
  // 障子上方的小壁与角柱
  box(room, mat.plaster, -0.03, KAMOI + (H - KAMOI) / 2 + 0.05, D / 2, 0.06, H - KAMOI - 0.05, D)
  box(room, mat.post, 0, H / 2, D - 0.07, 0.14, H, 0.14)

  // ── 正面墙：小壁、长押、柱
  const wallY = KAMOI + (H - KAMOI) / 2 + 0.05
  box(room, mat.plaster, 1, wallY, -0.04, 2, H - KAMOI - 0.05, 0.08)
  box(room, mat.plaster, 2.55, H - 0.25, -0.04, 1.8, 0.5, 0.08)
  box(room, mat.plaster, 4.5, wallY, -0.04, 2, H - KAMOI - 0.05, 0.08)
  box(room, mat.plaster, 0.81, 0.9, -0.1, 1.62, 1.8, 0.08)
  box(room, mat.plaster, 4.41, 0.9, -0.1, 1.98, 1.8, 0.08)
  box(room, mat.post, W / 2, KAMOI + 0.03, 0.02, W, 0.12, 0.1)
  box(room, mat.post, 2.5, KAMOI - 0.1, 0.05, 1.8, 0.04, 0.08)
  for (const [x, s] of [[0.07, 0.14], [1.62, 0.11], [3.52, 0.2], [5.33, 0.14]]) {
    box(room, mat.post, x, H / 2, 0.02, s, H, s)
  }

  // ── 襖：左右各一扇，漆框、引手、敷居
  const fusuma = (x0, x1, seed, handleAtStart) => {
    const w = x1 - x0
    const h = KAMOI - 0.1
    const cx = (x0 + x1) / 2
    const paper = new THREE.MeshStandardMaterial({ map: fusumaTexture(rand, seed), roughness: 0.95 })
    box(room, paper, cx, 0.06 + h / 2, 0.11, w, h, 0.03)
    box(room, mat.lacquer, x0 + 0.012, 0.06 + h / 2, 0.128, 0.024, h, 0.034)
    box(room, mat.lacquer, x1 - 0.012, 0.06 + h / 2, 0.128, 0.024, h, 0.034)
    box(room, mat.lacquer, cx, 0.065, 0.128, w, 0.022, 0.034)
    box(room, mat.lacquer, cx, KAMOI - 0.075, 0.128, w, 0.022, 0.034)
    const pull = mesh(
      room,
      new THREE.CylinderGeometry(0.03, 0.03, 0.006, 24),
      mat.black,
      handleAtStart ? x0 + 0.1 : x1 - 0.1,
      0.95,
      0.147,
    )
    pull.rotation.x = Math.PI / 2
    box(room, mat.dark, cx, 0.03, 0.12, w + 0.1, 0.03, 0.08)
  }
  fusuma(0.15, 1.56, 3, false)
  fusuma(3.63, 5.27, 9, true)

  // ── 床の間：三面土壁、床板、床框、落掛
  const { x0: tx0, x1: tx1, depth: td } = TOKONOMA
  const tcx = (tx0 + tx1) / 2
  const tw = tx1 - tx0
  const toko = 0.16
  box(room, mat.plaster, tcx, 1.1, -td - 0.02, tw, 2.1, 0.04)
  box(room, mat.plaster, tx0 + 0.02, 1.1, -td / 2, 0.04, 2.1, td)
  box(room, mat.plaster, tx1 - 0.02, 1.1, -td / 2, 0.04, 2.1, td)
  box(room, mat.dark, tcx, toko / 2 + 0.02, -td / 2, tw, toko, td)
  box(room, mat.lacquer, tcx, toko + 0.035, 0, tw + 0.04, 0.08, 0.07)
  box(room, mat.plaster, tcx, KAMOI + 0.12, -td / 2, tw, 0.05, td)
  box(room, mat.dark, tcx, KAMOI, -td / 2, tw, 0.04, td)

  // ── 掛軸
  const sw = 0.62
  const sh = 1.5
  const sy = 1.08
  const sz = -td + 0.02
  mesh(room, new THREE.PlaneGeometry(sw, sh), new THREE.MeshStandardMaterial({ map: scrollTexture(), roughness: 0.9 }), tcx, sy, -td + 0.01)
  for (const y of [sy + sh / 2 + 0.005, sy - sh / 2 - 0.005]) {
    mesh(room, new THREE.CylinderGeometry(0.014, 0.014, sw + 0.07, 10), mat.dark, tcx, y, sz, true).rotation.z = Math.PI / 2
    for (const side of [-1, 1]) {
      const cap = mesh(room, new THREE.CylinderGeometry(0.02, 0.02, 0.02, 10), mat.gold, tcx + side * (sw / 2 + 0.04), y, sz)
      cap.rotation.z = Math.PI / 2
    }
  }
  mesh(room, new THREE.CylinderGeometry(0.003, 0.003, 0.33, 6), mat.black, tcx, sy + sh / 2 + 0.17, sz)

  // ── 盆栽：台、盆、苔、虬干两枝、五团叶
  const bx = 3
  const bz = -0.4
  const by = toko + 0.012
  box(room, mat.lacquer, bx, by + 0.015, bz, 0.4, 0.03, 0.3)
  const pot = mesh(room, new THREE.CylinderGeometry(0.095, 0.075, 0.07, 20), mat.pot, bx, by + 0.065, bz, true)
  pot.scale.set(1.1, 1, 0.8)
  mesh(room, new THREE.CylinderGeometry(0.09, 0.09, 0.012, 14), mat.moss, bx, by + 0.1, bz).scale.set(1.1, 1, 0.8)
  const limb = (points, segments, radius, sides) => {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(bx + x, by + y, bz + z)))
    mesh(room, new THREE.TubeGeometry(curve, segments, radius, sides), mat.bark, 0, 0, 0, true)
  }
  limb([[0, 0.1, 0], [0.025, 0.2, 0.02], [-0.04, 0.28, 0], [-0.07, 0.36, -0.02], [0, 0.42, 0]], 24, 0.017, 8)
  limb([[0.02, 0.2, 0], [0.12, 0.24, 0.02], [0.2, 0.27, 0]], 14, 0.008, 6)
  limb([[-0.05, 0.3, 0], [-0.16, 0.34, 0.03], [-0.24, 0.33, 0.04]], 14, 0.008, 6)
  const foliage = (x, y, z, r, m) => {
    const geo = new THREE.IcosahedronGeometry(r, 1)
    const p = geo.attributes.position
    for (let i = 0; i < p.count; i++) {
      const k = 1 + (rand() - 0.5) * 0.28
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.62, p.getZ(i) * k)
    }
    geo.computeVertexNormals()
    mesh(room, geo, m, bx + x, by + y, bz + z, true)
  }
  foliage(0, 0.46, 0, 0.11, mat.leaf)
  foliage(0.2, 0.3, 0.02, 0.085, mat.leafLight)
  foliage(-0.23, 0.36, 0.04, 0.09, mat.leaf)
  foliage(-0.08, 0.38, -0.02, 0.08, mat.leafLight)
  foliage(0.1, 0.4, 0.05, 0.075, mat.leaf)

  // ── 矮桌：桌面、桌腿、横撑、桌旗、花器垫；花瓶与插花也在桌上
  const table = new THREE.Group()
  table.position.set(TABLE.x, FLOOR, TABLE.z)
  table.rotation.y = TABLE.rotY
  room.add(table)
  box(table, mat.table, 0, 0.345, 0, 1.1, 0.055, 0.72)
  box(table, mat.table, 0, 0.3, 0, 0.98, 0.04, 0.6)
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) box(table, mat.table, x * 0.46, 0.15, z * 0.27, 0.1, 0.3, 0.1)
    box(table, mat.table, x * 0.46, 0.27, 0, 0.06, 0.06, 0.44)
  }
  const runner = mesh(table, new THREE.PlaneGeometry(1.1, 0.3), mat.runner, 0, TABLE.runnerY, 0)
  runner.rotation.x = -Math.PI / 2
  runner.receiveShadow = true
  for (const side of [-1, 1]) {
    mesh(table, new THREE.PlaneGeometry(0.3, 0.14), mat.runner, side * 0.552, 0.31, 0).rotation.y = Math.PI / 2
  }
  box(table, mat.dark, -0.2, 0.381, 0, 0.2, 0.01, 0.2).rotation.y = 0.3

  const vaseProfile = [[0, 0], [0.05, 0], [0.075, 0.03], [0.085, 0.08], [0.07, 0.13], [0.04, 0.16], [0.035, 0.2], [0.05, 0.22]]
  mesh(table, new THREE.LatheGeometry(vaseProfile.map(([x, y]) => new THREE.Vector2(x, y)), 24), mat.ceramic, -0.2, 0.386, 0, true)
  const stemBase = new THREE.Vector3(-0.2, 0.6, 0)
  const flower = (dx, dy, dz, m, r) => {
    const head = new THREE.Vector3(-0.2 + dx, 0.6 + dy, dz)
    const dir = head.clone().sub(stemBase)
    const stem = mesh(table, new THREE.CylinderGeometry(0.004, 0.004, dir.length(), 5), mat.stem, 0, 0, 0)
    stem.position.copy(stemBase).add(head).multiplyScalar(0.5)
    stem.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
    mesh(table, new THREE.IcosahedronGeometry(r, 1), m, head.x, head.y, head.z, true).scale.set(1, 0.8, 1)
    mesh(table, new THREE.SphereGeometry(r * 0.35, 8, 6), mat.gold, head.x, head.y + r * 0.35, head.z)
  }
  flower(-0.05, 0.28, 0.02, mat.pink, 0.04)
  flower(0.1, 0.2, -0.04, mat.pink, 0.035)
  flower(0.02, 0.36, -0.03, mat.blossom, 0.03)
  flower(-0.14, 0.17, 0, mat.blossom, 0.03)
  flower(0.05, 0.14, 0.09, mat.orange, 0.026)
  flower(-0.09, 0.3, -0.07, mat.pink, 0.028)
  const leafGeo = new THREE.SphereGeometry(0.03, 8, 6)
  for (let i = 0; i < 5; i++) {
    const leaf = mesh(table, leafGeo, mat.leaf, -0.2 + (rand() - 0.5) * 0.18, 0.66 + rand() * 0.12, (rand() - 0.5) * 0.14)
    leaf.scale.set(1.6, 0.3, 0.8)
    leaf.rotation.set(rand() * 2, rand() * 3, rand())
  }

  // ── 座布団两枚：面上微微鼓起
  const zabuton = (x, z, rotY) => {
    const geo = new RoundedBoxGeometry(0.68, 0.09, 0.68, 4, 0.04)
    const p = geo.attributes.position
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) > 0) p.setY(i, p.getY(i) + 0.018 * Math.max(0, 1 - Math.hypot(p.getX(i), p.getZ(i)) / 0.4))
    }
    geo.computeVertexNormals()
    const c = mesh(room, geo, mat.cushion, x, FLOOR + 0.045, z, true)
    c.rotation.y = rotY
    c.receiveShadow = true
  }
  zabuton(1.2, 2.55, 0.35)
  zabuton(3.5, 3.2, 0.4)

  return { room, table }
}
