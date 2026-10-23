import { useEffect, useMemo, useRef, useState } from 'react'
import type { Cite, G, Token, Unit } from '../data'
import { ABBR, GOSPELS, NAME, SECTION_LABEL, TRADITION_HINT, TRADITION_LABEL, gospelsOf, loadIndex, loadNotes, loadUnit, prettyRefs } from '../data'
import { decodeMorph, translit } from '../greek'
import { AIBadge, DataBadge, Rich, usePromise } from '../ui'
import { LENS_LABEL, LensPanel, type LensKind } from '../components/Lens'
import UnitSearch from '../components/UnitSearch'

type Mode = 'both' | 'greek' | 'gloss'
const LEVEL_CLASS = ['', 'a-syn', 'a-lemma', 'a-exact']
const LEVEL_LABEL = ['', 'synonym', 'same word, different form', 'identical form']

function usePersisted<T extends string>(key: string, init: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    try { return (localStorage.getItem(key) as T) || init } catch { return init }
  })
  return [v, (x: T) => { setV(x); try { localStorage.setItem(key, x) } catch { /* ignore */ } }]
}

export default function Passage({ id, hl }: { id: string; hl: string | null }) {
  const index = usePromise(loadIndex, [])
  const notes = usePromise(loadNotes, [])
  const unit = usePromise(() => loadUnit(id), [id])
  const [mode, setMode] = usePersisted<Mode>('ge-mode', 'both')
  const [lens, setLens] = usePersisted<LensKind>('ge-lens', 'none')
  const [showEn, setShowEn] = usePersisted<'1' | '0'>('ge-en', '0')
  const [dim, setDim] = usePersisted<'1' | '0'>('ge-dim', '0')
  const [hidden, setHidden] = useState<Set<G>>(new Set())
  const [hover, setHover] = useState<{ g: G; i: number } | null>(null)
  const [pop, setPop] = useState<{ g: G; i: number; x: number; y: number } | null>(null)
  const [cited, setCited] = useState<Set<string>>(new Set())
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => { setHidden(new Set()); setPop(null); setCited(new Set()) }, [id])

  const discovery = notes?.discoveries.find(d => d.id === hl && d.unit === id)
  const note = notes?.notes[id]

  // When arriving from a discovery, highlight its cited words.
  useEffect(() => {
    if (discovery && unit) {
      const first = discovery.body.cites.find(c => c.tokens.length && unit.text[c.g])
      if (first) setTimeout(() => showCite(first), 300)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discovery?.id, unit?.id])

  const minorSet = useMemo(() => {
    const s = new Set<string>()
    unit?.minor.filter(m => m.sig).forEach(m => { s.add(`mt:${m.mt}`); s.add(`lk:${m.lk}`) })
    return s
  }, [unit])

  if (!unit || !index || !notes) return <div className="loading">Loading passage…</div>

  const gs = gospelsOf(unit)
  const visible = gs.filter(g => !hidden.has(g))
  const order = index.units.findIndex(u => u.id === id)
  const prev = index.units[order - 1], next = index.units[order + 1]
  const sigMinors = unit.minor.filter(m => m.sig).length

  function showCite(c: Cite) {
    if (!unit?.text[c.g] || !c.tokens.length) {
      window.location.hash = `#/read/${c.g}/${c.ref.split(':')[0]}?v=${c.ref.split(':')[1]}`
      return
    }
    setHidden(h => { const n = new Set(h); n.delete(c.g); return n })
    setCited(new Set(c.tokens.map(i => `${c.g}:${i}`)))
    setTimeout(() => {
      const el = root.current?.querySelector(`[data-k="${c.g}:${c.tokens[0]}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 60)
  }

  const partners = new Set<string>()
  if (hover) {
    const al = unit.text[hover.g]!.align[hover.i]
    for (const [o, v] of Object.entries(al)) partners.add(`${o}:${v![0]}`)
  }

  return (
    <div ref={root} onClick={e => { if (!(e.target as HTMLElement).closest('.tok, .word-pop')) setPop(null) }}>
      <div className="wrap passage-top">
        <div className="crumbs">
          <a href="#/">Map</a><span>›</span><span>{SECTION_LABEL[unit.section] ?? unit.section}</span>
          <div style={{ marginLeft: 'auto', width: 'min(320px, 100%)' }}><UnitSearch index={index} /></div>
        </div>
        <h1>{unit.title}</h1>
        <div className="ref-row">
          {gs.map(g => <span key={g} className={`gchip g-${g}`}><span className="gdot" />{NAME[g]} {prettyRefs(unit.refs[g]!)}</span>)}
          <span className="trad-tag" style={{ color: unit.tradition === 'double' ? 'var(--t-double)' : 'var(--ink-2)' }} title={TRADITION_HINT[unit.tradition]}>{TRADITION_LABEL[unit.tradition]}</span>
        </div>
      </div>

      <div className="controls">
        <div className="wrap">
          <div className="ctrl-group">
            <label className="sm">Show</label>
            <div className="seg">
              {(['both', 'gloss', 'greek'] as Mode[]).map(m => (
                <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>{m === 'both' ? 'English + Greek' : m === 'gloss' ? 'English gloss' : 'Greek'}</button>
              ))}
            </div>
          </div>
          {gs.length > 1 && (
            <div className="ctrl-group">
              <label className="sm">Gospels</label>
              {gs.map(g => (
                <button key={g} className={`pill ${!hidden.has(g) ? 'on' : ''}`} style={!hidden.has(g) ? { background: `var(--${g})`, borderColor: `var(--${g})`, color: '#fff' } : {}}
                  onClick={() => setHidden(h => { const n = new Set(h); if (n.has(g)) n.delete(g); else if (visible.length > 1) n.add(g); return n })}>{ABBR[g]}</button>
              ))}
            </div>
          )}
          <div className="ctrl-group">
            <label className="sm">Theory lens</label>
            <div className="seg">
              {(Object.keys(LENS_LABEL) as LensKind[]).map(l => <button key={l} className={lens === l ? 'on' : ''} onClick={() => setLens(l)}>{LENS_LABEL[l]}</button>)}
            </div>
          </div>
          <div className="ctrl-group">
            <button className={`pill ${showEn === '1' ? 'on' : ''}`} onClick={() => setShowEn(showEn === '1' ? '0' : '1')}>Translation</button>
            {gs.length > 1 && <button className={`pill ${dim === '1' ? 'on' : ''}`} onClick={() => setDim(dim === '1' ? '0' : '1')}>Fade unshared</button>}
          </div>
        </div>
      </div>

      <div className="wrap">
        {gs.length > 1 && (
          <div className="syn-legend">
            <DataBadge label="Colors computed from the Greek" />
            <span>Highlight = this word also appears in</span>
            {visible.map(g => <span key={g}><i className="sw" style={{ background: `color-mix(in srgb, var(--${g}) 28%, transparent)` }} />{NAME[g]}</span>)}
            {visible.length > 2 && <span><i className="sw" style={{ background: 'color-mix(in srgb, var(--t-triple) 28%, transparent)' }} />two or more others</span>}
            <span><i className="sw" style={{ background: 'color-mix(in srgb, var(--ink) 8%, transparent)', boxShadow: 'inset 0 -2px 0 var(--ink-2)' }} />underline = different form</span>
            {sigMinors > 0 && visible.includes('mt') && visible.includes('lk') && visible.includes('mk') && <span><i className="sw" style={{ outline: '2px dashed var(--t-double)', outlineOffset: -2 }} />Matthew + Luke against Mark</span>}
            <span><i className="sw" style={{ outline: '1.5px dashed var(--sch)', outlineOffset: -2 }} />doubtful text</span>
          </div>
        )}
        <div className="passage-grid">
          <div>
            <div className={`synopsis mode-${mode} ${dim === '1' ? 'dim-unaligned' : ''}`} style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(var(--colmin), 1fr))` }}>
              {visible.map(g => (
                <Column key={g} g={g} unit={unit} visible={visible} showEn={showEn === '1'} hover={hover} partners={partners}
                  cited={cited} minorSet={visible.includes('mk') ? minorSet : new Set()}
                  onHover={setHover} onPick={(i, x, y) => setPop({ g, i, x, y })} />
              ))}
            </div>
            {note?.deep && (
              <article className="deep">
                <div className="deep-inner">
                  <AIBadge label="Deep reading · Claude Opus 5.5" />
                  <h2>A closer reading</h2>
                  <p className="lede"><Rich rt={note.deep.lede} onCite={showCite} /></p>
                  {note.deep.sections.map((s, i) => (
                    <section key={i}>
                      <h3>{s.heading}</h3>
                      {s.body.text.split(/\n\n+/).map((para, j) => (
                        <p key={j}><Rich rt={{ text: para, cites: s.body.cites }} onCite={showCite} /></p>
                      ))}
                    </section>
                  ))}
                  <p className="muted" style={{ fontSize: 13, fontFamily: 'var(--sans)', marginTop: 20 }}>
                    AI-generated interpretation, grounded in the computed alignment above. Every highlighted Greek citation is checked automatically against the SBLGNT text. Claims about scholarship summarize widely held positions; verify before citing.
                  </p>
                </div>
              </article>
            )}
            <nav className="unit-nav">
              {prev ? <a className="card" href={`#/p/${prev.id}`}><div className="dir">← Previous passage</div><div className="t">{prev.title}</div></a> : <span />}
              {next && <a className="card" href={`#/p/${next.id}`} style={{ textAlign: 'right' }}><div className="dir">Next passage →</div><div className="t">{next.title}</div></a>}
            </nav>
          </div>

          <aside className="side">
            {discovery && (
              <div className="ai-card" style={{ borderWidth: 2 }}>
                <div className="row" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <span className="eyebrow">Discovery · {discovery.kind}</span><AIBadge label="AI" />
                </div>
                <h3 style={{ fontSize: 22, margin: '8px 0 0' }}>{discovery.title}</h3>
                <p><Rich rt={discovery.body} onCite={showCite} /></p>
              </div>
            )}
            {note && (
              <div className="ai-card">
                <AIBadge label="AI reading · Claude Opus 5.5" />
                <p><Rich rt={note.note} onCite={showCite} /></p>
                {note.deep && <div className="disclaim"><a href="#" onClick={e => { e.preventDefault(); root.current?.querySelector('.deep')?.scrollIntoView({ behavior: 'smooth' }) }}>Read the full close reading ↓</a></div>}
                <div className="disclaim">Interpretive, written by AI. Click a Greek citation to highlight it.</div>
              </div>
            )}
            <StatsPanel unit={unit} sigMinors={sigMinors} />
            <LensPanel lens={lens} unit={unit} minors={sigMinors} />
          </aside>
        </div>
      </div>
      {pop && <WordPop unit={unit} {...pop} onClose={() => setPop(null)} />}
    </div>
  )
}

function Column({ g, unit, visible, showEn, hover, partners, cited, minorSet, onHover, onPick }: {
  g: G; unit: Unit; visible: G[]; showEn: boolean; hover: { g: G; i: number } | null; partners: Set<string>; cited: Set<string>; minorSet: Set<string>
  onHover: (h: { g: G; i: number } | null) => void; onPick: (i: number, x: number, y: number) => void
}) {
  const tx = unit.text[g]!
  // group tokens by verse
  const groups: { v: string; idx: number[] }[] = []
  tx.tokens.forEach((t, i) => {
    const last = groups[groups.length - 1]
    if (last && last.v === t[8]) last.idx.push(i)
    else groups.push({ v: t[8], idx: [i] })
  })
  // verses with no Greek in SBLGNT (e.g. Matthew 17:21) still get their number
  const present = new Set(groups.map(x => x.v))
  const missing = tx.verses.filter(v => !present.has(v))
  return (
    <div className={`col g-${g}`}>
      <div className="col-head"><h2>{NAME[g]}</h2><span className="r">{prettyRefs(unit.refs[g]!)}</span></div>
      {groups.map(({ v, idx }) => (
        <div className="verse" key={v}>
          <div className="toks">
            <span className="vnum">{v}</span>
            {idx.map(i => {
              const t = tx.tokens[i]
              const al = tx.align[i]
              const others = (Object.keys(al) as G[]).filter(o => visible.includes(o))
              const level = others.reduce((m, o) => Math.max(m, al[o]![1]), 0)
              const hc = others.length === 1 ? `var(--${others[0]})` : 'var(--t-triple)'
              const k = `${g}:${i}`
              const cls = ['tok', LEVEL_CLASS[level],
                minorSet.has(k) ? 'minor' : '',
                hover && hover.g === g && hover.i === i ? 'hover' : '',
                partners.has(k) ? 'partner' : '', cited.has(k) ? 'cited' : ''].join(' ')
              return (
                <button key={i} data-k={k} className={cls} style={{ ['--hc' as string]: hc, ...(t[9] ? { outline: '1.5px dashed var(--sch)', outlineOffset: -1 } : {}) }}
                  onMouseEnter={() => onHover({ g, i })} onMouseLeave={() => onHover(null)}
                  onClick={e => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); onPick(i, r.left, r.bottom) }}
                  aria-label={`${t[0]}, ${t[3]}`}>
                  <span className="gl">{t[3] || '—'}</span>
                  <span className="gk">{t[0]}<span className="p">{t[1].trim()}</span></span>
                </button>
              )
            })}
          </div>
          {showEn && <p className="en-line">{tx.en[v]}</p>}
        </div>
      ))}
      {missing.length > 0 && (
        <p className="muted" style={{ fontSize: 13 }}>
          {missing.map(v => `${ABBR[g]} ${v}`).join(', ')}: not in the modern critical text (found in later manuscripts; see <a href={`#/read/${g}/${missing[0].split(':')[0]}?v=${missing[0].split(':')[1]}`}>variants</a>).
        </p>
      )}
    </div>
  )
}

function StatsPanel({ unit, sigMinors }: { unit: Unit; sigMinors: number }) {
  const pairs = Object.entries(unit.pairs)
  if (!pairs.length) {
    const g = gospelsOf(unit)[0]
    return (
      <div className="card panel">
        <DataBadge />
        <h3>Found only in {NAME[g]}</h3>
        <p className="muted" style={{ fontSize: 14, margin: 0 }}>{TRADITION_HINT[unit.tradition]}. {unit.text[g]!.tokens.length} Greek words.</p>
      </div>
    )
  }
  return (
    <div className="card panel">
      <DataBadge />
      <h3>How much is shared?</h3>
      {pairs.map(([k, p]) => {
        const [a, b] = k.split('-') as [G, G]
        const ta = unit.text[a]!.tokens.length
        const ex = Math.round(100 * (p.exact ?? 0) / ta), lm = Math.max(0, Math.round(p.pctA) - ex)
        return (
          <div className="pair" key={k}>
            <div className="lbl"><span><span className={`gchip g-${a}`}>{ABBR[a]}</span> ↔ <span className={`gchip g-${b}`}>{ABBR[b]}</span></span><span>{p.pctA}% of {NAME[a]}'s words</span></div>
            <div className="track" title={`${ex}% identical form, ${lm}% same word in a different form`}>
              <i style={{ width: `${ex}%`, background: `var(--${b})` }} />
              <i style={{ width: `${lm}%`, background: `color-mix(in srgb, var(--${b}) 40%, transparent)` }} />
            </div>
            {p.run >= 4 && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Longest identical run: <strong>{p.run} words</strong></div>}
          </div>
        )
      })}
      {unit.tradition === 'triple' && (
        <p style={{ fontSize: 13, margin: '10px 0 0', color: 'var(--ink-2)' }}>
          <strong>{sigMinors}</strong> minor agreement{sigMinors === 1 ? '' : 's'}: words where Matthew and Luke agree against Mark (dashed outline).
        </p>
      )}
      <p className="muted" style={{ fontSize: 11.5, margin: '10px 0 0' }}>Words are matched by dictionary form (lemma) in order, by an algorithm described on the About page. Hover any word to see its counterparts.</p>
    </div>
  )
}

function WordPop({ unit, g, i, x, y, onClose }: { unit: Unit; g: G; i: number; x: number; y: number; onClose: () => void }) {
  const t: Token = unit.text[g]!.tokens[i]
  const al = unit.text[g]!.align[i]
  const left = Math.min(Math.max(12, x - 20), window.innerWidth - 352)
  const top = Math.min(y + 8, window.innerHeight - 340)
  return (
    <div className="word-pop" style={{ left, top }} role="dialog">
      <button className="close" onClick={onClose} aria-label="Close">×</button>
      <div className="w">{t[0]}</div>
      <div className="tr">{translit(t[0])} · “{t[3]}”</div>
      <dl>
        <dt>Dictionary form</dt><dd><span className="greek" style={{ fontSize: 16 }}>{t[2]}</span> <span className="muted">({translit(t[2])})</span></dd>
        <dt>Grammar</dt><dd>{decodeMorph(t[4])}</dd>
        <dt>Reference</dt><dd>{NAME[g]} {t[8]}</dd>
        {t[6] && <><dt>Strong's</dt><dd>G{t[6]}</dd></>}
        {t[7] && <><dt>Meaning domain</dt><dd>Louw–Nida {t[7]}</dd></>}
      </dl>
      {t[9] === 1 && <p style={{ fontSize: 12.5, color: 'var(--sch)', margin: '10px 0 0' }}>Printed in [[double brackets]] by modern editors: probably not part of the original text.</p>}
      <div className="partners">
        {(Object.keys(al) as G[]).length === 0 && <span className="muted">No counterpart found in the parallel Gospels.</span>}
        {GOSPELS.filter(o => al[o]).map(o => {
          const [j, lv] = al[o]!
          const pt = unit.text[o]!.tokens[j]
          return <div key={o}><span className={`gchip g-${o}`}><span className="gdot" />{NAME[o]} {pt[8]}</span> <span className="greek" style={{ fontSize: 16 }}>{pt[0]}</span> <span className="muted">· {LEVEL_LABEL[lv]}</span></div>
        })}
      </div>
      <div style={{ marginTop: 10 }}><DataBadge /></div>
    </div>
  )
}

