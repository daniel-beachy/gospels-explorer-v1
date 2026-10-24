import { loadIndex } from '../data'
import { AIBadge, DataBadge, SchBadge, usePromise } from '../ui'

export default function About() {
  const index = usePromise(loadIndex, [])
  const s = index?.stats
  return (
    <div className="wrap" style={{ maxWidth: 820, paddingBottom: 70 }}>
      <section className="hero" style={{ paddingBottom: 10 }}>
        <div className="eyebrow">About</div>
        <h1 style={{ marginTop: 14 }}>How this was made, and <em>what to trust.</em></h1>
      </section>
      <div className="prose">
        <p>
          Gospels Explorer lays the four Gospels side by side in Greek, aligned word by word, so readers without Greek
          can see what scholars see: where Matthew and Luke copy Mark exactly, where they quietly change him, what only
          one Gospel tells, and how differently John tells the story. Everything on the site carries one of three labels:
        </p>
        <table>
          <tbody>
            <tr><td style={{ width: 150 }}><DataBadge /></td><td>Computed by code directly from the Greek text: alignments, colors, percentages, word counts, minor agreements, signature words, variant flags. Deterministic and reproducible from the build scripts.</td></tr>
            <tr><td><SchBadge /></td><td>Standard summaries of mainstream scholarship, written to reflect the consensus (or the debate, where there is one): the source-theory lenses and the major textual variants. This is the mainstream academic view, which is not the same as settled fact.</td></tr>
            <tr><td><AIBadge label="AI" /></td><td>Interpretation written by Claude Opus 5.5, an AI model: the passage notes, deep readings, discoveries and Gospel portraits. Always shown on an indigo background.</td></tr>
          </tbody>
        </table>

        <h2>What this site is for, and what it isn't</h2>
        <p>
          Gospels Explorer is a tool for examining the Greek texts and how the four Gospels relate to each other.
          It is not an argument about whether their story is true. The data layer shows what the texts say and how
          they overlap. The interpretive layers report how scholars read them.
        </p>
        <p>
          "Scholarly consensus" means what most academic specialists currently think. It is a description of the
          field, not a verdict on history or faith. Consensus has changed before, and many careful scholars dissent
          from it. Where an interpretation depends on historical-critical assumptions (for example, that an evangelist
          adapted a story rather than recording a separate event), the site tries to name the traditional reading as
          well. Readers of any conviction, or none, should be able to use it.
        </p>

        <h2>The data</h2>
        <ul>
          <li><b>Greek text:</b> the SBL Greek New Testament (SBLGNT), with lemmas, parsing, English glosses and Louw–Nida semantic domains from <a href="https://github.com/Clear-Bible/macula-greek">MACULA Greek</a> by Clear Bible (CC BY 4.0).</li>
          <li><b>Textual variants:</b> <a href="https://github.com/STEPBible/STEPBible-Data">STEPBible TAGNT</a> by Tyndale House, Cambridge (CC BY 4.0), which marks each word as found in the modern critical text (NA28), in the Textus Receptus behind the KJV, or both. Only derived data is published here.</li>
          <li><b>English:</b> the <a href="https://berean.bible">Berean Standard Bible</a>, which is in the public domain.</li>
          <li><b>Parallels:</b> {index ? index.units.length : 228} passages, assembled for this project following the standard synopsis order of Kurt Aland's <i>Synopsis Quattuor Evangeliorum</i> and the ancient Eusebian canon tables. Every verse of the four Gospels belongs to exactly one passage. Where a saying appears in two different places (a "doublet"), it is grouped with its closest parallel.</li>
        </ul>

        <h2>How words are aligned</h2>
        <p>
          For each pair of parallel texts, the build finds the best word-by-word match while respecting word order
          (a weighted longest-common-subsequence). An identical Greek form scores highest. The same dictionary word
          in a different form (a different tense or case, say) scores lower, and a near-synonym in the same Louw–Nida
          domain scores lower still. Small words like "and" and "the" count for little and only show up when they sit in a run.
          A second pass catches phrases an author moved, and a third catches small local reorderings. In the synopsis:
        </p>
        <ul>
          <li><span className="tok a-exact" style={{ ['--hc' as string]: 'var(--t-triple)' }}>solid</span> the identical word in the parallel</li>
          <li><span className="tok a-lemma" style={{ ['--hc' as string]: 'var(--t-triple)' }}>lighter</span> the same word in a different form</li>
          <li><span className="tok a-syn" style={{ ['--hc' as string]: 'var(--t-triple)' }}>dotted</span> a synonym in the same position</li>
        </ul>
        <p>
          <b>Minor agreements</b> are words shared by Matthew and Luke in a passage they both have from Mark, where Mark
          has nothing matching nearby. The site counts {s?.minorAgreements ?? 603} that involve a meaningful word or a run
          of words. Many are trivial; a handful are famous puzzles.
        </p>
        <p>
          <b>Signature words</b> use the weighted log-odds ratio with an informative Dirichlet prior (Monroe, Colaresi &amp;
          Quinn, 2008), comparing each Gospel against the other three.
        </p>

        <h2>How the AI was used</h2>
        <p>
          Claude Opus 5.5 helped design and build the site and wrote the interpretive text. For each passage it was given the aligned Greek with
          every word numbered and tagged, plus the computed statistics, and asked to point out what a careful reader of
          the Greek would notice. Every Greek word the AI quotes is written as a citation that the build script must find
          in the actual text; if a quoted word doesn't exist at that verse, the build fails. That catches invented
          quotations, but not mistaken interpretations. The AI's readings are a knowledgeable starting point, not an authority.
        </p>

        <h2>Limitations</h2>
        <ul>
          <li>Alignment is automatic. It will sometimes link words that merely look alike, or miss a paraphrase.</li>
          <li>Passage boundaries are editorial judgment. Other synopses divide some passages differently.</li>
          <li>Percentages depend on how parallels are grouped and should be read as approximate.</li>
          <li>The SBLGNT's editors report that it differs from the Nestle–Aland text in more than 540 places, mostly minor. Where it matters (for example Mark 1:41), this is noted.</li>
          <li>The site takes no position on which source theory is right. The "lens" in the synopsis shows how each theory would read a passage.</li>
        </ul>

        <h2>Run it yourself</h2>
        <p>The source is on <a href="https://github.com/daniel-beachy/gospels-explorer-v1">GitHub</a>. The processed data is checked in, so the site runs with just:</p>
        <pre><code>npm install{'\n'}npm run dev</code></pre>
        <p>To rebuild the data from the original sources, run <code>scripts/fetch_data.sh</code>, then <code>python3 scripts/build_data.py</code> and <code>python3 scripts/build_notes.py</code>.</p>
      </div>
    </div>
  )
}
