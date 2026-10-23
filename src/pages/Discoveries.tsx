import { NAME, loadNotes } from '../data'
import { AIBadge, Icon, Rich, usePromise } from '../ui'

export default function Discoveries() {
  const notes = usePromise(loadNotes, [])
  if (!notes) return <div className="loading">Loading…</div>
  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <section className="hero" style={{ paddingBottom: 20 }}>
        <div className="eyebrow">Discoveries</div>
        <h1 style={{ marginTop: 14 }}>Things you can't see <em>in English.</em></h1>
        <p className="lede">
          Each of these starts from something the data shows: a run of identical Greek words, a change one author made,
          a passage that moves or vanishes. Claude wrote the explanations. Every quoted Greek word is checked against the
          text when the site is built, and each one links to the exact spot in the synopsis.
        </p>
        <div style={{ marginTop: 14 }}><AIBadge label="Written by Claude Opus 5.5 · checked against the Greek" /></div>
      </section>
      <div style={{ display: 'grid', gap: 18 }}>
        {notes.discoveries.map((d, i) => (
          <article key={d.id} className="card disc-ai" style={{ padding: 24, display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="disc-num">{i + 1}</span>
              <span className="eyebrow" style={{ fontSize: 11 }}>{d.kind}</span>
              <span className={`gchip g-${d.pin}`}><span className="gdot" />{NAME[d.pin]}</span>
            </div>
            <h2 style={{ fontSize: 'clamp(24px,3vw,32px)', margin: 0 }}>{d.title}</h2>
            <p style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 19, lineHeight: 1.55 }}><Rich rt={d.teaser} /></p>
            <p style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 17, lineHeight: 1.6, color: 'var(--ink-2)' }}><Rich rt={d.body} /></p>
            <div><a className="pill on" href={`#/p/${d.unit}?hl=${d.id}`}>See it in the Greek <Icon.arrow /></a></div>
          </article>
        ))}
      </div>
    </div>
  )
}
