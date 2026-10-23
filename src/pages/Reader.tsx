import { useEffect, useMemo, useState } from 'react'
import type { G, Verse } from '../data'
import { ABBR, GOSPELS, NAME, gospelsOf, loadFingerprints, loadGospel, loadIndex, loadVariants, prettyRefs } from '../data'
import { translit } from '../greek'
import { DataBadge, SchBadge, usePromise } from '../ui'

type View = 'english' | 'interlinear'
type VarMode = 'both' | 'na' | 'tr'

export default function Reader({ g, ch, v }: { g: G; ch: number; v: string | null }) {
  const verses = usePromise(() => loadGospel(g), [g])
  const index = usePromise(loadIndex, [])
  const fps = usePromise(loadFingerprints, [])
  const [view, setView] = useState<View>('english')
  const [sig, setSig] = useState(true)
  const [openVar, setOpenVar] = useState<Set<string>>(new Set())
  const [varMode, setVarMode] = useState<VarMode>('both')
  const variants = usePromise(loadVariants, [])

  useEffect(() => {
    setOpenVar(v ? new Set([`${ch}:${v}`]) : new Set())
    if (v) setTimeout(() => document.getElementById(`v-${ch}-${v}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250)
  }, [g, ch, v])

  const units = useMemo(() => Object.fromEntries((index?.units ?? []).map(u => [u.id, u])), [index])
  const signature = useMemo(() => new Set((fps?.[g] ?? []).filter(f => f.count >= 6 && f.z > 2).slice(0, 25).map(f => f.lemma)), [fps, g])
  if (!verses || !index) return <div className="loading">Loading {NAME[g]}…</div>

  const chapters = [...new Set(verses.map(x => Number(x.r.split(':')[0])))]
  const these = verses.filter(x => Number(x.r.split(':')[0]) === ch)

  // break verses into passage groups
  const groups: { u: string; vs: Verse[] }[] = []
  for (const x of these) {
    const last = groups[groups.length - 1]
    if (last && last.u === x.u) last.vs.push(x)
    else groups.push({ u: x.u, vs: [x] })
  }

  return (
    <div className="wrap">
      <div className="passage-top">
        <div className="eyebrow">Read a Gospel</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline', marginTop: 10 }}>
          {GOSPELS.map(x => (
            <a key={x} href={`#/read/${x}/1`} style={{ textDecoration: 'none' }}>
              <h1 style={{ fontSize: x === g ? 'clamp(34px,4.5vw,52px)' : 'clamp(20px,2.4vw,26px)', color: x === g ? `var(--${x})` : 'var(--muted)', margin: 0 }}>{NAME[x]}</h1>
            </a>
          ))}
        </div>
      </div>
      <div className="controls" style={{ marginLeft: -24, marginRight: -24, paddingLeft: 24, paddingRight: 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 16px', alignItems: 'center' }}>
          <div className="seg">
            <button className={view === 'english' ? 'on' : ''} onClick={() => setView('english')}>English</button>
            <button className={view === 'interlinear' ? 'on' : ''} onClick={() => setView('interlinear')}>Greek interlinear</button>
          </div>
          {view === 'interlinear' && <button className={`pill ${sig ? 'on' : ''}`} onClick={() => setSig(!sig)}>Highlight {NAME[g]}'s signature words</button>}
          <span className="muted" style={{ fontSize: 13 }}>Chapter {ch} · <span style={{ color: 'var(--sch)' }}>◆</span> = textual variant (tap to compare manuscripts)</span>
        </div>
      </div>
      <div className="reader-layout">
        <aside className="toc">
          <div className="eyebrow" style={{ marginBottom: 8 }}>Chapters</div>
          <div className="chs">
            {chapters.map(c => <a key={c} href={`#/read/${g}/${c}`} className={c === ch ? 'on' : ''}>{c}</a>)}
          </div>
          {view === 'interlinear' && sig && fps && (
            <div style={{ marginTop: 22 }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Signature words</div>
              <p className="muted" style={{ margin: '0 0 8px', fontSize: 12.5 }}>Words {NAME[g]} uses far more than the other Gospels. <a href="#/fingerprints">How this is measured</a></p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {fps[g].filter(f => signature.has(f.lemma)).map(f => <span key={f.lemma} className="greek" style={{ fontSize: 14, padding: '1px 6px', borderRadius: 4, background: `color-mix(in srgb, var(--${g}) 16%, transparent)` }} title={f.gloss}>{f.lemma}</span>)}
              </div>
            </div>
          )}
        </aside>
        <div className={`g-${g}`}>
          {groups.map((grp, gi) => {
            const u = units[grp.u]
            const others = u ? gospelsOf(u).filter(x => x !== g) : []
            return (
              <section key={gi}>
                <div className="peri-head">
                  <h3>{u?.title}</h3>
                  <div className="par">
                    {others.length ? <>
                      <span className="muted">Also in</span>
                      {others.map(o => <span key={o} className={`gchip g-${o}`} title={`${NAME[o]} ${u.refs[o]}`}><span className="gdot" />{ABBR[o]} {prettyRefs(u.refs[o]!)}</span>)}
                      <a className="pill" href={`#/p/${grp.u}`}>Compare →</a>
                    </> : <><span className="muted">Only in {NAME[g]}</span><a className="pill" href={`#/p/${grp.u}`}>Open →</a></>}
                  </div>
                </div>
                {grp.vs.map(x => {
                  const [c, vn] = x.r.split(':')
                  const vk = x.r
                  const open = openVar.has(vk)
                  return (
                    <div className="rverse" key={x.r} id={`v-${c}-${vn}`}>
                      <div className="n">{vn}</div>
                      <div>
                        {view === 'english' ? (
                          <div className="en" style={x.w.some(t => t[9]) ? { borderLeft: '2px dashed var(--sch)', paddingLeft: 10 } : undefined}>
                            {x.en || <span className="muted">(not in the modern critical text)</span>}
                            {x.var === 1 && <button className="var-flag" onClick={() => toggle(setOpenVar, vk)}>◆ variant</button>}
                          </div>
                        ) : (
                          <div className="toks mode-both">
                            {x.w.map((t, i) => (
                              <span key={i} className={`tok ${sig && signature.has(t[2]) ? 'fp' : ''}`} title={`${t[2]} · ${translit(t[0])}`}
                                style={t[9] ? { outline: '1.5px dashed var(--sch)', outlineOffset: -1 } : undefined}>
                                <span className="gl">{t[3]}</span><span className="gk">{t[0]}<span className="p">{t[1].trim()}</span></span>
                              </span>
                            ))}
                            {x.w.length === 0 && <span className="muted" style={{ fontSize: 14 }}>(not in the modern critical text)</span>}
                            {x.var === 1 && <button className="var-flag" onClick={() => toggle(setOpenVar, vk)}>◆ variant</button>}
                          </div>
                        )}
                        {open && variants && <VariantBox words={variants[g][vk]} mode={varMode} setMode={setVarMode} />}
                      </div>
                    </div>
                  )
                })}
              </section>
            )
          })}
          <div className="unit-nav">
            {ch > 1 ? <a className="card" href={`#/read/${g}/${ch - 1}`}><div className="dir">← Previous</div><div className="t">{NAME[g]} {ch - 1}</div></a> : <span />}
            {ch < chapters.length && <a className="card" href={`#/read/${g}/${ch + 1}`} style={{ textAlign: 'right' }}><div className="dir">Next →</div><div className="t">{NAME[g]} {ch + 1}</div></a>}
          </div>
        </div>
      </div>
    </div>
  )
}

function toggle(set: (f: (s: Set<string>) => Set<string>) => void, k: string) {
  set(s => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })
}

function VariantBox({ words, mode, setMode }: { words?: import('../data').VarWord[]; mode: VarMode; setMode: (m: VarMode) => void }) {
  if (!words) return null
  const notes = [...new Set(words.map(w => w[6]).filter(Boolean))]
  const anyBracket = words.some(w => w[4])
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="seg">
          <button className={mode === 'both' ? 'on' : ''} onClick={() => setMode('both')}>Compare</button>
          <button className={mode === 'na' ? 'on' : ''} onClick={() => setMode('na')}>Modern critical text</button>
          <button className={mode === 'tr' ? 'on' : ''} onClick={() => setMode('tr')}>KJV's Greek (TR)</button>
        </div>
        <DataBadge label="STEPBible TAGNT" />
      </div>
      <div className={`var-stream mode-${mode}`}>
        {words.map((w, i) => {
          const cls = w[2] && !w[3] ? 'na-only' : !w[2] && w[3] ? 'tr-only' : ''
          if (!w[2] && !w[3]) return null
          return (
            <span key={i} className={`vw ${cls} ${w[4] ? 'bracket' : ''}`} title={cls === 'tr-only' ? 'Only in the Textus Receptus (KJV)' : cls === 'na-only' ? 'Only in the modern critical text' : ''}>
              <span className="gk">{w[0]}</span><span className="gl">{w[1]}</span>
            </span>
          )
        })}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 6, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <span><span className="vw tr-only" style={{ padding: '0 6px' }}>green</span> only in the Greek behind the KJV</span>
        <span><span className="vw na-only" style={{ padding: '0 6px' }}><span className="gl" style={{ fontSize: 12.5 }}>struck</span></span> only in modern editions</span>
        {anyBracket && <span><span className="vw bracket" style={{ padding: '0 6px' }}>dashed</span> double-bracketed: judged not original</span>}
      </div>
      {notes.length > 0 && (
        <details style={{ marginTop: 6, fontSize: 13 }}>
          <summary className="muted" style={{ cursor: 'pointer' }}>Manuscript notes from TAGNT <SchBadge label="Tyndale House data" /></summary>
          {notes.map((n, i) => <p key={i} style={{ margin: '6px 0', color: 'var(--ink-2)' }} dangerouslySetInnerHTML={{ __html: sanitize(n) }} />)}
        </details>
      )}
    </div>
  )
}

/** TAGNT notes contain a few <i> tags; keep those, escape everything else. */
function sanitize(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/&lt;(\/?)i&gt;/g, '<$1i>')
}
