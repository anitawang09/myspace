import Overlay from './Overlay.jsx'
import { RESUME } from '../data/resume.js'

export default function Resume({ onClose }) {
  return (
    <Overlay title="履歴書" sub="RESUME" onClose={onClose}>
      <article className="cv">
        <header className="cv__head">
          <h3>{RESUME.name}</h3>
          <p className="cv__role">{RESUME.title}</p>
          <p className="cv__intro">{RESUME.intro}</p>
          <ul className="cv__contact">
            {RESUME.contact.map((c) => (
              <li key={c.label}>
                <span>{c.label}</span>
                {c.value}
              </li>
            ))}
          </ul>
        </header>

        {RESUME.sections.map((sec) => (
          <section key={sec.en} className="cv__section">
            <h4>
              {sec.jp}
              <span>{sec.en}</span>
            </h4>

            {sec.items?.map((it, i) => (
              <div className="cv__item" key={i}>
                {it.period && <p className="cv__period">{it.period}</p>}
                <div className="cv__body">
                  {(it.role || it.org) && (
                    <p className="cv__role-line">
                      <strong>{it.role}</strong>
                      {it.org && <span> · {it.org}</span>}
                    </p>
                  )}
                  {it.notes?.length > 0 && (
                    <ul className="cv__notes">
                      {it.notes.map((n, j) => (
                        <li key={j}>{n}</li>
                      ))}
                    </ul>
                  )}
                  {it.skills?.length > 0 && (
                    <ul className="cv__tags">
                      {it.skills.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}

            {sec.groups?.map((g) => (
              <div className="cv__item" key={g.label}>
                <p className="cv__period">{g.label}</p>
                <div className="cv__body">
                  <ul className="cv__tags">
                    {g.tags.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </section>
        ))}
      </article>
    </Overlay>
  )
}
