import { GOSPELS, NAME, ABBR, loadVariants } from '../data'
import type { G } from '../data'
import { DataBadge, SchBadge, usePromise } from '../ui'

interface Item { g: G; ref: string; v: string; title: string; kind: string; body: string }

/** Standard text-critical summaries (cf. Metzger, Textual Commentary; NA28 apparatus). */
const ITEMS: Item[] = [
  { g: 'mk', ref: '16:9–20', v: '16:9', kind: 'Ending', title: 'The longer ending of Mark',
    body: 'The two oldest complete Bibles, Codex Sinaiticus and Codex Vaticanus (4th century), end Mark at 16:8, with the women fleeing the tomb in fear. Early church writers Eusebius and Jerome said most manuscripts they knew ended there too. Twelve more verses, with resurrection appearances, snake-handling and the Ascension, appear in most later manuscripts; a few others carry a short alternative ending, and some carry both. Modern editions print 16:9–20 in double brackets.' },
  { g: 'jn', ref: '7:53–8:11', v: '7:53', kind: 'Added story', title: 'The woman caught in adultery',
    body: 'The story is missing from the earliest Greek manuscripts of John, including the papyri P66 and P75 and Codices Sinaiticus and Vaticanus. Where it does appear, it moves around: most often here, but in some manuscripts after John 7:36 or 21:25, and in one group after Luke 21:38. Many scholars think it is an old, possibly authentic story that found a home in John later.' },
  { g: 'lk', ref: '22:43–44', v: '22:43', kind: 'Added verses', title: 'Sweat like drops of blood',
    body: 'An angel strengthens Jesus in Gethsemane and his sweat becomes "like drops of blood". The verses are absent from P75 and Codex Vaticanus, among others, but present in Sinaiticus (where a corrector marked them) and quoted by second-century writers. Scholars are genuinely divided over whether a scribe added them or removed them.' },
  { g: 'lk', ref: '23:34a', v: '23:34', kind: 'Added saying', title: '"Father, forgive them"',
    body: 'One of the best-loved sayings from the cross is missing from P75, Codex Vaticanus and several other early witnesses. Some scholars think it was added; others argue that a scribe removed it because it seemed too forgiving of those who crucified Jesus. SBLGNT prints it in double brackets.' },
  { g: 'mt', ref: '6:13', v: '6:13', kind: 'Added words', title: '"For thine is the kingdom…"',
    body: 'The familiar close of the Lord\'s Prayer is absent from the oldest manuscripts of Matthew (Sinaiticus, Vaticanus, Bezae) and from Luke\'s version altogether. A similar doxology appears in the Didache, an early church manual, which suggests it entered the Gospel from worship.' },
  { g: 'mk', ref: '1:41', v: '1:41', kind: 'One word', title: 'Compassion or anger?',
    body: 'Nearly all manuscripts say Jesus was "moved with compassion" (σπλαγχνισθείς, splanchnistheis) when the leper approached. Codex Bezae and some Old Latin manuscripts say he was "angered" (ὀργισθείς, orgistheis). Because a scribe is more likely to soften anger than to invent it, several scholars, and the SBL Greek New Testament used on this site, prefer "angered". NA28 keeps "compassion".' },
  { g: 'jn', ref: '1:18', v: '1:18', kind: 'One word', title: '"The only God" or "the only Son"?',
    body: 'The earliest papyri (P66, P75) and the great 4th-century codices read μονογενὴς θεός, "the one and only God". Most later manuscripts read ὁ μονογενὴς υἱός, "the only Son", which matches John 3:16 and 3:18. Modern critical editions print "God".' },
  { g: 'mt', ref: '24:36', v: '24:36', kind: 'Missing words', title: '"Nor the Son"',
    body: 'No one knows the day or hour, "not even the angels of heaven, nor the Son". The words "nor the Son" stand in Sinaiticus, Vaticanus and Bezae but are missing from most later manuscripts, probably because scribes found them theologically awkward. Mark 13:32 has them without dispute.' },
  { g: 'mk', ref: '1:1', v: '1:1', kind: 'Missing words', title: '"Son of God" in Mark\'s first line',
    body: 'Codex Sinaiticus as first written, and some early church writers, lack "Son of God" in Mark\'s opening line. The phrase could have been added as a fitting title, or dropped by an easy slip of the eye over a run of similar abbreviated words. NA28 prints it in single brackets.' },
  { g: 'lk', ref: '2:14', v: '2:14', kind: 'One letter', title: '"Good will toward men"',
    body: 'The KJV\'s "on earth peace, good will toward men" follows εὐδοκία. The older manuscripts read εὐδοκίας, adding a single letter, ς, which makes it "peace among people of [God\'s] good pleasure". One letter changes a general blessing into peace for those God favors.' },
  { g: 'jn', ref: '5:3b–4', v: '5:4', kind: 'Added verse', title: 'The angel who stirred the water',
    body: 'In later manuscripts an angel periodically stirs the pool of Bethesda, and the first person into the water is healed. The explanation is absent from P66, P75, Sinaiticus and Vaticanus, and modern Bibles skip verse 4 or footnote it.' },
  { g: 'mt', ref: '17:21; 18:11; 23:14', v: '17:21', kind: 'Missing verses', title: 'Why modern Bibles skip verse numbers',
    body: 'Verse numbers were added in the 1550s, based on the Greek text of the time. When older manuscripts turned up without certain verses, editors dropped the verses but kept the numbering. Most such verses match a parallel in another Gospel (Matthew 18:11 echoes Luke 19:10), a sign that scribes harmonized the Gospels.' },
]

export default function VariantsPage() {
  const vars = usePromise(loadVariants, [])
  const counts = vars && Object.fromEntries(GOSPELS.map(g => [g, Object.values(vars[g]).filter(ws => ws.some(w => w[2] !== w[3])).length])) as Record<G, number>
  const omitted = vars && GOSPELS.reduce((n, g) => n + Object.values(vars[g]).filter(ws => ws.every(w => !w[2] || w[4])).length, 0)
  return (
    <div className="wrap" style={{ paddingBottom: 60 }}>
      <section className="hero" style={{ paddingBottom: 20 }}>
        <div className="eyebrow">The text behind the text</div>
        <h1 style={{ marginTop: 14 }}>No two manuscripts <em>agree exactly.</em></h1>
        <p className="lede">
          We have no original copy of any Gospel, only thousands of hand-made copies, and they differ. The King James
          Version (1611) was translated from a Greek text based on a handful of late manuscripts, the "Textus Receptus".
          Most modern Bibles use a critical text reconstructed from far older witnesses. Most differences are spelling or word
          order. A few change the meaning.
        </p>
      </section>
      {counts && (
        <div className="stats-row" style={{ marginTop: 0, marginBottom: 40 }}>
          {GOSPELS.map(g => (
            <div className="stat" key={g}>
              <b style={{ color: `var(--${g})` }}>{counts[g]}</b>
              <p>verses of {NAME[g]} where the modern critical text and the KJV's Greek differ in at least one word.</p>
              <DataBadge label="STEPBible TAGNT" />
            </div>
          ))}
        </div>
      )}
      <div className="section-head">
        <div><div className="eyebrow">The ones that matter</div><h2>{ITEMS.length} variants worth knowing</h2></div>
        <SchBadge label="Standard text-critical summaries" />
      </div>
      <p className="muted" style={{ maxWidth: 720, marginTop: -6 }}>
        These summaries follow mainstream text-critical scholarship (e.g. Metzger's <i>Textual Commentary</i> and the NA28 apparatus).
        Open any one in the reader to compare both Greek texts word by word.{omitted ? ` The data also contains ${omitted} verses that modern editions omit or double-bracket.` : ''}
      </p>
      <div style={{ display: 'grid', gap: 14 }}>
        {ITEMS.map(it => (
          <article className="card var-item" key={it.title}>
            <div className="meta">
              <span className={`gchip g-${it.g}`}><span className="gdot" />{ABBR[it.g]} {it.ref}</span>
              <span className="eyebrow" style={{ fontSize: 11 }}>{it.kind}</span>
            </div>
            <h3>{it.title}</h3>
            <p>{it.body}</p>
            <div><a className="pill" href={`#/read/${it.g}/${it.v.split(':')[0]}?v=${it.v.split(':')[1]}`}>Compare the Greek →</a></div>
          </article>
        ))}
      </div>
    </div>
  )
}
