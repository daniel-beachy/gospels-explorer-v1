import { Fragment, useEffect, useState, type ReactNode } from 'react'
import type { Cite, G, RichText } from './data'
import { ABBR } from './data'

// ---------- routing (hash based, works on GitHub Pages) ----------
export function useRoute() {
  const [hash, setHash] = useState(() => window.location.hash || '#/')
  useEffect(() => {
    const on = () => setHash(window.location.hash || '#/')
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const [path, query = ''] = hash.slice(1).split('?')
  return { parts: path.split('/').filter(Boolean), query: new URLSearchParams(query) }
}

export function usePromise<T>(fn: () => Promise<T>, deps: unknown[]): T | undefined {
  const [v, setV] = useState<T>()
  useEffect(() => {
    let live = true
    setV(undefined)
    fn().then(x => { if (live) setV(x) }).catch(e => console.error(e))
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return v
}

// ---------- icons ----------
export const Icon = {
  data: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><ellipse cx="8" cy="3.5" rx="5.5" ry="2"/><path d="M2.5 3.5v9c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-9M2.5 8c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2"/></svg>
  ),
  ai: () => (
    <svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0.8l1.6 4.1 4.1 1.6-4.1 1.6L8 12.2 6.4 8.1 2.3 6.5l4.1-1.6z"/><path d="M13 10.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/></svg>
  ),
  book: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 2.5h4.5A1.5 1.5 0 018 4v10a1.5 1.5 0 00-1.5-1.5H2zM14 2.5H9.5A1.5 1.5 0 008 4v10a1.5 1.5 0 011.5-1.5H14z"/></svg>
  ),
  search: () => (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="7" cy="7" r="4.8"/><path d="M10.6 10.6L14 14"/></svg>
  ),
  arrow: () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
  ),
  sun: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="8" r="3"/><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1 1M12 12l1 1M3 13l1-1M12 4l1-1"/></svg>
  ),
  moon: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.5 10.2A6 6 0 015.8 2.5a6 6 0 107.7 7.7z"/></svg>
  ),
  menu: () => (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 4h12M2 8h12M2 12h12"/></svg>
  ),
}

// ---------- provenance badges ----------
export function DataBadge({ label = 'From the data' }: { label?: string }) {
  return <span className="badge badge-data" title="Computed directly from the open source datasets (see About)"><Icon.data />{label}</span>
}
export function AIBadge({ label = 'AI reading' }: { label?: string }) {
  return <span className="badge badge-ai" title="Written by Claude Opus 5.5. Interpretive, not source data"><Icon.ai />{label}</span>
}
export function SchBadge({ label = 'Scholarship' }: { label?: string }) {
  return <span className="badge badge-sch" title="Summary of standard, widely held scholarship (see About for sources)"><Icon.book />{label}</span>
}

// ---------- rich text with cite chips ----------
function inline(s: string, key: string): ReactNode[] {
  // **bold** and *italic*
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g
  let last = 0, m: RegExpExecArray | null, i = 0
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index))
    const t = m[0]
    out.push(t.startsWith('**') ? <strong key={`${key}b${i++}`}>{t.slice(2, -2)}</strong> : <em key={`${key}i${i++}`}>{t.slice(1, -1)}</em>)
    last = m.index + t.length
  }
  if (last < s.length) out.push(s.slice(last))
  return out
}

/** Renders AI text with its verified Greek citations. Without onCite, a citation opens the reader at that verse;
 *  `plain` renders citations as text (for use inside links). */
export function Rich({ rt, onCite, plain }: { rt: RichText; onCite?: (c: Cite) => void; plain?: boolean }) {
  const pieces = rt.text.split(/⟦(\d+)⟧/)
  return (
    <>
      {pieces.map((p, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{inline(p, `p${i}`)}</Fragment>
        const c = rt.cites[Number(p)]
        if (!c) return null
        if (plain) return <span key={i} className="cite">{c.words}<sup>{ABBR[c.g]} {c.ref}</sup></span>
        const go = onCite ?? ((x: Cite) => { const [ch, v] = x.ref.split(/[:\-–]/); location.hash = `#/read/${x.g}/${ch}?v=${v}` })
        return (
          <button key={i} className="cite" onClick={() => go(c)} title={`${ABBR[c.g]} ${c.ref}: show these words`}>
            {c.words}<sup>{ABBR[c.g]} {c.ref}</sup>
          </button>
        )
      })}
    </>
  )
}

export function GChip({ g, children }: { g: G; children?: ReactNode }) {
  return <span className={`gchip g-${g}`}><span className="gdot" />{children}</span>
}
