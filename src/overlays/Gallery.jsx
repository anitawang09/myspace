import { useCallback, useEffect, useRef } from 'react'
import Overlay from './Overlay.jsx'
import { PHOTOS } from '../data/photos.js'
import { assetUrl } from '../lib/assetUrl.js'

// photos.js 里写 '/photos/xxx.jpg' 就行——这里补上部署时的子路径前缀。
// 完整 URL（http/https，比如外链图床）原样放行，不经过这层。
const photoSrc = (src) => (src && !/^https?:\/\//.test(src) ? assetUrl(src) : src)

/** 拍立得画廊：横向滑动。拖拽 / 滚轮 / 左右方向键都能推 */
export default function Gallery({ onClose }) {
  const railRef = useRef(null)
  const drag = useRef({ on: false, x: 0, left: 0, moved: false })

  const onWheel = useCallback((e) => {
    const rail = railRef.current
    if (!rail) return
    // 竖向滚轮也换算成横向推进，触控板横向手势直接生效
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    rail.scrollLeft += d
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      const rail = railRef.current
      if (!rail) return
      if (e.key === 'ArrowRight') rail.scrollBy({ left: 260, behavior: 'smooth' })
      if (e.key === 'ArrowLeft') rail.scrollBy({ left: -260, behavior: 'smooth' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const down = (e) => {
    const rail = railRef.current
    drag.current = { on: true, x: e.clientX, left: rail.scrollLeft, moved: false }
    rail.setPointerCapture(e.pointerId)
  }
  const move = (e) => {
    const d = drag.current
    if (!d.on) return
    const dx = e.clientX - d.x
    if (Math.abs(dx) > 3) d.moved = true
    railRef.current.scrollLeft = d.left - dx
  }
  const up = () => {
    drag.current.on = false
  }

  return (
    <Overlay title="写真" sub="OLYMPUS CCD · ドラッグで横に流す" onClose={onClose} wide>
      <div
        className="rail"
        ref={railRef}
        onWheel={onWheel}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        {PHOTOS.map((p, i) => (
          <figure className="polaroid" key={p.id} style={{ '--tilt': `${(i % 2 ? 1 : -1) * (0.6 + (i % 3) * 0.5)}deg` }}>
            <div
              className="polaroid__img"
              style={
                p.src
                  ? { backgroundImage: `url(${photoSrc(p.src)})` }
                  : { background: `linear-gradient(160deg, ${p.tone[0]}, ${p.tone[1]})` }
              }
            >
              {!p.src && <span className="polaroid__wait">FILM</span>}
            </div>
            <figcaption>{p.caption}</figcaption>
          </figure>
        ))}
        <div className="rail__end">
          <p>まだ現像中</p>
          <span>把照片放进 public/photos/，在 src/data/photos.js 填上路径</span>
        </div>
      </div>
    </Overlay>
  )
}
