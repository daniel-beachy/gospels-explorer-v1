import { useMemo, useState } from 'react'
import type { Index } from '../data'
import type { G } from '../data'
import { ABBR, gospelsOf } from '../data'
import { Icon } from '../ui'

const ALIASES: [RegExp, G][] = [
  [/^(mt|mat|matt|matthew)$/, 'mt'], [/^(mk|mr|mar|mark)$/, 'mk'], [/^(lk|lu|luk|luke)$/, 'lk'], [/^(jn|jhn|joh|john)$/, 'jn'],
]

/** Find a passage by title or reference ("Mk 4:3", "prodigal", "Lord's prayer"). */
export default function UnitSearch({ index }: { index: Index }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return []
    const ref = s.match(/^([a-z]+)\.?\s*(\d+)(?::(\d+))?/)
    if (ref) {
      const g = ALIASES.find(([re]) => re.test(ref[1]))?.[1]
      const ch = Number(ref[2]), v = Number(ref[3] || 1)
      if (g) {
        return index.units.filter(u => u.refs[g]?.split(';').some(r => {
          const [a, b] = r.split('-')
          const [c1, v1] = a.split(':').map(Number)
          const [c2, v2] = b ? (b.includes(':') ? b.split(':').map(Number) : [c1, Number(b)]) : [c1, v1]
          const x = ch * 1000 + v
          return x >= c1 * 1000 + v1 && x <= c2 * 1000 + v2
        })).slice(0, 8)
      }
    }
    return index.units.filter(u => u.title.toLowerCase().includes(s) || u.id.includes(s.replace(/\s+/g, '-'))).slice(0, 10)
  }, [q, index])
  const go = (id: string) => { setQ(''); window.location.hash = `#/p/${id}` }
  return (
    <div className="search">
      <Icon.search />
      <input value={q} placeholder="Find a passage: “sower”, “Lk 15:11”…" aria-label="Find a passage"
        onChange={e => { setQ(e.target.value); setSel(0) }}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { setSel(Math.min(sel + 1, results.length - 1)); e.preventDefault() }
          if (e.key === 'ArrowUp') { setSel(Math.max(sel - 1, 0)); e.preventDefault() }
          if (e.key === 'Enter' && results[sel]) go(results[sel].id)
          if (e.key === 'Escape') setQ('')
        }} />
      {results.length > 0 && (
        <div className="card search-results">
          {results.map((u, i) => (
            <a key={u.id} href={`#/p/${u.id}`} className={i === sel ? 'sel' : ''} onClick={() => setQ('')}>
              <span>{u.title}</span>
              <span className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{gospelsOf(u).map(g => ABBR[g]).join(' · ')}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
