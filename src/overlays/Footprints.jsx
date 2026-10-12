import Overlay from './Overlay.jsx'

/** 足跡：入口已接通，内容之后再搭 */
export default function Footprints({ onClose }) {
  return (
    <Overlay title="足跡" sub="OV-CHIPKAART & BOARDING PASS" onClose={onClose}>
      <div className="soon">
        <p className="soon__jp">まだ組み立て中</p>
        <p className="soon__text">Maps, cities, and the roads between them — coming soon.</p>
      </div>
    </Overlay>
  )
}
