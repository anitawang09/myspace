import { lazy, Suspense, useState } from 'react'
import Gate from './scenes/Gate.jsx'
import Resume from './overlays/Resume.jsx'
import Gallery from './overlays/Gallery.jsx'
import Footprints from './overlays/Footprints.jsx'

// three.js 只在进屋时才加载，门外那一幕不必为它等待
const Room = lazy(() => import('./scenes/Room.jsx'))

const OVERLAYS = { resume: Resume, gallery: Gallery, travel: Footprints }

/**
 * 两幕：门外（千鳥破風 + 字帘 + 拉门）→ 门内（3D 书斋）。
 * 屋里三样东西可以点开：桌上的纸 = 履历，架上的相机 = 写真，地上的卡与机票 = 足迹。
 * ?room=1 直接进屋，?t=2 把等待改成 2 秒，?open=resume 直接打开某一层 —— 调试与截图用。
 */
export default function App() {
  const q = new URLSearchParams(window.location.search)
  const [phase, setPhase] = useState(() => (q.get('room') || q.get('open') ? 'room' : 'gate'))
  const [overlay, setOverlay] = useState(() => (OVERLAYS[q.get('open')] ? q.get('open') : null))

  const Panel = overlay ? OVERLAYS[overlay] : null

  return (
    <div className="stage">
      {phase === 'gate' ? (
        <Gate onEnter={() => setPhase('room')} />
      ) : (
        <Suspense fallback={<div className="room__loading" />}>
          <Room onOpen={setOverlay} />
        </Suspense>
      )}
      {Panel && <Panel onClose={() => setOverlay(null)} />}
    </div>
  )
}
