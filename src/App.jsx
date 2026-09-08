import { lazy, Suspense, useState } from 'react'
import Gate from './scenes/Gate.jsx'

// three.js 只在进屋时才加载，门外那一幕不必为它等待
const Room = lazy(() => import('./scenes/Room.jsx'))

/**
 * 两幕：门外（千鳥破風 + 字帘 + 拉门）→ 门内（3D 书斋）。
 * ?room=1 直接进屋，?t=2 把等待改成 2 秒 —— 调试与截图用。
 */
export default function App() {
  const [phase, setPhase] = useState(() =>
    new URLSearchParams(window.location.search).get('room') ? 'room' : 'gate',
  )

  return (
    <div className="stage">
      {phase === 'gate' ? (
        <Gate onEnter={() => setPhase('room')} />
      ) : (
        <Suspense fallback={<div className="room__loading" />}>
          <Room />
        </Suspense>
      )}
    </div>
  )
}
