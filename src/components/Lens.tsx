import type { G, Unit } from '../data'
import { NAME } from '../data'
import { SchBadge } from '../ui'

export type LensKind = 'none' | 'two-source' | 'farrer' | 'griesbach'
export const LENS_LABEL: Record<LensKind, string> = {
  none: 'Data only',
  'two-source': 'Two-Source',
  farrer: 'Farrer',
  griesbach: 'Griesbach',
}

const NODES: Record<string, [number, number]> = { Mk: [110, 22], Mt: [40, 100], Lk: [180, 100], Q: [110, 100] }
const ARROWS: Record<Exclude<LensKind, 'none'>, [string, string][]> = {
  'two-source': [['Mk', 'Mt'], ['Mk', 'Lk'], ['Q', 'Mt'], ['Q', 'Lk']],
  farrer: [['Mk', 'Mt'], ['Mk', 'Lk'], ['Mt', 'Lk']],
  griesbach: [['Mt', 'Lk'], ['Mt', 'Mk'], ['Lk', 'Mk']],
}
const NODE_COLOR: Record<string, string> = { Mk: 'var(--mk)', Mt: 'var(--mt)', Lk: 'var(--lk)', Q: 'var(--t-double)' }

function Diagram({ lens, active }: { lens: Exclude<LensKind, 'none'>; active: Set<string> }) {
  const arrows = ARROWS[lens]
  const nodes = lens === 'two-source' ? ['Mk', 'Mt', 'Lk', 'Q'] : ['Mk', 'Mt', 'Lk']
  const pos = (n: string): [number, number] => lens === 'griesbach'
    ? ({ Mt: [40, 22], Lk: [180, 22], Mk: [110, 100] } as Record<string, [number, number]>)[n]
    : NODES[n]
  return (
    <svg width="220" height="124" viewBox="0 0 220 124" role="img" aria-label={`Diagram of the ${LENS_LABEL[lens]} hypothesis`}>
      <defs>
        <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--ink-2)" />
        </marker>
      </defs>
      {arrows.map(([a, b]) => {
        const [x1, y1] = pos(a), [x2, y2] = pos(b)
        const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy)
        const r = 19
        const on = active.has(`${a}>${b}`)
        return <line key={a + b} x1={x1 + dx / len * r} y1={y1 + dy / len * r} x2={x2 - dx / len * (r + 3)} y2={y2 - dy / len * (r + 3)}
          stroke="var(--ink-2)" strokeWidth={on ? 2.4 : 1.2} strokeDasharray={on ? '' : '3 3'} opacity={on ? 1 : 0.45} markerEnd="url(#ah)" />
      })}
      {nodes.map(n => {
        const [x, y] = pos(n)
        return (
          <g key={n}>
            <circle cx={x} cy={y} r={18} fill="var(--surface)" stroke={NODE_COLOR[n]} strokeWidth={2.5} strokeDasharray={n === 'Q' ? '4 3' : ''} />
            <text x={x} y={y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill={NODE_COLOR[n]} fontFamily="var(--sans)">{n}</text>
          </g>
        )
      })}
    </svg>
  )
}

export function LensPanel({ lens, unit, minors }: { lens: LensKind; unit: Unit; minors: number }) {
  if (lens === 'none') return null
  const t = unit.tradition
  const has = (g: G) => !!unit.refs[g]
  const syn = (['mt', 'mk', 'lk'] as G[]).filter(has)
  const other = (g: G) => NAME[g]
  const dbl = unit.pairs['mt-lk']
  const active = new Set<string>()
  let text = ''
  if (lens === 'two-source') {
    if (t === 'triple') {
      ['Mk>Mt', 'Mk>Lk'].forEach(a => active.add(a))
      text = `Mark wrote first, and Matthew and Luke each copied this passage from Mark without knowing each other. Wording they share with Mark is inherited; where they differ, they were editing. The ${minors} dashed words are "minor agreements" in which Matthew and Luke make the same change to Mark. These are the theory's chief puzzle. Proposed explanations include coincidence, overlap with Q or oral tradition, and later scribes harmonizing the Gospels.`
    } else if (t === 'double') {
      ['Q>Mt', 'Q>Lk'].forEach(a => active.add(a))
      text = `Mark lacks this, so Matthew and Luke must have had a second shared source: "Q", a lost collection of Jesus' sayings. Here ${dbl?.pctA ?? 0}% of Matthew's words align with Luke's. High verbatim agreement like this is the main argument that Q was a written Greek document and not just oral memory.`
    } else if (t === 'mt-mk' || t === 'mk-lk') {
      const taker = t === 'mt-mk' ? 'mt' : 'lk'
      active.add(`Mk>${taker === 'mt' ? 'Mt' : 'Lk'}`)
      text = `${other(taker)} took this from Mark. ${other(taker === 'mt' ? 'lk' : 'mt')} left it out, perhaps as repetitive, or because he tells a similar story elsewhere.`
    } else if (t === 'mt-only' || t === 'lk-only') {
      text = `Material found only in ${NAME[syn[0]]}. On this theory it came from ${NAME[syn[0]]}'s own sources (labeled "${t === 'mt-only' ? 'M' : 'L'}" by scholars) or from the author himself.`
    } else if (t === 'mk-only') {
      text = 'One of the very few passages in Mark that neither Matthew nor Luke reproduced. On Markan priority both chose to omit it.'
    }
  } else if (lens === 'farrer') {
    if (t === 'triple') {
      ['Mk>Mt', 'Mk>Lk', 'Mt>Lk'].forEach(a => active.add(a))
      text = `Mark wrote first. Matthew rewrote Mark, and Luke then used both. The ${minors} dashed "minor agreements" need no special explanation: they are places where Luke followed Matthew's wording instead of Mark's.`
    } else if (t === 'double') {
      active.add('Mt>Lk')
      text = `No Q is needed. Luke took this material directly from Matthew, editing and rearranging it. The ${dbl?.pctA ?? 0}% word agreement reflects Luke copying Matthew. The theory's challenge is explaining why Luke often places these sayings in very different settings from Matthew's.`
    } else if (t === 'mt-mk' || t === 'mk-lk') {
      const taker = t === 'mt-mk' ? 'Mt' : 'Lk'
      active.add(`Mk>${taker}`)
      text = `${taker === 'Mt' ? 'Matthew' : 'Luke'} took this from Mark; ${taker === 'Mt' ? 'Luke chose not to use it, despite knowing both Mark and Matthew' : 'Matthew left it out'}.`
    } else if (t !== 'jn-only') {
      text = `Material unique to ${NAME[syn[0]]}. The Farrer and Two-Source theories agree here; they differ only on where Matthew and Luke overlap.`
    }
  } else if (lens === 'griesbach') {
    if (t === 'triple') {
      ['Mt>Lk', 'Mt>Mk', 'Lk>Mk'].forEach(a => active.add(a))
      text = 'Matthew wrote first and Luke used Matthew. Mark wrote last, weaving the two together. Where all three agree, Mark is following both; where Mark matches only one, he switched sources. Most scholars reject this model, mainly because Mark would then have repeatedly made polished Greek rougher, but it has notable defenders.'
    } else if (t === 'double') {
      active.add('Mt>Lk')
      text = 'Luke took this from Matthew, and Mark, writing last, chose to leave it out. Critics ask why Mark would omit so much of Jesus\' teaching, such as the Lord\'s Prayer and the Beatitudes.'
    } else if (t === 'mt-mk') {
      active.add('Mt>Mk')
      text = 'Mark took this from Matthew. Luke had chosen not to use it.'
    } else if (t === 'mk-lk') {
      active.add('Lk>Mk')
      text = 'Mark took this from Luke. Matthew lacks it because, on this theory, Matthew wrote first.'
    } else if (t === 'mk-only') {
      text = 'Here Mark adds material found in neither of his supposed sources, which is unusual for an author who, on this theory, mostly abbreviates.'
    } else if (t !== 'jn-only') {
      text = t === 'mt-only'
        ? 'Matthew\'s own material, which both Luke and Mark chose not to use.'
        : 'Luke\'s own material, which Mark chose not to use.'
    }
  }
  const john = has('jn')
  return (
    <div className="card lens">
      <div className="row"><strong style={{ fontSize: 14 }}>{LENS_LABEL[lens]} hypothesis</strong><SchBadge /></div>
      <div className="lens-diagram"><Diagram lens={lens} active={active} /></div>
      {text && <p>{text}</p>}
      {john && <p><strong>John:</strong> theories of Synoptic relationships don't cover John. For much of the 20th century most scholars thought John wrote independently of the other three; many now argue that he knew Mark, or perhaps Luke.</p>}
    </div>
  )
}
