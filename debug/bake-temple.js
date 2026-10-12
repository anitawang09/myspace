// 开发期工具：把鳳凰堂模型渲染成门外场景用的静态图。
// 不进生产 bundle（index.html 的模块图不引用它），由 scripts/bake-temple.mjs 驱动。
//
// 产出三样东西（同一机位、同一裁切）：
//   full  —— 整栋建筑，透明底，给观众看的那张
//   mask  —— 只留各层屋顶，给 scanProfile 扫"檐口下沿"用；整栋建筑最靠下的
//            不透明像素是石台，不是檐口，字帘不能挂在地上
//   meta  —— 宽高比、中央开间（拉门的位置）的归一化矩形、石台下沿（倒影对称轴）
//
// 机位与光照都能用 query 调，方便迭代构图：?w=&h=&fov=&cy=&cz=&ty=
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { createPhoenixHallModel } from '../src/three/phoenixHall.js'

const q = new URLSearchParams(location.search)
const num = (k, d) => (q.has(k) ? Number(q.get(k)) : d)

const W = num('w', 3000)
const H = num('h', 1500)

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
renderer.setPixelRatio(1)
renderer.setSize(W, H)
renderer.setClearColor(0x000000, 0)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = num('exp', 1.0)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
// 金饰几乎是纯金属，没有环境可反射就是一团黑
const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
// 环境光与天光都要收着：开大了会把檐下的投影整个洗掉，建筑就成了剪贴画
scene.environmentIntensity = num('env', 0.18)

const model = createPhoenixHallModel()
scene.add(model)

// 光：门外是淡紫的暮色，主光偏暖、从左前上方来，天光补一层淡紫
scene.add(new THREE.HemisphereLight(0xe6dcf5, 0x4a3c38, num('hemi', 0.38)))
const sun = new THREE.DirectionalLight(new THREE.Color(q.get('sunc') || '#ffd2a3'), num('sun', 2.8))
// 太阳压低、从左前方斜照：檐口在立面上投下长影，建筑才有体积，不像剪贴画
sun.position.set(num('sx', -42), num('sy', 26), num('sz', 50))
sun.target.position.set(0, 4, 0)
sun.castShadow = true
sun.shadow.mapSize.set(4096, 4096)
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 160 })
sun.shadow.bias = -0.0004
sun.shadow.normalBias = 0.02
scene.add(sun, sun.target)
const fill = new THREE.DirectionalLight(0xc8c0ff, num('fill', 0.18))
fill.position.set(36, 14, 30)
scene.add(fill)

// 机位：正对立面（+Z 是正面），左右对称——门要落在画面正中，字帘才挂得匀
const camera = new THREE.PerspectiveCamera(num('fov', 20), W / H, 1, 600)
camera.position.set(0, num('cy', 11), num('cz', 92))
camera.lookAt(0, num('ty', 6.2), 0)

renderer.render(scene, camera)

// ── 裁切：按 full 图的不透明包围盒裁，留一点边
function alphaBBox(canvas) {
  const c = document.createElement('canvas')
  c.width = canvas.width
  c.height = canvas.height
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(canvas, 0, 0)
  const { data } = ctx.getImageData(0, 0, c.width, c.height)
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (data[(y * c.width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
    }
  }
  return { x0, y0, x1, y1 }
}

const box = alphaBBox(renderer.domElement)
const pad = Math.round(W * 0.006)
const crop = {
  x: Math.max(0, box.x0 - pad),
  y: Math.max(0, box.y0 - pad),
  w: Math.min(W, box.x1 + pad + 1) - Math.max(0, box.x0 - pad),
  h: Math.min(H, box.y1 + pad + 1) - Math.max(0, box.y0 - pad),
}
const touchesEdge = box.x0 <= 1 || box.y0 <= 1 || box.x1 >= W - 2 || box.y1 >= H - 2

function cropTo(canvas, outW, type, quality) {
  const outH = Math.round((crop.h / crop.w) * outW)
  const c = document.createElement('canvas')
  c.width = outW
  c.height = outH
  const ctx = c.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(canvas, crop.x, crop.y, crop.w, crop.h, 0, 0, outW, outH)
  return c.toDataURL(type, quality)
}

const outW = num('out', 2400)
const full = cropTo(renderer.domElement, outW, 'image/webp', 0.9)

// ── 中央开间：前排外檐柱 x=±2.4（半径 0.19）之间，台面 1.12 到檐柱联梁底 4.02，z=5.5
function project(x, y, z) {
  const v = new THREE.Vector3(x, y, z).project(camera)
  const px = ((v.x + 1) / 2) * W
  const py = ((1 - v.y) / 2) * H
  return [(px - crop.x) / crop.w, (py - crop.y) / crop.h]
}
const [dx0, dy1] = project(-2.21, 1.12, 5.5)
const [dx1, dy0] = project(2.21, 4.02, 5.5)

// ── mask：只留屋顶（和凤凰），同一机位重渲一次
const keep = /roof|phoenix/
// 扫描只认 alpha，统一换成纯白不打光的材质：PNG 压得极小，边缘也最干净
model.userData.parts.forEach((p) => (p.visible = keep.test(p.name)))
scene.overrideMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })
renderer.render(scene, camera)
const mask = cropTo(renderer.domElement, 800, 'image/png')
scene.overrideMaterial = null
model.userData.parts.forEach((p) => (p.visible = true))
renderer.render(scene, camera)

window.__bake = {
  full,
  mask,
  meta: {
    aspect: +(crop.w / crop.h).toFixed(4),
    door: { x0: +dx0.toFixed(4), y0: +dy0.toFixed(4), x1: +dx1.toFixed(4), y1: +dy1.toFixed(4) },
    // 石台最下沿（水面倒影的对称轴）；裁切留了边，不是图片底边
    base: +((box.y1 + 1 - crop.y) / crop.h).toFixed(4),
  },
  debug: { crop, box, touchesEdge, W, H },
}
