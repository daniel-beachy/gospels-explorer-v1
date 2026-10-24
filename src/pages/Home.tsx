import { useState } from 'react'
import GospelMap from '../components/GospelMap'
import { loadIndex, loadNotes, NAME } from '../data'
import { AIBadge, DataBadge, Icon, Rich, usePromise } from '../ui'

type Filter = 'all' | 'synoptic' | 'double' | 'john'

export default function Home() {
  const index = usePromise(loadIndex, [])
  const notes = usePromise(loadNotes, [])
  const [filter, setFilter] = useState<Filter>('all')
  if (!index || !notes) return <div className="loading">Loading the Gospels…</div>
  const s = index.stats
  const triple = index.units.filter(u => u.tradition === 'triple').length
  const dbl = index.units.filter(u => u.tradition === 'double').length
  const jnShared = index.units.filter(u => u.jn && u.tradition !== 'jn-only').length
  const totalWords = Object.values(s.words).reduce((a, b) => a + b, 0)

  return (
    <>
      <section className="wrap hero">
        <div className="eyebrow">Matthew · Mark · Luke · John, in Greek</div>
        <h1 style={{ marginTop: 14 }}>Four Gospels, one story. <em>See how they fit together.</em></h1>
        <p className="lede">
          The four Gospels were written in Greek, and three of them share whole paragraphs word for word.
          In English you can't see the borrowing, the editing or the rearranging. This map shows it. Each bar is a
          Gospel, divided into its passages, drawn to scale by number of Greek words. Each ribbon links passages
          told in more than one Gospel. Hover to explore, click to read the Greek side by side, or start
          with one of the numbered discoveries.
        </p>
      </section>

      <section className="wrap">
        <div className="map-toolbar">
          <div className="seg" role="group" aria-label="Which connections to show">
            {([['all', 'All connections'], ['synoptic', 'Mark-based'], ['double', 'Matthew + Luke only ("Q")'], ['john', 'John']] as const).map(([k, l]) => (
              <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>
            ))}
          </div>
          <DataBadge label="Map computed from the data" />
        </div>
        <GospelMap index={index} discoveries={notes.discoveries} filter={filter} />
        <div className="legend" style={{ marginTop: 14 }}>
          <span><i style={{ background: 'var(--t-triple)' }} />In Matthew, Mark &amp; Luke</span>
          <span><i style={{ background: 'var(--t-two)' }} />In Mark + one other</span>
          <span><i style={{ background: 'var(--t-double)' }} />Matthew + Luke, not Mark ("Q")</span>
          <span><i style={{ background: 'var(--mt)' }} />Only Matthew</span>
          <span><i style={{ background: 'var(--mk)' }} />Only Mark</span>
          <span><i style={{ background: 'var(--lk)' }} />Only Luke</span>
          <span><i style={{ background: 'var(--jn)' }} />Only John / ribbon to John</span>
        </div>

        <div className="stats-row">
          <div className="stat">
            <b>{s.markWordsEchoed}%</b>
            <p>of Mark's {s.words.mk.toLocaleString()} Greek words have a counterpart in Matthew's or Luke's parallel.</p>
            <DataBadge />
          </div>
          <div className="stat">
            <b>{triple}</b>
            <p>passages told by all three "Synoptic" Gospels; another {dbl} shared only by Matthew and Luke.</p>
            <DataBadge />
          </div>
          <div className="stat">
            <b>{s.minorAgreements}</b>
            <p>"minor agreements": words where Matthew and Luke agree with each other but not with Mark.</p>
            <DataBadge />
          </div>
          <div className="stat">
            <b>{jnShared}</b>
            <p>passages John shares with the others. {Math.round(100 * (s.traditionWords.jn['jn-only'] ?? 0) / s.words.jn)}% of John is his alone.</p>
            <DataBadge />
          </div>
        </div>
      </section>

      <section className="wrap section">
        <div className="section-head">
          <div>
            <div className="eyebrow">Start here</div>
            <h2>{notes.discoveries.length} things you can't see in English</h2>
          </div>
          <AIBadge label="Written by Claude Opus 5.5" />
        </div>
        <div className="disc-grid">
          {notes.discoveries.map((d, i) => (
            <a key={d.id} className="card disc-card" href={`#/p/${d.unit}?hl=${d.id}`}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span className="num">{i + 1}</span>
                <span className="eyebrow" style={{ fontSize: 11 }}>{d.kind}</span>
              </div>
              <h3>{d.title}</h3>
              <p><Rich rt={d.teaser} plain /></p>
              <div className="foot"><span className={`gchip g-${d.pin}`}><span className="gdot" />{NAME[d.pin]}</span><span>See it in Greek <Icon.arrow /></span></div>
            </a>
          ))}
        </div>
      </section>

      <section className="wrap section">
        <div className="section-head"><div><div className="eyebrow">Keep exploring</div><h2>Other ways in</h2></div></div>
        <div className="explore-grid">
          <a className="card explore-card" href="#/p/baptism"><DataBadge label="Synopsis" /><h3>Side by side</h3><p>Every parallel passage in color-coded Greek, aligned word by word, with an English gloss under every word.</p></a>
          <a className="card explore-card" href="#/read/mk/1"><DataBadge label="Reader" /><h3>Read a whole Gospel</h3><p>Read straight through with the Greek one tap away, each author's signature words lit up, and every variant flagged.</p></a>
          <a className="card explore-card" href="#/fingerprints"><DataBadge label="Statistics" /><h3>Authors' fingerprints</h3><p>The words each writer reaches for, from Mark's "immediately" to John's "world", measured across all {totalWords.toLocaleString()} words.</p></a>
          <a className="card explore-card" href="#/variants"><DataBadge label="Manuscripts" /><h3>The text behind the text</h3><p>Where the Greek behind the King James Version differs from modern critical editions, and why.</p></a>
        </div>
      </section>
    </>
  )
}
