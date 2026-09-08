import * as THREE from 'three'
import * as T from './textures.js'

/** 圆角矩形拉伸体 —— 卡片、机身这些工业产品没有直角 */
export function roundedBox(w, h, d, r = 0.006, mat) {
  const s = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: d,
    bevelEnabled: true,
    bevelSize: Math.min(0.0035, d * 0.2),
    bevelThickness: Math.min(0.0035, d * 0.2),
    bevelSegments: 3,
    curveSegments: 10,
  })
  geo.translate(0, 0, -d / 2)
  geo.computeVertexNormals()
  return new THREE.Mesh(geo, mat)
}

/** 只为拾取存在的透明包围盒：薄片物体从掠射角很难点中 */
export function hitBox(w, h, d) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  )
  m.renderOrder = -1
  return m
}

export function makeMaterials() {
  const wood = new THREE.MeshStandardMaterial({
    map: T.makeTexture(512, 512, T.wood, { repeat: [2, 2] }),
    roughness: 0.58,
    metalness: 0.04,
  })
  return {
    wood,
    darkWood: new THREE.MeshStandardMaterial({ color: '#2a1d13', roughness: 0.62 }),
    tatami: new THREE.MeshStandardMaterial({
      map: T.makeTexture(512, 256, T.tatami, { repeat: [3, 3] }),
      roughness: 0.96,
    }),
    plaster: new THREE.MeshStandardMaterial({
      map: T.makeTexture(256, 256, T.plaster, { repeat: [2, 1] }),
      roughness: 1,
    }),
    shoji: new THREE.MeshStandardMaterial({
      map: T.makeTexture(1024, 640, T.shoji),
      roughness: 0.88,
      emissiveMap: T.makeTexture(1024, 640, T.shoji),
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0.55,
    }),
    metal: new THREE.MeshStandardMaterial({
      map: T.makeTexture(512, 256, T.cameraBody),
      metalness: 0.68,
      roughness: 0.44,
    }),
    blackMetal: new THREE.MeshStandardMaterial({ color: '#17181b', metalness: 0.75, roughness: 0.42 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: '#0b1020',
      metalness: 0.3,
      roughness: 0.04,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      emissive: new THREE.Color('#2a4bff'),
      emissiveIntensity: 0.14,
    }),
    paper: new THREE.MeshStandardMaterial({ color: '#f4ecd8', roughness: 0.94 }),
  }
}

/** 文机：席地而坐的高度 */
export function createDesk(mat, topY = 0.34) {
  const g = new THREE.Group()
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.05, 0.54), mat.wood)
  top.position.y = topY
  top.castShadow = true
  top.receiveShadow = true
  g.add(top)
  const legGeo = new THREE.BoxGeometry(0.07, topY - 0.025, 0.07)
  for (const x of [-0.47, 0.47]) {
    for (const z of [-0.18, 0.18]) {
      const leg = new THREE.Mesh(legGeo, mat.wood)
      leg.position.set(x, (topY - 0.025) / 2, z)
      leg.castShadow = true
      g.add(leg)
    }
  }
  const apron = new THREE.BoxGeometry(0.96, 0.07, 0.04)
  for (const z of [-0.2, 0.2]) {
    const a = new THREE.Mesh(apron, mat.wood)
    a.position.set(0, topY - 0.1, z)
    g.add(a)
  }
  return g
}

/** 行灯：木框 + 纸罩 + 内置暖光 */
export function createLamp(mat) {
  const g = new THREE.Group()
  const paper = new THREE.MeshStandardMaterial({
    color: '#f7e6bd',
    roughness: 0.9,
    transparent: true,
    opacity: 0.72,
    emissive: new THREE.Color('#ffcf8a'),
    emissiveIntensity: 0.55,
    side: THREE.DoubleSide,
  })
  const shade = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.24), paper)
  shade.position.y = 0.2
  g.add(shade)
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.28), mat.darkWood))
  const postGeo = new THREE.BoxGeometry(0.018, 0.32, 0.018)
  for (const px of [-0.115, 0.115]) {
    for (const pz of [-0.115, 0.115]) {
      const post = new THREE.Mesh(postGeo, mat.darkWood)
      post.position.set(px, 0.2, pz)
      g.add(post)
    }
  }
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.022, 0.28), mat.darkWood)
  cap.position.y = 0.36
  g.add(cap)
  const light = new THREE.PointLight('#ffb765', 1.55, 3.4, 2)
  light.position.y = 0.2
  g.add(light)
  g.userData.light = light
  return g
}

/** 桌上那张纸 —— 点它进履历 */
export function createResumeSheet() {
  const g = new THREE.Group()
  const w = 0.21
  const h = 0.297
  const sheet = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({
      map: T.makeTexture(512, 724, T.resumePaper),
      roughness: 0.93,
      side: THREE.DoubleSide,
    }),
  )
  sheet.rotation.x = -Math.PI / 2
  sheet.position.y = 0.0016
  g.add(sheet)
  // 底下垫两张，纸才有厚度
  for (let i = 1; i <= 2; i++) {
    const under = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ color: '#e9e0cc', roughness: 0.95 }),
    )
    under.rotation.x = -Math.PI / 2
    under.position.set(0.002 * i, -0.0006 * i, 0.002 * i)
    under.rotation.z = 0.02 * i
    g.add(under)
  }
  g.add(hitBox(w * 1.18, 0.05, h * 1.12))
  return g
}

/** Olympus CCD 小相机：香槟银机身、黑镜筒、镀膜镜片、闪光灯 */
export function createOlympus(mat) {
  const g = new THREE.Group()
  const BW = 0.105
  const BH = 0.062
  const BD = 0.03

  const body = roundedBox(BW, BH, BD, 0.009, mat.metal)
  body.castShadow = true
  g.add(body)

  // 正面下缘的黑色饰条
  const strip = roundedBox(BW * 0.98, 0.012, BD * 0.6, 0.004, mat.blackMetal)
  strip.position.set(0, -BH / 2 + 0.011, BD * 0.22)
  g.add(strip)

  // 镜筒：两圈同心 + 镀膜镜片
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.02, 0.016, 32), mat.blackMetal)
  barrel.rotation.x = Math.PI / 2
  barrel.position.set(-0.012, -0.004, BD / 2 + 0.006)
  g.add(barrel)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0185, 0.0022, 8, 32), mat.metal)
  ring.position.copy(barrel.position)
  ring.position.z += 0.008
  g.add(ring)
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.0155, 32), mat.glass)
  lens.position.copy(barrel.position)
  lens.position.z += 0.0086
  g.add(lens)

  // 闪光灯 / 取景窗 / 自拍指示灯
  const flash = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.009, 0.004),
    new THREE.MeshStandardMaterial({
      color: '#fff6df',
      roughness: 0.25,
      emissive: new THREE.Color('#ffe9bd'),
      emissiveIntensity: 0.35,
    }),
  )
  flash.position.set(0.03, 0.017, BD / 2 + 0.001)
  g.add(flash)
  const finder = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.009, 0.004), mat.glass)
  finder.position.set(0.006, 0.019, BD / 2 + 0.001)
  g.add(finder)
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.0022, 10, 10),
    new THREE.MeshStandardMaterial({
      color: '#ff3b3b',
      emissive: new THREE.Color('#ff2a2a'),
      emissiveIntensity: 2.4,
    }),
  )
  led.position.set(0.045, 0.006, BD / 2 + 0.001)
  g.add(led)

  // 顶面：快门键 + 电源键
  const shutter = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.003, 16), mat.metal)
  shutter.position.set(0.032, BH / 2 + 0.0015, 0.002)
  g.add(shutter)
  const power = new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.002, 12), mat.blackMetal)
  power.position.set(0.015, BH / 2 + 0.001, 0.002)
  g.add(power)

  // 背带环
  const lug = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.004, 0.008), mat.blackMetal)
  lug.position.set(-BW / 2 - 0.002, BH / 2 - 0.008, 0)
  g.add(lug)

  g.add(hitBox(BW * 1.9, BH * 2.6, BD * 3.4))
  return g
}

/** OV-chipkaart + 登机牌：两件是同一个物体，一起点 */
export function createTravelSet() {
  const g = new THREE.Group()

  const pass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.19, 0.084),
    new THREE.MeshStandardMaterial({ map: T.makeTexture(760, 336, T.boardingPass), roughness: 0.9 }),
  )
  pass.rotation.x = -Math.PI / 2
  pass.rotation.z = -0.22
  pass.position.y = 0.0012
  pass.receiveShadow = true
  g.add(pass)

  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(0.0856, 0.054),
    new THREE.MeshStandardMaterial({
      map: T.makeTexture(684, 432, T.ovCard),
      roughness: 0.3,
      metalness: 0.12,
    }),
  )
  card.rotation.x = -Math.PI / 2
  card.rotation.z = 0.42
  card.position.set(0.052, 0.0028, 0.026)
  card.castShadow = true
  g.add(card)
  // 卡片厚度
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(0.0856, 0.0016, 0.054),
    new THREE.MeshStandardMaterial({ color: '#0b5c8e', roughness: 0.5 }),
  )
  edge.rotation.y = -0.42
  edge.position.set(0.052, 0.002, 0.026)
  g.add(edge)

  g.add(hitBox(0.3, 0.07, 0.2))
  return g
}

/** 违い棚：相机搁在上面 */
export function createShelf(mat) {
  const g = new THREE.Group()
  const plank = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.035, 0.26), mat.wood)
  plank.castShadow = true
  plank.receiveShadow = true
  g.add(plank)
  const bracket = new THREE.BoxGeometry(0.03, 0.16, 0.2)
  for (const x of [-0.4, 0.4]) {
    const b = new THREE.Mesh(bracket, mat.darkWood)
    b.position.set(x, -0.096, -0.02)
    g.add(b)
  }
  return g
}
