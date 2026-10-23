import { GOSPELS, NAME, loadFingerprints, loadIndex, loadNotes } from '../data'
import type { G } from '../data'
import { translit } from '../greek'
import { AIBadge, DataBadge, Rich, usePromise } from '../ui'

const SHARE: Record<G, [string, string, string][]> = {
  mt: [['triple', 'With Mark & Luke', 'var(--t-triple)'], ['mt-mk', 'With Mark', 'var(--t-two)'], ['double', 'With Luke ("Q")', 'var(--t-double)'], ['mt-only', 'Only Matthew', 'var(--mt)']],
  mk: [['triple', 'With Matthew & Luke', 'var(--t-triple)'], ['mt-mk', 'With Matthew', 'var(--t-two)'], ['mk-lk', 'With Luke', 'var(--t-two)'], ['mk-only', 'Only Mark', 'var(--mk)']],
  lk: [['triple', 'With Matthew & Mark', 'var(--t-triple)'], ['mk-lk', 'With Mark', 'var(--t-two)'], ['double', 'With Matthew ("Q")', 'var(--t-double)'], ['lk-only', 'Only Luke', 'var(--lk)']],
  jn: [['jn-shared', 'Story also in a Synoptic', 'var(--t-triple)'], ['jn-only', 'Only John', 'var(--jn)']],
}

export default function Fingerprints() {
  const fps = usePromise(loadFingerprints, [])
  const index = usePromise(loadIndex, [])
  const notes = usePromise(loadNotes, [])
  if (!fps || !index || !notes) return <div className="loading">Counting words…</div>
  const s = index.stats

  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <section className="hero" style={{ paddingBottom: 20 }}>
        <div className="eyebrow">Authors' fingerprints</div>
        <h1 style={{ marginTop: 14 }}>Every writer has <em>habits.</em></h1>
        <p className="lede">
          Mark keeps saying "immediately". Matthew loves "then" and "the kingdom of the heavens". John returns again
          and again to "world", "believe" and "Father". Below are the words each Gospel uses far more than the
          other three, found by counting every one of the {Object.values(s.words).reduce((a, b) => a + b, 0).toLocaleString()} Greek words.
        </p>
      </section>

      <div className="section-head"><div><div className="eyebrow">How much is shared?</div><h2>What each Gospel has in common</h2></div><DataBadge /></div>
      <p className="muted" style={{ maxWidth: 720, marginTop: -6 }}>Share of each Gospel's Greek words, grouped by which other Gospels tell the same passage.</p>
      <div className="share-bars card" style={{ padding: 20, marginBottom: 46 }}>
        {GOSPELS.map(g => {
          const tw = s.traditionWords[g]
          const tot = s.words[g]
          return (
            <div className="share-row" key={g}>
              <strong style={{ color: `var(--${g})`, fontFamily: 'var(--serif)', fontSize: 19 }}>{NAME[g]}</strong>
              <div>
                <div className="share-track">
                  {SHARE[g].map(([k, label, c]) => {
                    const pct = 100 * (tw[k] ?? 0) / tot
                    if (pct < 0.4) return null
                    return <i key={k} style={{ width: `${pct}%`, background: c }} title={`${label}: ${pct.toFixed(1)}% (${(tw[k] ?? 0).toLocaleString()} words)`}><span>{pct >= 7 ? `${label} ${Math.round(pct)}%` : ''}</span></i>
                  })}
                </div>
              </div>
            </div>
          )
        })}
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          About {s.markReuse.mt}% of Matthew's wording and {s.markReuse.lk}% of Luke's lines up word-for-word or by root with Mark. Hover a segment for exact figures.
        </p>
      </div>

      <div className="section-head"><div><div className="eyebrow">Signature vocabulary</div><h2>The words they reach for</h2></div><DataBadge label="Log-odds ratio" /></div>
      <p className="muted" style={{ maxWidth: 720, marginTop: -6 }}>
        Each row is a Greek word (by dictionary form). The bars show how often it appears per 1,000 words in each Gospel:
        the thick bar is the author's own rate and the thin bars are the others', each row on its own scale. Words are ranked by a weighted log-odds score,
        which favors words that are both frequent and lopsided. Names are included: Luke's fondness for "Jerusalem" is part of his story.
      </p>
      <div className="fp-grid">
        {GOSPELS.map(g => {
          const list = fps[g].filter(f => f.count >= 5).slice(0, 14)
          const portrait = notes.gospels?.[g]
          return (
            <div className={`card fp-card g-${g}`} key={g}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
                <h3>{NAME[g]}</h3>
                <a className="pill" href={`#/read/${g}/1`}>Read →</a>
              </div>
              {portrait && (
                <div className="ai-card" style={{ margin: '12px 0 14px' }}>
                  <div style={{ marginBottom: 6 }}><AIBadge label="Portrait by Claude" /></div>
                  <p style={{ margin: 0, fontSize: 15.5 }}><Rich rt={portrait} /></p>
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                {list.map(f => {
                  const max = Math.max(f.per1000, ...Object.values(f.others).map(Number))
                  return (
                  <div className="fp-row" key={f.lemma}>
                    <div className="w" title={translit(f.lemma)}>{f.lemma}<small>{translit(f.lemma)} · {f.gloss}</small></div>
                    <div className="fp-bars" aria-label={`${f.per1000} per 1000 words in ${NAME[g]}`}>
                      <i style={{ width: `${100 * f.per1000 / max}%`, background: `var(--${g})`, height: 9 }} />
                      {GOSPELS.filter(o => o !== g).map(o => (
                        <i key={o} title={`${NAME[o]}: ${f.others[o] ?? 0} per 1000`} style={{ width: `${100 * (f.others[o] ?? 0) / max}%`, background: `var(--${o})`, opacity: 0.55, height: 4 }} />
                      ))}
                    </div>
                    <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{f.count}×</div>
                  </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <div className="legend" style={{ marginTop: 16 }}>
        {GOSPELS.map(g => <span key={g}><i style={{ background: `var(--${g})` }} />{NAME[g]}</span>)}
        <span className="muted">Right column: total uses in that Gospel.</span>
      </div>
    </div>
  )
}
