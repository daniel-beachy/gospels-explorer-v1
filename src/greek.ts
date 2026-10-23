// Greek helpers: transliteration (SBL-style) and morphology-code decoding.

const BASE: Record<string, string> = {
  α: 'a', β: 'b', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'ē', θ: 'th', ι: 'i', κ: 'k', λ: 'l', μ: 'm',
  ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'ph', χ: 'ch', ψ: 'ps', ω: 'ō',
}
const VOWELS = 'αεηιουω'

/** Transliterate polytonic Greek into SBL-style Latin letters. */
export function translit(word: string): string {
  const letters: { ch: string; rough: boolean; upper: boolean }[] = []
  for (const c of word.normalize('NFD')) {
    if (c === '\u0314') { if (letters.length) letters[letters.length - 1].rough = true; continue }
    if (/\p{M}/u.test(c)) continue
    const lower = c.toLowerCase()
    if (BASE[lower] === undefined) continue
    letters.push({ ch: lower, rough: false, upper: c !== lower })
  }
  let out = ''
  letters.forEach(({ ch }, i) => {
    const next = letters[i + 1]?.ch
    if (ch === 'γ' && next && 'γκξχ'.includes(next)) out += 'n'
    else if (ch === 'υ' && i > 0 && 'αεηο'.includes(letters[i - 1].ch)) out += 'u'
    else if (ch === 'ρ' && i === 0) out += 'rh'
    else out += BASE[ch]
  })
  const initialRough = letters.length > 0 && VOWELS.includes(letters[0].ch) &&
    (letters[0].rough || (letters.length > 1 && VOWELS.includes(letters[1].ch) && letters[1].rough))
  if (initialRough) out = 'h' + out
  if (letters[0]?.upper) out = out.charAt(0).toUpperCase() + out.slice(1)
  return out
}

/** Strip accents/breathings and lowercase, for matching. */
export function plain(word: string) {
  return word.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

const POS: Record<string, string> = {
  N: 'noun', V: 'verb', T: 'article', CONJ: 'conjunction', P: 'personal pronoun', PREP: 'preposition',
  A: 'adjective', ADV: 'adverb', PRT: 'particle', D: 'demonstrative pronoun', R: 'relative pronoun',
  COND: 'conditional', I: 'interrogative pronoun', X: 'indefinite pronoun', F: 'reflexive pronoun',
  HEB: 'Hebrew word', ARAM: 'Aramaic word', S: 'possessive pronoun', K: 'correlative pronoun',
  INJ: 'interjection', C: 'reciprocal pronoun', Q: 'correlative pronoun', ARAM_: '',
}
const TENSE: Record<string, string> = { P: 'present', I: 'imperfect', F: 'future', A: 'aorist', R: 'perfect', L: 'pluperfect' }
const VOICE: Record<string, string> = {
  A: 'active', M: 'middle', P: 'passive', E: 'middle or passive', D: 'middle (deponent)',
  O: 'passive (deponent)', N: 'middle/passive (deponent)', Q: 'impersonal active', X: 'no voice',
}
const MOOD: Record<string, string> = {
  I: 'indicative', S: 'subjunctive', O: 'optative', M: 'imperative', N: 'infinitive', P: 'participle',
}
const CASE: Record<string, string> = { N: 'nominative', G: 'genitive', D: 'dative', A: 'accusative', V: 'vocative' }
const NUM: Record<string, string> = { S: 'singular', P: 'plural' }
const GEN: Record<string, string> = { M: 'masculine', F: 'feminine', N: 'neuter' }
const PERSON: Record<string, string> = { '1': '1st person', '2': '2nd person', '3': '3rd person' }

function cng(s: string) {
  const out: string[] = []
  for (const ch of s) {
    if (PERSON[ch]) out.push(PERSON[ch])
    else if (CASE[ch] && out.length === 0) out.push(CASE[ch])
    else if (NUM[ch]) out.push(NUM[ch])
    else if (GEN[ch]) out.push(GEN[ch])
    else if (CASE[ch]) out.push(CASE[ch])
  }
  return out
}

/** Decode a Robinson-style morphology code, e.g. V-AAI-3S → "verb · aorist active indicative · 3rd person singular". */
export function decodeMorph(code: string): string {
  if (!code) return ''
  const parts = code.split('-')
  const pos = POS[parts[0]] ?? parts[0]
  if (parts[0] === 'V' && parts[1]) {
    let tvm = parts[1]
    let second = ''
    if (tvm.startsWith('2')) { second = '2nd '; tvm = tvm.slice(1) }
    const t = TENSE[tvm[0]] ?? ''
    const v = VOICE[tvm[1]] ?? ''
    const m = MOOD[tvm[2]] ?? ''
    const rest = parts[2] ? cng(parts[2]).join(' ') : ''
    return ['verb', `${second}${t} ${v} ${m}`.trim(), rest].filter(Boolean).join(' · ')
  }
  const rest = parts.slice(1).map(p => cng(p).join(' ')).filter(Boolean)
  return [pos, ...rest].join(' · ')
}
