import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

const easeOutCubic = (t) => 1 - (1 - t) ** 3

/** 用离屏 canvas 画程序化贴图，省掉外部素材 */
function makeTexture(w, h, paint, repeat) {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  paint(cv.getContext('2d'), w, h)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(repeat[0], repeat[1])
  }
  tex.anisotropy = 8
  return tex
}

// 榻榻米：草席底色 + 细密织纹 + 深色布边
const tatami = (ctx, w, h) => {
  ctx.fillStyle = '#c9bf94'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(120,108,72,.32)'
  ctx.lineWidth = 1
  for (let y = 4; y < h; y += 5) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(90,80,52,.10)'
  for (let i = 0; i < 900; i++) {
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 1)
  }
  ctx.fillStyle = '#3f4a52'
  ctx.fillRect(0, 0, w, 9)
  ctx.fillRect(0, h - 9, w, 9)
}

// 障子：和纸底 + 木格
const shoji = (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#fbf4e4')
  g.addColorStop(1, '#efe4cd')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = 'rgba(120,90,58,.16)'
  for (let i = 0; i < 1400; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1)
  ctx.fillStyle = '#7b5636'
  const cols = 16
  const rows = 9
  const t = Math.max(3, w / 160)
  for (let i = 0; i <= cols; i++) ctx.fillRect((i * (w - t)) / cols, 0, t, h)
  for (let j = 0; j <= rows; j++) ctx.fillRect(0, (j * (h - t)) / rows, w, t)
  ctx.fillStyle = '#5f4026'
  ctx.fillRect(0, 0, w, t * 2.4)
  ctx.fillRect(0, h - t * 2.4, w, t * 2.4)
}

// 土壁
const plaster = (ctx, w, h) => {
  ctx.fillStyle = '#ddd2ba'
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 5000; i++) {
    ctx.fillStyle = `rgba(${150 + Math.random() * 40},${135 + Math.random() * 40},${105 + Math.random() * 40},.18)`
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2)
  }
}

// 木纹
const woodTex = (ctx, w, h) => {
  ctx.fillStyle = '#6d4a2e'
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 70; i++) {
    ctx.strokeStyle = `rgba(${40 + Math.random() * 40},${25 + Math.random() * 25},10,.28)`
    ctx.lineWidth = Math.random() * 2.4 + 0.4
    ctx.beginPath()
    const y = Math.random() * h
    ctx.moveTo(0, y)
    ctx.bezierCurveTo(w * 0.3, y + (Math.random() - 0.5) * 22, w * 0.7, y + (Math.random() - 0.5) * 22, w, y)
    ctx.stroke()
  }
}

export default function Room() {
  const mountRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#241d20')
    scene.fog = new THREE.Fog('#2b2226', 7, 16)

    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 60)
    // 竖屏的水平视野窄得多，机位不后撤书桌两头会被切掉
    const CAM_FROM = new THREE.Vector3(0, 1.62, 5.6)
    const CAM_TO = new THREE.Vector3(0, 1.12, 2.85)
    const fitCamera = () => {
      const aspect = camera.aspect
      const portrait = aspect < 1
      CAM_TO.set(0, portrait ? 1.2 : 1.12, portrait ? 2.85 + (1 - aspect) * 2.6 : 2.85)
      CAM_FROM.set(0, 1.62, CAM_TO.z + 2.75)
    }
    fitCamera()
    camera.position.copy(CAM_FROM)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.08
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    const disposables = []
    const track = (o) => {
      disposables.push(o)
      return o
    }

    const W = 6
    const H = 3.1
    const D = 6

    const matFloor = track(
      new THREE.MeshStandardMaterial({ map: makeTexture(512, 256, tatami, [3, 3]), roughness: 0.95 }),
    )
    const matWall = track(
      new THREE.MeshStandardMaterial({ map: makeTexture(256, 256, plaster, [2, 1]), roughness: 1 }),
    )
    const matShoji = track(
      new THREE.MeshStandardMaterial({
        map: makeTexture(512, 512, shoji),
        roughness: 0.9,
        emissive: new THREE.Color('#f0d9a8'),
        emissiveIntensity: 0.3,
      }),
    )
    const matWood = track(
      new THREE.MeshStandardMaterial({ map: makeTexture(256, 256, woodTex, [2, 2]), roughness: 0.62 }),
    )
    const matDark = track(new THREE.MeshStandardMaterial({ color: '#3b2a1c', roughness: 0.7 }))

    const plane = (w, h) => track(new THREE.PlaneGeometry(w, h))
    const addMesh = (geo, mat, pos, rot) => {
      const m = new THREE.Mesh(geo, mat)
      if (pos) m.position.set(...pos)
      if (rot) m.rotation.set(...rot)
      m.castShadow = true
      m.receiveShadow = true
      scene.add(m)
      return m
    }

    // 房间：地板 / 天井 / 三面墙（正面为障子，透进外光）
    addMesh(plane(W, D), matFloor, [0, 0, 0], [-Math.PI / 2, 0, 0]).castShadow = false
    addMesh(plane(W, D), matDark, [0, H, 0], [Math.PI / 2, 0, 0])
    addMesh(plane(W, H), matShoji, [0, H / 2, -D / 2], [0, 0, 0])
    addMesh(plane(D, H), matWall, [-W / 2, H / 2, 0], [0, Math.PI / 2, 0])
    addMesh(plane(D, H), matWall, [W / 2, H / 2, 0], [0, -Math.PI / 2, 0])

    // 柱与长押
    const pillar = track(new THREE.BoxGeometry(0.16, H, 0.16))
    for (const x of [-W / 2 + 0.09, W / 2 - 0.09]) {
      for (const z of [-D / 2 + 0.09, D / 2 - 0.09]) addMesh(pillar, matWood, [x, H / 2, z])
    }
    addMesh(track(new THREE.BoxGeometry(W, 0.12, 0.1)), matWood, [0, H - 0.9, -D / 2 + 0.06])

    // 文机（书桌）
    const desk = new THREE.Group()
    const TOP_Y = 0.34
    const top = new THREE.Mesh(track(new THREE.BoxGeometry(1.16, 0.05, 0.54)), matWood)
    top.position.y = TOP_Y
    top.castShadow = true
    top.receiveShadow = true
    desk.add(top)
    const legGeo = track(new THREE.BoxGeometry(0.07, TOP_Y - 0.025, 0.07))
    for (const x of [-0.47, 0.47]) {
      for (const z of [-0.18, 0.18]) {
        const leg = new THREE.Mesh(legGeo, matWood)
        leg.position.set(x, (TOP_Y - 0.025) / 2, z)
        leg.castShadow = true
        desk.add(leg)
      }
    }
    const apronGeo = track(new THREE.BoxGeometry(0.96, 0.07, 0.04))
    for (const z of [-0.2, 0.2]) {
      const a = new THREE.Mesh(apronGeo, matWood)
      a.position.set(0, TOP_Y - 0.1, z)
      desk.add(a)
    }
    desk.position.set(0, 0, -0.5)
    scene.add(desk)

    // 桌上：摊开的书、砚、笔、行灯
    const paperMat = track(new THREE.MeshStandardMaterial({ color: '#f4ecd8', roughness: 0.95 }))
    const bookGeo = track(new THREE.BoxGeometry(0.26, 0.012, 0.34))
    for (const [x, tilt] of [[-0.15, 0.06], [0.15, -0.06]]) {
      const page = new THREE.Mesh(bookGeo, paperMat)
      page.position.set(x, TOP_Y + 0.035, 0.0)
      page.rotation.z = tilt
      page.castShadow = true
      desk.add(page)
    }
    const spine = new THREE.Mesh(track(new THREE.BoxGeometry(0.045, 0.03, 0.34)), matDark)
    spine.position.set(0, TOP_Y + 0.04, 0.0)
    desk.add(spine)

    const inkstone = new THREE.Mesh(track(new THREE.BoxGeometry(0.2, 0.035, 0.14)), track(
      new THREE.MeshStandardMaterial({ color: '#22201f', roughness: 0.35 }),
    ))
    inkstone.position.set(-0.42, TOP_Y + 0.043, -0.08)
    inkstone.castShadow = true
    desk.add(inkstone)

    const brush = new THREE.Group()
    const shaft = new THREE.Mesh(track(new THREE.CylinderGeometry(0.011, 0.011, 0.26, 12)), track(
      new THREE.MeshStandardMaterial({ color: '#b98c4e', roughness: 0.55 }),
    ))
    shaft.rotation.z = Math.PI / 2
    brush.add(shaft)
    const tip = new THREE.Mesh(track(new THREE.ConeGeometry(0.014, 0.08, 12)), matDark)
    tip.rotation.z = -Math.PI / 2
    tip.position.x = 0.17
    brush.add(tip)
    brush.position.set(-0.26, TOP_Y + 0.037, 0.15)
    brush.rotation.y = 0.22
    desk.add(brush)

    // 行灯：纸罩 + 内置暖光
    const lampPaper = track(
      new THREE.MeshStandardMaterial({
        color: '#f7e6bd',
        roughness: 0.9,
        transparent: true,
        opacity: 0.72,
        emissive: new THREE.Color('#ffcf8a'),
        emissiveIntensity: 0.95,
        side: THREE.DoubleSide,
      }),
    )
    const lamp = new THREE.Group()
    const shade = new THREE.Mesh(track(new THREE.BoxGeometry(0.24, 0.3, 0.24)), lampPaper)
    shade.position.y = 0.2
    lamp.add(shade)
    const lampBase = new THREE.Mesh(track(new THREE.BoxGeometry(0.28, 0.03, 0.28)), matDark)
    lamp.add(lampBase)
    const lampPostGeo = track(new THREE.BoxGeometry(0.018, 0.32, 0.018))
    for (const px of [-0.115, 0.115]) {
      for (const pz of [-0.115, 0.115]) {
        const post = new THREE.Mesh(lampPostGeo, matDark)
        post.position.set(px, 0.2, pz)
        lamp.add(post)
      }
    }
    const lampCap = new THREE.Mesh(track(new THREE.BoxGeometry(0.28, 0.022, 0.28)), matDark)
    lampCap.position.y = 0.36
    lamp.add(lampCap)
    const lampLight = new THREE.PointLight('#ffb765', 3.2, 5.4, 2)
    lampLight.position.y = 0.2
    lamp.add(lampLight)
    lamp.position.set(0.42, TOP_Y + 0.025, -0.04)
    desk.add(lamp)

    // 座布団
    const cushion = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.62, 0.09, 0.62)),
      track(new THREE.MeshStandardMaterial({ color: '#3d4a6b', roughness: 0.95 })),
    )
    cushion.position.set(0, 0.045, 0.34)
    cushion.receiveShadow = true
    cushion.castShadow = true
    scene.add(cushion)

    // 掛軸：挂在左侧土壁上，深色裱边 + 浅色本纸
    const scrollMount = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.56, 1.7)),
      track(new THREE.MeshStandardMaterial({ color: '#4a3b30', roughness: 0.95 })),
    )
    scrollMount.position.set(-W / 2 + 0.03, 1.55, -0.9)
    scrollMount.rotation.y = Math.PI / 2
    scene.add(scrollMount)
    const scroll = new THREE.Mesh(track(new THREE.PlaneGeometry(0.42, 1.16)), paperMat)
    scroll.position.set(-W / 2 + 0.04, 1.58, -0.9)
    scroll.rotation.y = Math.PI / 2
    scene.add(scroll)

    // 灯光：障子外的天光 + 环境光 + 行灯
    scene.add(new THREE.AmbientLight('#ffe8d0', 0.34))
    scene.add(new THREE.HemisphereLight('#cfd6e6', '#2a2018', 0.4))
    const sun = new THREE.DirectionalLight('#e8ddc8', 0.72)
    sun.position.set(-1.6, 3.4, -4.2)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.near = 0.5
    sun.shadow.camera.far = 14
    scene.add(sun)

    // 浮尘
    const dustGeo = track(new THREE.BufferGeometry())
    const N = 260
    const pos = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * W
      pos[i * 3 + 1] = Math.random() * H
      pos[i * 3 + 2] = (Math.random() - 0.5) * D
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const dust = new THREE.Points(
      dustGeo,
      track(new THREE.PointsMaterial({ color: '#ffd9a0', size: 0.016, transparent: true, opacity: 0.5 })),
    )
    scene.add(dust)

    // 交互：鼠标视差
    const pointer = { x: 0, y: 0 }
    const onMove = (e) => {
      pointer.x = (e.clientX / window.innerWidth - 0.5) * 2
      pointer.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('pointermove', onMove)

    const onResize = () => {
      if (!mount.clientWidth) return
      camera.aspect = mount.clientWidth / mount.clientHeight
      fitCamera()
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }
    window.addEventListener('resize', onResize)

    const LOOK = new THREE.Vector3(0, 0.4, -0.5)
    const start = performance.now()
    let raf = 0
    const tick = (now) => {
      raf = requestAnimationFrame(tick)
      const t = now - start
      // 推门而入：镜头从门口推到书桌前
      const k = easeOutCubic(Math.min(1, t / 2600))
      camera.position.lerpVectors(CAM_FROM, CAM_TO, k)
      camera.position.x += pointer.x * 0.28 * k
      camera.position.y += -pointer.y * 0.12 * k
      camera.lookAt(LOOK)

      const p = dust.geometry.attributes.position
      for (let i = 0; i < N; i++) {
        p.array[i * 3 + 1] += 0.0006 + Math.sin(t * 0.0004 + i) * 0.0004
        if (p.array[i * 3 + 1] > H) p.array[i * 3 + 1] = 0
      }
      p.needsUpdate = true
      lampLight.intensity = 3.2 + Math.sin(t * 0.006) * 0.24 // 灯焰微跳

      renderer.render(scene, camera)
      if (Math.floor(t / 500) !== Math.floor((t - 16) / 500)) samplePixels()
    }
    raf = requestAnimationFrame(tick)
    const readyTimer = setTimeout(() => setReady(true), 900)
    // 渲染后立刻采样一次亮度：WebGL 默认不保留绘制缓冲，
    // 在循环外读画布只会拿到全黑，截图脚本据此误判"渲染失败"
    let litRatio = 0
    const probe = new Uint8Array(4)
    const samplePixels = () => {
      const gl = renderer.getContext()
      const w = renderer.domElement.width
      const h = renderer.domElement.height
      // 在整幅画面上撒 24 个采样点。只读某个角落会被地板或阴影带偏，
      // 高分屏下同样的像素数覆盖的画面区域还会缩水。
      let bright = 0
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 4; j++) {
          const x = Math.floor((w * (i + 0.5)) / 6)
          const y = Math.floor((h * (j + 0.5)) / 4)
          gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, probe)
          if (probe[0] + probe[1] + probe[2] > 210) bright++
        }
      }
      litRatio = Math.round((bright / 24) * 100)
    }
    if (typeof window !== 'undefined') {
      window.__room = () => ({ objects: scene.children.length, lit: litRatio, ready: true })
    }

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(readyTimer)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('resize', onResize)
      for (const d of disposables) d.dispose?.()
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div className="room">
      <div className="room__canvas" ref={mountRef} />
      <div className={`room__caption${ready ? ' is-on' : ''}`}>
        <h2>書斎</h2>
        <p>
          しょさい ·<span className="only-mouse"> マウスで見まわす</span>
          <span className="only-touch"> 指でなぞる</span>
        </p>
      </div>
    </div>
  )
}
