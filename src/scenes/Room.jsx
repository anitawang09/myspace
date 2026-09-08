import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import {
  makeMaterials,
  createDesk,
  createLamp,
  createResumeSheet,
  createOlympus,
  createTravelSet,
  createShelf,
} from '../three/props.js'
import { HOTSPOTS } from '../data/hotspots.js'

const easeOutCubic = (t) => 1 - (1 - t) ** 3

export default function Room({ onOpen }) {
  const mountRef = useRef(null)
  const labelRef = useRef(null)
  const openRef = useRef(onOpen)
  const [hover, setHover] = useState(null)
  const [ready, setReady] = useState(false)
  openRef.current = onOpen

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#14121a')
    scene.fog = new THREE.Fog('#1a1620', 7.5, 17)

    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 60)
    const CAM_FROM = new THREE.Vector3(0, 1.62, 5.6)
    const CAM_TO = new THREE.Vector3(0, 1.12, 2.85)
    const fitCamera = () => {
      // 竖屏水平视野窄得多，机位不后撤两侧的物件会被切掉
      const portrait = camera.aspect < 1
      CAM_TO.set(0, portrait ? 1.05 : 0.96, portrait ? 2.6 + (1 - camera.aspect) * 2.6 : 2.5)
      CAM_FROM.set(0, 1.62, CAM_TO.z + 2.75)
    }
    fitCamera()
    camera.position.copy(CAM_FROM)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.82
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    mount.appendChild(renderer.domElement)

    // IBL：金属与镜片没有环境可反射就是一块死色
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04)
    scene.environment = envRT.texture
    scene.environmentIntensity = 0.16

    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(mount.clientWidth, mount.clientHeight),
      0.34, // strength
      0.5, // radius
      0.9, // threshold：只让灯火与霓虹发光，纸和木头不糊
    )
    composer.addPass(bloom)
    composer.addPass(new OutputPass())

    const mat = makeMaterials()
    const disposables = Object.values(mat)
    const track = (o) => {
      disposables.push(o)
      return o
    }

    const W = 6
    const H = 3.1
    const D = 6
    const add = (mesh, pos, rot) => {
      if (pos) mesh.position.set(...pos)
      if (rot) mesh.rotation.set(...rot)
      scene.add(mesh)
      return mesh
    }

    // 房间：地板、天井、两侧土壁；正面左侧是壁龛，右侧是障子
    const floor = add(new THREE.Mesh(track(new THREE.PlaneGeometry(W, D)), mat.tatami), [0, 0, 0], [-Math.PI / 2, 0, 0])
    floor.receiveShadow = true
    add(new THREE.Mesh(track(new THREE.PlaneGeometry(W, D)), mat.darkWood), [0, H, 0], [Math.PI / 2, 0, 0])
    const SHOJI_W = 4.1
    add(new THREE.Mesh(track(new THREE.PlaneGeometry(SHOJI_W, H)), mat.shoji), [W / 2 - SHOJI_W / 2, H / 2, -D / 2])
    add(new THREE.Mesh(track(new THREE.PlaneGeometry(W - SHOJI_W, H)), mat.plaster), [-W / 2 + (W - SHOJI_W) / 2, H / 2, -D / 2 + 0.001])
    add(new THREE.Mesh(track(new THREE.PlaneGeometry(D, H)), mat.plaster), [-W / 2, H / 2, 0], [0, Math.PI / 2, 0])
    add(new THREE.Mesh(track(new THREE.PlaneGeometry(D, H)), mat.plaster), [W / 2, H / 2, 0], [0, -Math.PI / 2, 0])

    const pillar = track(new THREE.BoxGeometry(0.16, H, 0.16))
    // 两角各一根柱，再加一根落在壁龛与障子的交界上
    for (const x of [-W / 2 + 0.09, W / 2 - 0.09, -1.1]) {
      add(new THREE.Mesh(pillar, mat.wood), [x, H / 2, -D / 2 + 0.09])
    }
    add(new THREE.Mesh(track(new THREE.BoxGeometry(W, 0.12, 0.1)), mat.wood), [0, H - 0.9, -D / 2 + 0.06])

    // 家具
    const desk = add(createDesk(mat), [0, 0, -0.5])
    const lamp = createLamp(mat)
    lamp.position.set(0.42, 0.365, -0.54)
    scene.add(lamp)
    const cushion = add(
      new THREE.Mesh(
        track(new THREE.BoxGeometry(0.62, 0.09, 0.62)),
        track(new THREE.MeshStandardMaterial({ color: '#2b3552', roughness: 0.95 })),
      ),
      [0, 0.045, 0.34],
    )
    cushion.castShadow = true
    cushion.receiveShadow = true

    const shelf = add(createShelf(mat), [-1.72, 1.34, -D / 2 + 0.15])

    // ── 三个热点
    const hotspots = []
    const register = (group, id) => {
      group.traverse((o) => {
        o.userData.hotspot = id
      })
      group.userData.hotspot = id
      group.userData.baseY = group.position.y
      hotspots.push(group)
      scene.add(group)
      return group
    }

    const sheet = createResumeSheet()
    sheet.position.set(-0.14, 0.368, -0.46)
    sheet.scale.setScalar(1.2)
    sheet.rotation.y = 0.14
    register(sheet, 'resume')

    const olympus = createOlympus(mat)
    olympus.position.set(-1.72, 1.42, -D / 2 + 0.17)
    olympus.rotation.y = 0.46
    olympus.scale.setScalar(1.7) // 它是个可点的入口，得看得见
    register(olympus, 'gallery')

    const travel = createTravelSet()
    travel.position.set(0.82, 0.002, 0.52)
    travel.rotation.y = -0.3
    travel.scale.setScalar(1.35)
    register(travel, 'travel')

    for (const g of hotspots) {
      g.traverse((o) => {
        if (o.isMesh) o.castShadow = true
      })
    }

    // 竖屏水平视野窄，两侧的热点要往中间收，否则根本进不了画面
    const layoutProps = () => {
      const portrait = camera.aspect < 1
      const sx = portrait ? -1.02 : -1.72
      shelf.position.x = sx
      olympus.position.x = sx
      travel.position.x = portrait ? 0.5 : 0.82
      travel.position.z = portrait ? 0.42 : 0.52
      return sx
    }

    // ── 灯光：暖灯火当主光，窗外霓虹补冷色，一点赛博的边缘光
    scene.add(new THREE.AmbientLight('#ffe8d0', 0.13))
    scene.add(new THREE.HemisphereLight('#8fa8ff', '#2a2018', 0.14))
    const moon = new THREE.DirectionalLight('#b9c8ff', 0.34)
    moon.position.set(-1.6, 3.4, -4.2)
    moon.castShadow = true
    moon.shadow.mapSize.set(1024, 1024)
    moon.shadow.camera.near = 0.5
    moon.shadow.camera.far = 14
    scene.add(moon)
    const neonPink = new THREE.PointLight('#ff2d78', 1.1, 8, 2)
    neonPink.position.set(2.2, 2.1, -2.4)
    scene.add(neonPink)
    const neonCyan = new THREE.PointLight('#25e6ff', 0.9, 8, 2)
    neonCyan.position.set(-2.4, 1.5, -2.4)
    scene.add(neonCyan)
    // 搁板下的一道青色灯带：暗处也看得清相机，顺便给房间一点赛博的边
    const shelfStrip = new THREE.PointLight('#3fe9ff', 0.45, 1.7, 2)
    shelfStrip.position.set(-1.72, 1.28, -D / 2 + 0.3)
    scene.add(shelfStrip)
    const applyLayout = () => {
      shelfStrip.position.x = layoutProps()
    }
    applyLayout()

    // 悬停时点亮的高光
    const hoverLight = new THREE.PointLight('#5df2ff', 0, 0.95, 2)
    scene.add(hoverLight)

    // 浮尘
    const N = 300
    const dustGeo = track(new THREE.BufferGeometry())
    const pos = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * W
      pos[i * 3 + 1] = Math.random() * H
      pos[i * 3 + 2] = (Math.random() - 0.5) * D
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const dust = new THREE.Points(
      dustGeo,
      track(new THREE.PointsMaterial({ color: '#ffd9a0', size: 0.014, transparent: true, opacity: 0.45 })),
    )
    scene.add(dust)

    // ── 交互：射线拾取 + 视差
    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2(0, 0)
    const pointer = { x: 0, y: 0, px: 0, py: 0, inside: false }
    let hovered = null
    let missSince = 0

    const onMove = (e) => {
      const r = renderer.domElement.getBoundingClientRect()
      pointer.px = e.clientX
      pointer.py = e.clientY
      pointer.x = ((e.clientX - r.left) / r.width - 0.5) * 2
      pointer.y = ((e.clientY - r.top) / r.height - 0.5) * 2
      pointer.inside = true
      ndc.set(pointer.x, -pointer.y)
      if (labelRef.current) {
        labelRef.current.style.transform = `translate3d(${e.clientX + 16}px, ${e.clientY - 14}px, 0)`
      }
    }
    const onLeave = () => {
      pointer.inside = false
    }
    const onClick = () => {
      if (hovered) openRef.current?.(hovered)
    }
    const el = renderer.domElement
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    el.addEventListener('click', onClick)

    const onResize = () => {
      if (!mount.clientWidth) return
      camera.aspect = mount.clientWidth / mount.clientHeight
      fitCamera()
      applyLayout()
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
      composer.setSize(mount.clientWidth, mount.clientHeight)
    }
    window.addEventListener('resize', onResize)

    // 亮度探针：WebGL 默认不保留绘制缓冲，循环外读画布只会拿到全黑
    let litRatio = 0
    let meanLum = 0
    let lastSample = -1e9
    const probe = new Uint8Array(4)
    const samplePixels = () => {
      const gl = renderer.getContext()
      const w = renderer.domElement.width
      const h = renderer.domElement.height
      let bright = 0
      let sum = 0
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 4; j++) {
          gl.readPixels(
            Math.floor((w * (i + 0.5)) / 6),
            Math.floor((h * (j + 0.5)) / 4),
            1, 1, gl.RGBA, gl.UNSIGNED_BYTE, probe,
          )
          const lum = (probe[0] + probe[1] + probe[2]) / 3
          sum += lum
          if (lum > 70) bright++
        }
      }
      litRatio = Math.round((bright / 24) * 100)
      meanLum = Math.round(sum / 24)
    }

    const LOOK = new THREE.Vector3(0, 0.52, -0.5)
    const worldPos = new THREE.Vector3()
    const start = performance.now()
    let raf = 0
    const tick = (now) => {
      raf = requestAnimationFrame(tick)
      const t = now - start
      const k = easeOutCubic(Math.min(1, t / 2600))
      camera.position.lerpVectors(CAM_FROM, CAM_TO, k)
      camera.position.x += pointer.x * 0.17 * k
      camera.position.y += -pointer.y * 0.08 * k
      camera.lookAt(LOOK)

      // 拾取
      if (pointer.inside && k > 0.85) {
        raycaster.setFromCamera(ndc, camera)
        const hit = raycaster.intersectObjects(hotspots, true)[0]
        const id = hit ? hit.object.userData.hotspot : null
        // 视差会让物体在光标下微微挪动，落空 160ms 内先保持原判，
        // 否则贴着画面边缘的热点会一直闪
        if (id) {
          missSince = 0
          if (id !== hovered) {
            hovered = id
            setHover(id)
            el.style.cursor = 'pointer'
          }
        } else if (hovered) {
          if (!missSince) missSince = now
          if (now - missSince > 160) {
            hovered = null
            missSince = 0
            setHover(null)
            el.style.cursor = 'default'
          }
        }
      } else if (hovered) {
        hovered = null
        setHover(null)
        el.style.cursor = 'default'
      }

      // 悬停：物件微微抬起，冷色高光跟过去
      for (const g of hotspots) {
        const on = g.userData.hotspot === hovered
        const target = g.userData.baseY + (on ? 0.02 : 0)
        g.position.y += (target - g.position.y) * 0.16
        if (on) {
          g.getWorldPosition(worldPos)
          hoverLight.position.copy(worldPos).add(new THREE.Vector3(0, 0.16, 0.1))
        }
      }
      hoverLight.intensity += ((hovered ? 1.45 : 0) - hoverLight.intensity) * 0.14

      const p = dust.geometry.attributes.position
      for (let i = 0; i < N; i++) {
        p.array[i * 3 + 1] += 0.0006 + Math.sin(t * 0.0004 + i) * 0.0004
        if (p.array[i * 3 + 1] > H) p.array[i * 3 + 1] = 0
      }
      p.needsUpdate = true
      lamp.userData.light.intensity = 1.55 + Math.sin(t * 0.006) * 0.12

      composer.render()
      // 帧间隔一波动，用"跨过 500ms 整数边界"来判定就会整段漏采
      if (t - lastSample > 500) {
        lastSample = t
        samplePixels()
      }
    }
    raf = requestAnimationFrame(tick)
    const readyTimer = setTimeout(() => setReady(true), 900)
    if (typeof window !== 'undefined') {
      window.__room = () => ({
        objects: scene.children.length,
        hotspots: hotspots.map((g) => g.userData.hotspot),
        lit: litRatio,
        mean: meanLum,
        // 供截图脚本核对：三个热点在屏幕上的归一化位置
        screen: Object.fromEntries(
          hotspots.map((g) => {
            const v = new THREE.Vector3()
            g.getWorldPosition(v).project(camera)
            return [g.userData.hotspot, [+((v.x + 1) / 2).toFixed(3), +((1 - v.y) / 2).toFixed(3)]]
          }),
        ),
      })
    }

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(readyTimer)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      el.removeEventListener('click', onClick)
      window.removeEventListener('resize', onResize)
      scene.traverse((o) => {
        if (o.isMesh || o.isPoints) {
          o.geometry?.dispose?.()
          const m = o.material
          if (Array.isArray(m)) m.forEach((x) => x.dispose?.())
          else m?.dispose?.()
        }
      })
      for (const d of disposables) d.dispose?.()
      envRT.dispose()
      pmrem.dispose()
      composer.dispose?.()
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
    }
  }, [])

  const meta = hover ? HOTSPOTS[hover] : null

  return (
    <div className="room">
      <div className="room__canvas" ref={mountRef} />
      <div className={`room__label${meta ? ' is-on' : ''}`} ref={labelRef}>
        {meta && (
          <>
            <span className="room__label-jp">{meta.jp}</span>
            <span className="room__label-en">{meta.en}</span>
          </>
        )}
      </div>
      <div className={`room__caption${ready ? ' is-on' : ''}`}>
        <h2>書斎</h2>
        <p>
          しょさい ·<span className="only-mouse"> 光るものを押す</span>
          <span className="only-touch"> 光るものに触れる</span>
        </p>
      </div>
    </div>
  )
}
