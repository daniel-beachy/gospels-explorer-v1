import { useEffect, useMemo, useRef, useState } from 'react'
import type { Discovery, G, Index, UnitMeta } from '../data'
import { ABBR, GOSPELS, NAME, TRADITION_HINT, gospelsOf, prettyRefs } from '../data'

type Filter = 'all' | 'synoptic' | 'double' | 'john'

const SEG_COLOR = (u: UnitMeta, g: G) => {
  if (g === 'jn') return u.tradition === 'jn-only' ? 'var(--jn)' : 'var(--t-triple)'
  switch (u.tradition) {
    case 'triple': return 'var(--t-triple)'
    case 'double': return 'var(--t-double)'
    case 'mt-mk': case 'mk-lk': return 'var(--t-two)'
    default: return `var(--${g})`
  }
}
const RIBBON_COLOR = (u: UnitMeta, toJohn: boolean) => {
  if (toJohn) return 'var(--t-jn)'
  return u.tradition === 'double' ? 'var(--t-double)' : u.tradition === 'triple' ? 'var(--t-triple)' : 'var(--t-two)'
}

interface Props {
  index: Index
  discoveries: Discovery[]
  filter: Filter
}

export default function GospelMap({ index, discoveries, filter }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(1100)
  const [hover, setHover] = useState<{ u: UnitMeta; x: number; y: number } | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const vertical = width < 640
  const units = useMemo(() => Object.fromEntries(index.units.map(u => [u.id, u])), [index])

  // geometry --------------------------------------------------------------
  const labelW = vertical ? 0 : 96
  const padEnd = vertical ? 10 : 16
  const bandT = vertical ? 22 : 24
  const gap = vertical ? Math.max(48, (width - 4 * bandT) / 3.3) : 84
  const across0 = vertical ? 30 : 40
  const alongLen = vertical ? 1500 : width - labelW - padEnd
  const maxWords = Math.max(...GOSPELS.map(g => index.stats.words[g]))
  const k = alongLen / maxWords
  const bandPos = (gi: number) => across0 + gi * (bandT + gap)
  const totalAcross = bandPos(3) + bandT + 30
  const W = vertical ? width : width
  const H = vertical ? alongLen + 60 : totalAcross
  // P(along, across) -> "x,y"
  const P = (a: number, c: number) => vertical
    ? `${(c + (width - (bandPos(3) + bandT - across0)) / 2 - across0).toFixed(1)},${(a + 40).toFixed(1)}`
    : `${(a + labelW).toFixed(1)},${c.toFixed(1)}`
  const XY = (a: number, c: number) => P(a, c).split(',').map(Number) as [number, number]

  const layout = useMemo(() => {
    const segs: Record<G, { u: string; a0: number; a1: number }[]> = { mt: [], mk: [], lk: [], jn: [] }
    for (const g of GOSPELS) {
      let off = 0
      for (const s of index.segments[g]) {
        segs[g].push({ u: s.u, a0: off * k, a1: (off + s.n) * k })
        off += s.n
      }
    }
    return segs
  }, [index, k])

  const ribbons = useMemo(() => {
    const out: { u: UnitMeta; d: string; color: string; kind: Filter; delay: number }[] = []
    const byUnit: Record<string, Partial<Record<G, { a0: number; a1: number }[]>>> = {}
    for (const g of GOSPELS) for (const s of layout[g]) ((byUnit[s.u] ??= {})[g] ??= []).push(s)
    for (const u of index.units) {
      const gs = gospelsOf(u)
      const syn = gs.filter(g => g !== 'jn')
      const pairs: [G, G][] = []
      for (let i = 0; i + 1 < syn.length; i++) pairs.push([syn[i], syn[i + 1]])
      if (u.jn && syn.length) pairs.push([syn[syn.length - 1], 'jn'])
      for (const [ga, gb] of pairs) {
        const toJohn = gb === 'jn'
        const kind: Filter = toJohn ? 'john' : u.tradition === 'double' ? 'double' : 'synoptic'
        for (const sa of byUnit[u.id][ga] ?? []) for (const sb of byUnit[u.id][gb] ?? []) {
          const ia = GOSPELS.indexOf(ga), ib = GOSPELS.indexOf(gb)
          const ca = bandPos(ia) + bandT, cb = bandPos(ib)
          const cm = (ca + cb) / 2
          const d = `M${P(sa.a0, ca)} C${P(sa.a0, cm)} ${P(sb.a0, cm)} ${P(sb.a0, cb)} L${P(sb.a1, cb)} C${P(sb.a1, cm)} ${P(sa.a1, cm)} ${P(sa.a1, ca)} Z`
          out.push({ u, d, color: RIBBON_COLOR(u, toJohn), kind, delay: (sa.a0 / alongLen) * 0.9 })
        }
      }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, index, width])

  const pins = useMemo(() => discoveries.map((d, i) => {
    const s = layout[d.pin].find(s => s.u === d.unit)
    if (!s) return null
    const gi = GOSPELS.indexOf(d.pin)
    const [x, y] = XY((s.a0 + s.a1) / 2, bandPos(gi) + bandT / 2)
    return { d, i, x, y, gi }
  }).filter(Boolean).sort((a, b) => a!.gi - b!.gi || (vertical ? a!.y - b!.y : a!.x - b!.x)).map((p, k, all) => {
    // keep pins on the same band from overlapping: nudge along the band
    const prev = all[k - 1]
    if (prev && prev.gi === p!.gi) {
      if (!vertical && p!.x - prev.x < 24) p!.x = prev.x + 24
      if (vertical && p!.y - prev.y < 24) p!.y = prev.y + 24
    }
    return p
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }) as { d: Discovery; i: number; x: number; y: number; gi: number }[], [discoveries, layout, width])

  const hl = hover?.u.id
  const showRibbon = (kind: Filter) => filter === 'all' || filter === kind

  function onMove(e: React.MouseEvent, u: UnitMeta) {
    const r = ref.current!.getBoundingClientRect()
    setHover({ u, x: e.clientX - r.left, y: e.clientY - r.top })
  }
  const go = (id: string) => { window.location.hash = `#/p/${id}` }

  return (
    <div className="map-shell" ref={ref} onMouseLeave={() => setHover(null)}>
      <svg className={`map-svg ${hl ? 'hovering' : ''}`} viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img"
        aria-label="Map of the four Gospels: each bar is a Gospel divided into passages; ribbons connect parallel passages.">
        <g>
          {ribbons.map((r, i) => showRibbon(r.kind) && (
            <path key={i} className={`ribbon ${hl === r.u.id ? 'hl' : ''}`} d={r.d} fill={r.color}
              style={{ opacity: (r.kind === 'john' ? 0.42 : 0.3) * (vertical ? 1.6 : 1), animationDelay: `${r.delay}s` }}
              onMouseMove={e => onMove(e, r.u)} onClick={() => go(r.u.id)} />
          ))}
        </g>
        {GOSPELS.map((g, gi) => {
          const c = bandPos(gi)
          const [lx, ly] = XY(0, c + bandT / 2)
          return (
            <g key={g}>
              {vertical
                ? <text className="band-label" x={XY(0, c + bandT / 2)[0]} y={22} textAnchor="middle" fill={`var(--${g})`}>{ABBR[g]}</text>
                : <text className="band-label" x={lx - 12} y={ly + 5} textAnchor="end" fill={`var(--${g})`}>{NAME[g]}</text>}
              {layout[g].map((s, i) => {
                const u = units[s.u]
                const [x0, y0] = XY(s.a0, c)
                const [x1, y1] = XY(s.a1, c + bandT)
                return (
                  <rect key={i} className={`seg-rect ${hl === s.u ? 'hl' : ''}`} x={Math.min(x0, x1)} y={Math.min(y0, y1)}
                    width={Math.max(0.6, Math.abs(x1 - x0) - 0.6)} height={Math.max(0.6, Math.abs(y1 - y0) - (vertical ? 0.6 : 0))}
                    rx={1.5} fill={SEG_COLOR(u, g)} onMouseMove={e => onMove(e, u)} onClick={() => go(u.id)} />
                )
              })}
              {index.chapters[g].map((off, ci) => {
                const step = vertical ? 4 : width < 1000 ? 4 : 2
                if (ci % step !== 0 && ci !== 0) return null
                const [tx, ty] = XY(off * k, vertical ? c - 3 : c + bandT + 11)
                return <text key={ci} className="ch-tick" x={vertical ? tx - 3 : tx} y={vertical ? ty + 3 : ty} textAnchor={vertical ? 'end' : 'start'}>{ci + 1}</text>
              })}
            </g>
          )
        })}
        {pins.map(({ d, i, x, y }) => (
          <a key={d.id} className="pin" href={`#/p/${d.unit}?hl=${d.id}`} onMouseMove={e => onMove(e, units[d.unit])}>
            <circle className="pin-pulse" cx={x} cy={y} r={11} fill="var(--ink)" style={{ animationDelay: `${i * 0.25}s` }} />
            <circle className="pin-dot" cx={x} cy={y} r={10} fill="var(--ink)" stroke="var(--bg)" strokeWidth={2} />
            <text x={x} y={y + 4} textAnchor="middle">{i + 1}</text>
          </a>
        ))}
      </svg>
      {hover && <MapTip u={hover.u} x={hover.x} y={hover.y} width={width} />}
    </div>
  )
}

function MapTip({ u, x, y, width }: { u: UnitMeta; x: number; y: number; width: number }) {
  const gs = gospelsOf(u)
  const left = Math.min(Math.max(8, x + 16), width - 280)
  const syn = gs.filter(g => g !== 'jn')
  const pairKey = syn.length >= 2 ? `${syn[0]}-${syn[1]}` : null
  const pair = pairKey ? u.pairs[pairKey] : null
  return (
    <div className="map-tip" style={{ left, top: y + 18 }}>
      <h4>{u.title}</h4>
      <div className="muted" style={{ fontSize: 12 }}>{TRADITION_HINT[u.tradition]}{u.jn && u.tradition !== 'jn-only' ? '; also in John' : ''}</div>
      <div className="refs">
        {gs.map(g => <span key={g} className={`gchip g-${g}`}><span className="gdot" />{NAME[g]} {prettyRefs(u.refs[g]!)}</span>)}
      </div>
      {pair && (
        <div style={{ fontSize: 12 }}>
          {pair.pctA}% of {NAME[syn[0]]}'s words have a counterpart in {NAME[syn[1]]}
          <div className="bar"><i style={{ width: `${pair.pctA}%` }} /></div>
        </div>
      )}
      <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>Click to compare the Greek →</div>
    </div>
  )
}
