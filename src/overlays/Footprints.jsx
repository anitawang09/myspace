import Overlay from './Overlay.jsx'

/** 足跡：先把入口接通，内容之后再搭 */
export default function Footprints({ onClose }) {
  return (
    <Overlay title="足跡" sub="OV-CHIPKAART & BOARDING PASS" onClose={onClose}>
      <div className="soon">
        <p className="soon__jp">まだ組み立て中</p>
        <p className="soon__text">
          这里之后放你的足迹 —— 地图、去过的城市、每一段路的时间与照片。
          入口已经接通，内容随时可以填进来。
        </p>
        <ul className="soon__hint">
          <li>数据放 <code>src/data/travel.js</code></li>
          <li>展示层写在 <code>src/overlays/Footprints.jsx</code></li>
        </ul>
      </div>
    </Overlay>
  )
}
