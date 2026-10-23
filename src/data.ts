export type G = 'mt' | 'mk' | 'lk' | 'jn'
export const GOSPELS: G[] = ['mt', 'mk', 'lk', 'jn']
export const NAME: Record<G, string> = { mt: 'Matthew', mk: 'Mark', lk: 'Luke', jn: 'John' }
export const ABBR: Record<G, string> = { mt: 'Mt', mk: 'Mk', lk: 'Lk', jn: 'Jn' }

/** [surface, punctuation after, lemma, gloss, morph, class, strong, louw-nida, verse, doubtful(1 = inside [[double brackets]])] */
export type Token = [string, string, string, string, string, string, string, string, string, number]
/** other gospel -> [token index in that gospel's sequence, level 3=exact 2=lemma 1=synonym] */
export type Align = Partial<Record<G, [number, number]>>

export type Tradition = 'triple' | 'double' | 'mt-mk' | 'mk-lk' | 'mt-only' | 'mk-only' | 'lk-only' | 'jn-only'

export interface PairStat { pctA: number; pctB: number; run: number; exact?: number; lemma?: number; runText?: string }

export interface UnitMeta {
  id: string
  title: string
  section: string
  refs: Partial<Record<G, string>>
  tradition: Tradition
  jn: boolean
  words: Partial<Record<G, number>>
  pairs: Record<string, PairStat>
  minor: number
  variants: number
}

export interface Segment { u: string; start: string; end: string; n: number }

export interface Index {
  units: UnitMeta[]
  segments: Record<G, Segment[]>
  chapters: Record<G, number[]>
  stats: {
    words: Record<G, number>
    markReuse: { mt: number; lk: number }
    markWordsEchoed: number
    traditionWords: Record<G, Record<string, number>>
    pairTotals: Record<string, Record<string, number>>
    minorAgreements: number
  }
}

export interface Minor { mt: number; lk: number; l: number; word: string; gloss: string; content: number; sig: number }

export interface Unit {
  id: string
  title: string
  section: string
  refs: Partial<Record<G, string>>
  tradition: Tradition
  text: Partial<Record<G, { tokens: Token[]; align: Align[]; verses: string[]; en: Record<string, string> }>>
  pairs: Record<string, PairStat>
  minor: Minor[]
}

export interface Verse { r: string; u: string; en: string; w: Token[]; var: number }

/** [greek, english, inNA, inTR, doubleBracketed, significant, note] */
export type VarWord = [string, string, number, number, number, number, string]
export type Variants = Record<G, Record<string, VarWord[]>>

export interface Fingerprint {
  lemma: string; z: number; count: number; per1000: number; gloss: string
  others: Partial<Record<G, number>>
}

/** A rendered note: text with ⟦n⟧ placeholders + resolved cites. */
export interface Cite { g: G; ref: string; words: string; tokens: number[] }
export interface RichText { text: string; cites: Cite[] }
export interface Note {
  id: string
  note: RichText
  deep: null | { lede: RichText; sections: { heading: string; body: RichText }[] }
}
export interface Discovery {
  id: string
  title: string
  teaser: RichText
  body: RichText
  unit: string
  pin: G
  kind: string
  link?: string
}
export interface NotesFile { notes: Record<string, Note>; discoveries: Discovery[]; gospels: Record<G, RichText> }

const cache = new Map<string, Promise<unknown>>()
function load<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    cache.set(path, fetch(`./data/${path}`).then(r => {
      if (!r.ok) throw new Error(`Failed to load ${path}`)
      return r.json()
    }))
  }
  return cache.get(path) as Promise<T>
}

export const loadIndex = () => load<Index>('index.json')
export const loadUnit = (id: string) => load<Unit>(`units/${id}.json`)
export const loadGospel = (g: G) => load<Verse[]>(`gospels/${g}.json`)
export const loadVariants = () => load<Variants>('variants.json')
export const loadFingerprints = () => load<Record<G, Fingerprint[]>>('fingerprints.json')
export const loadNotes = () => load<NotesFile>('notes.json')

export const TRADITION_LABEL: Record<Tradition, string> = {
  triple: 'Triple tradition',
  double: 'Double tradition',
  'mt-mk': 'Matthew & Mark',
  'mk-lk': 'Mark & Luke',
  'mt-only': 'Only in Matthew',
  'mk-only': 'Only in Mark',
  'lk-only': 'Only in Luke',
  'jn-only': 'Only in John',
}
export const TRADITION_HINT: Record<Tradition, string> = {
  triple: 'Told by Matthew, Mark and Luke',
  double: 'Shared by Matthew and Luke but absent from Mark: the so-called "Q" material',
  'mt-mk': 'Shared by Matthew and Mark only',
  'mk-lk': 'Shared by Mark and Luke only',
  'mt-only': 'Material found only in Matthew (scholars call it "M")',
  'mk-only': 'One of the very few passages found only in Mark',
  'lk-only': 'Material found only in Luke (scholars call it "L")',
  'jn-only': 'Material found only in John',
}

export const SECTION_LABEL: Record<string, string> = {
  beginnings: 'Beginnings',
  john: "John's signs & discourses",
  galilee: 'Ministry in Galilee',
  sermon: 'The great sermon',
  parables: 'Parables',
  turning: 'The turning point',
  journey: 'The journey to Jerusalem',
  jerusalem: 'In Jerusalem',
  discourse: 'Last things',
  passion: 'The Passion',
  resurrection: 'Resurrection',
}

export function cmpRef(a: string, b: string) {
  const [c1, v1] = a.split(':').map(Number)
  const [c2, v2] = b.split(':').map(Number)
  return c1 - c2 || v1 - v2
}

export function gospelsOf(u: { refs: Partial<Record<G, string>> }): G[] {
  return GOSPELS.filter(g => u.refs[g])
}

export function prettyRefs(refs: string) {
  return refs.replace(/;/g, '; ').replace(/-/g, '–')
}
