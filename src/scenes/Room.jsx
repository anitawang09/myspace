import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { createTokonomaRoom, TABLE, TATAMI_TOP, TOKONOMA } from '../three/tokonoma.js'
import { createResumeSheet, createOlympus, createTravelSet } from '../three/props.js'
import { HOTSPOTS } from '../data/hotspots.js'

const easeOutCubic = (t) => 1 - (1 - t) ** 3

// 机位沿用模型原本的视角：从敞开的右前角看向床の間。
// 进门时从屋外沿视线后撤 2.4m、略高一点的地方推进来
const LOOK = new THREE.Vector3(2, 0.62, 0.5)
const CAM_TO = new THREE.Vector3(4.7, 1.1, 5.4)
const CAM_FROM = CAM_TO.clone().sub(LOOK).setLength(2.4).add(CAM_TO).add(new THREE.Vector3(0, 0.3, 0))

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
    scene.background = new THREE.Color('#1a1816')

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 60)
    camera.position.copy(CAM_FROM)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    mount.appendChild(renderer.domElement)

    const { room, table } = createTokonomaRoom()
    scene.add(room)
    let meshCount = 0
    room.traverse((o) => {
      if (o.isMesh) meshCount++
    })

    // ── 光：障子那一侧斜射进来的日光（窗格在榻榻米上投出格子影）+ 天光 + 顶灯
    scene.add(new THREE.HemisphereLight('#fff1dc', '#9a8a70', 1.1))
    const sun = new THREE.DirectionalLight('#fff0d8', 2.6)
    sun.position.set(-7, 5.2, 3.2)
    sun.target.position.set(2.7, 0, 2.7)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 30 })
    sun.shadow.bias = -0.0003
    sun.shadow.normalBias = 0.02
    sun.shadow.radius = 5
    scene.add(sun, sun.target)
    const fill = new THREE.DirectionalLight('#ffe8cc', 0.55)
    fill.position.set(5, 3, 7)
    scene.add(fill)
    const ceilingLamp = new THREE.PointLight('#ffe2b8', 6, 7, 1.6)
    ceilingLamp.position.set(2.5, 2.3, 2.6)
    scene.add(ceilingLamp)

    // ── 三个热点：桌旗上的纸、床の間里的相机、榻榻米上的卡与机票
    const hotspots = []
    const register = (group, id, parent = scene) => {
      group.traverse((o) => {
        o.userData.hotspot = id
        if (o.isMesh) o.castShadow = true
      })
      group.userData.baseY = group.position.y
      hotspots.push(group)
      parent.add(group)
    }

    const sheet = createResumeSheet()
    sheet.position.set(0.27, TABLE.runnerY + 0.0015, 0)
    sheet.rotation.y = -0.12
    register(sheet, 'resume', table)

    // 床の間本来就是摆珍视之物的地方
    const olympus = createOlympus()
    olympus.scale.setScalar(2)
    olympus.position.set(TOKONOMA.x0 + 0.37, TOKONOMA.top + 0.063, -0.38)
    olympus.rotation.y = 0.35
    register(olympus, 'gallery')

    // 前面那块座布団的右手边，避开畳縁
    const travel = createTravelSet()
    travel.scale.setScalar(1.35)
    travel.position.set(4.15, TATAMI_TOP, 3.15)
    travel.rotation.y = -0.3
    register(travel, 'travel')

    const hoverLight = new THREE.PointLight('#5df2ff', 0, 0.95, 2)
    const hoverOffset = new THREE.Vector3(0, 0.16, 0.1)
    scene.add(hoverLight)

    // ── 交互：射线拾取 + 视差
    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2(0, 0)
    const pointer = { x: 0, y: 0, inside: false }
    let hovered = null
    let missSince = 0

    const el = renderer.domElement
    const setHovered = (id) => {
      hovered = id
      setHover(id)
      el.style.cursor = id ? 'pointer' : 'default'
    }
    const onMove = (e) => {
      const r = el.getBoundingClientRect()
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
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onLeave)
    el.addEventListener('click', onClick)

    const onResize = () => {
      if (!mount.clientWidth) return
      camera.aspect = mount.clientWidth / mount.clientHeight
      // 竖屏水平视野窄得多，放宽视角才装得下桌子和两侧的热点
      camera.fov = camera.aspect < 1 ? 70 : 50
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }
    onResize()
    window.addEventListener('resize', onResize)

    // 亮度探针：WebGL 默认不保留绘制缓冲，循环外读画布只会拿到全黑
    let litRatio = 0
    let meanLum = 0
    let lastSample = -1e9
    const probe = new Uint8Array(4)
    const samplePixels = () => {
      const gl = renderer.getContext()
      const w = el.width
      const h = el.height
      let bright = 0
      let sum = 0
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 4; j++) {
          gl.readPixels(Math.floor((w * (i + 0.5)) / 6), Math.floor((h * (j + 0.5)) / 4), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, probe)
          const lum = (probe[0] + probe[1] + probe[2]) / 3
          sum += lum
          if (lum > 70) bright++
        }
      }
      litRatio = Math.round((bright / 24) * 100)
      meanLum = Math.round(sum / 24)
    }

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

      if (pointer.inside && k > 0.85) {
        raycaster.setFromCamera(ndc, camera)
        const id = raycaster.intersectObjects(hotspots, true)[0]?.object.userData.hotspot ?? null
        // 视差会让物体在光标下微微挪动，落空 160ms 内先保持原判，
        // 否则贴着画面边缘的热点会一直闪
        if (id) {
          missSince = 0
          if (id !== hovered) setHovered(id)
        } else if (hovered) {
          if (!missSince) missSince = now
          if (now - missSince > 160) {
            missSince = 0
            setHovered(null)
          }
        }
      } else if (hovered) {
        setHovered(null)
      }

      // 悬停：物件微微抬起，冷色高光跟过去
      for (const g of hotspots) {
        const on = g.userData.hotspot === hovered
        g.position.y += (g.userData.baseY + (on ? 0.02 : 0) - g.position.y) * 0.16
        if (on) hoverLight.position.copy(g.getWorldPosition(worldPos)).add(hoverOffset)
      }
      hoverLight.intensity += ((hovered ? 1.45 : 0) - hoverLight.intensity) * 0.14

      renderer.render(scene, camera)
      // 帧间隔一波动，用"跨过 500ms 整数边界"来判定就会整段漏采
      if (t - lastSample > 500) {
        lastSample = t
        samplePixels()
      }
    }
    raf = requestAnimationFrame(tick)
    const readyTimer = setTimeout(() => setReady(true), 900)
    window.__room = () => ({
      objects: meshCount,
      hotspots: hotspots.map((g) => g.userData.hotspot),
      lit: litRatio,
      mean: meanLum,
      // 供截图脚本核对：三个热点在屏幕上的归一化位置
      screen: Object.fromEntries(
        hotspots.map((g) => {
          const v = g.getWorldPosition(new THREE.Vector3()).project(camera)
          return [g.userData.hotspot, [+((v.x + 1) / 2).toFixed(3), +((1 - v.y) / 2).toFixed(3)]]
        }),
      ),
    })

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(readyTimer)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      el.removeEventListener('click', onClick)
      window.removeEventListener('resize', onResize)
      // material.dispose() 不会顺带释放贴图，得自己逐张收
      scene.traverse((o) => {
        if (!o.isMesh) return
        o.geometry.dispose()
        for (const m of [o.material].flat()) {
          m.map?.dispose()
          m.dispose()
        }
      })
      renderer.dispose()
      mount.removeChild(el)
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
        <h2>床の間</h2>
        <p>
          とこのま ·<span className="only-mouse"> 光るものを押す</span>
          <span className="only-touch"> 光るものに触れる</span>
        </p>
      </div>
    </div>
  )
}
