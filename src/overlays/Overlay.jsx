import { useEffect, useRef } from 'react'

/** 覆盖层外壳：背板、关闭按钮、Esc 关闭、打开时锁定焦点起点 */
export default function Overlay({ title, sub, onClose, children, wide }) {
  const ref = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    ref.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="ov" role="dialog" aria-modal="true" aria-label={title}>
      <div className="ov__scrim" onClick={onClose} />
      <div className={`ov__panel${wide ? ' ov__panel--wide' : ''}`} ref={ref} tabIndex={-1}>
        <header className="ov__head">
          <div>
            <h2 className="ov__title">{title}</h2>
            {sub && <p className="ov__sub">{sub}</p>}
          </div>
          <button className="ov__close" onClick={onClose} aria-label="閉じる">
            <span />
            <span />
          </button>
        </header>
        <div className="ov__body">{children}</div>
      </div>
    </div>
  )
}
