import { useEffect, useState } from 'react'
import { Icon, useRoute } from './ui'
import Home from './pages/Home'
import Passage from './pages/Passage'
import Reader from './pages/Reader'
import Fingerprints from './pages/Fingerprints'
import VariantsPage from './pages/Variants'
import Discoveries from './pages/Discoveries'
import About from './pages/About'
import type { G } from './data'

const NAV = [
  ['', 'Map'],
  ['discoveries', 'Discoveries'],
  ['p/baptism', 'Synopsis'],
  ['read/mk/1', 'Read'],
  ['fingerprints', 'Fingerprints'],
  ['variants', 'Variants'],
  ['about', 'About'],
] as const

function ThemeToggle() {
  const [dark, setDark] = useState(() => {
    const t = document.documentElement.dataset.theme
    return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  return (
    <button className="icon-btn" aria-label="Toggle dark mode" onClick={() => {
      const next = dark ? 'light' : 'dark'
      document.documentElement.dataset.theme = next
      try { localStorage.setItem('ge-theme', next) } catch { /* private mode */ }
      setDark(!dark)
    }}>{dark ? <Icon.sun /> : <Icon.moon />}</button>
  )
}

export default function App() {
  const { parts, query } = useRoute()
  const [open, setOpen] = useState(false)
  const key = parts.join('/')
  useEffect(() => { setOpen(false); if (!query.get('hl')) window.scrollTo(0, 0) }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  let page
  switch (parts[0]) {
    case 'p': page = <Passage id={parts[1]} hl={query.get('hl')} />; break
    case 'read': page = <Reader g={(parts[1] as G) || 'mk'} ch={Number(parts[2] || 1)} v={query.get('v')} />; break
    case 'fingerprints': page = <Fingerprints />; break
    case 'variants': page = <VariantsPage />; break
    case 'discoveries': page = <Discoveries />; break
    case 'about': page = <About />; break
    default: page = <Home />
  }
  const section = parts[0] ?? ''
  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <a className="brand" href="#/">
            <span className="brand-mark" aria-hidden>
              <span style={{ width: 22, background: 'var(--mt)' }} />
              <span style={{ width: 15, background: 'var(--mk)' }} />
              <span style={{ width: 22, background: 'var(--lk)' }} />
              <span style={{ width: 18, background: 'var(--jn)' }} />
            </span>
            <span className="brand-name">Gospels Explorer</span>
          </a>
          <button className="icon-btn menu-btn" aria-label="Menu" onClick={() => setOpen(!open)}><Icon.menu /></button>
          <nav className={`nav ${open ? 'open' : ''}`}>
            {NAV.map(([href, label]) => {
              const active = href.split('/')[0] === section
              return <a key={href} href={`#/${href}`} className={active ? 'active' : ''}>{label}</a>
            })}
            <a className="nav-ext" href="https://daniel-beachy.github.io/" title="More projects by Daniel Beachy">More projects ↗</a>
          </nav>
          <ThemeToggle />
        </div>
      </header>
      <main>{page}</main>
      <footer className="footer">
        <div className="wrap">
          Greek text: SBLGNT via <a href="https://github.com/Clear-Bible/macula-greek">MACULA Greek</a> (CC BY 4.0) ·
          Variants: <a href="https://github.com/STEPBible/STEPBible-Data">STEPBible TAGNT</a>, Tyndale House (CC BY 4.0) ·
          English: Berean Standard Bible (public domain) · AI readings by Claude Opus 5.5 ·
          {' '}<a href="#/about">Method &amp; sources</a> · A project by <a href="https://daniel-beachy.github.io">Daniel Beachy</a>
        </div>
      </footer>
    </>
  )
}
