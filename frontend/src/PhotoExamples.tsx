import recordings from './data/photo-examples.json'
import type { CopilotResult } from './types'

const examples = [
  {
    id: 'white-door',
    title: 'White door crease',
    source: 'Dent Press',
    url: 'https://www.dentrepaircharlotte.com/before-and-after',
    before: new URL('./assets/examples/white-door-before.webp', import.meta.url).href,
    after: new URL('./assets/examples/white-door-after.webp', import.meta.url).href,
  },
  {
    id: 'rivian-tailgate',
    title: 'Rivian tailgate',
    source: 'Dent Press',
    url: 'https://www.dentrepaircharlotte.com/before-and-after',
    before: new URL('./assets/examples/rivian-tailgate-before.webp', import.meta.url).href,
    after: new URL('./assets/examples/rivian-tailgate-after.webp', import.meta.url).href,
  },
  {
    id: 'blue-quarter',
    title: 'Blue quarter panel',
    source: 'Dent Press',
    url: 'https://www.dentrepaircharlotte.com/before-and-after',
    before: new URL('./assets/examples/blue-quarter-before.webp', import.meta.url).href,
    after: new URL('./assets/examples/blue-quarter-after.webp', import.meta.url).href,
  },
  {
    id: 'denttime-silver-door',
    title: 'Silver door dent',
    source: 'Dent Time',
    url: 'https://denttime.com/',
    before: new URL('./assets/examples/denttime-silver-door-before.webp', import.meta.url).href,
    after: new URL('./assets/examples/denttime-silver-door-after.webp', import.meta.url).href,
  },
  {
    id: 'ncpdr-small-ding',
    title: 'Small panel ding',
    source: 'N.C.Auto PDR',
    url: 'https://ncpdr.co.uk/pdr-gallery/',
    before: new URL('./assets/examples/ncpdr-small-ding-before.webp', import.meta.url).href,
    after: new URL('./assets/examples/ncpdr-small-ding-after.webp', import.meta.url).href,
  },
]

const saved = recordings.examples as Record<
  string,
  { before: { result: CopilotResult }; after: { result: CopilotResult } }
>
const changeLabels: Record<string, string> = {
  looks_flatter: 'Looks flatter',
  no_visible_change: 'No visible change',
  looks_worse: 'Looks more distorted',
  cannot_judge: 'Change is unclear',
}

function Assessment({ label, result }: { label: string; result: CopilotResult }) {
  return (
    <section className="example-assessment">
      <h4>{label}</h4>
      {result.comparison && <p>{result.comparison.evidence}</p>}
      <p>{result.where_to_work}</p>
      <p>
        <strong>Tools:</strong> {result.next_action.tools}
      </p>
      <ol>
        {result.next_action.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p>{result.next_action.expected_change}</p>
      <p className="example-pause">{result.next_action.stop_when}</p>
      <p className="note">{result.next_action.scope}</p>
    </section>
  )
}

export function PhotoExamples() {
  return (
    <section className="photo-examples" id="photo-examples" aria-labelledby="examples-heading">
      <h2 id="examples-heading">More photo examples</h2>
      <p className="examples-intro">
        Saved AI assessments of shop before-and-after photos. These repairs were not guided by this
        AI.
      </p>
      <div className="examples-grid">
        {examples.map((example) => {
          const result = saved[example.id]
          if (!result) return null
          return (
            <article className="example-card" key={example.id}>
              <h3>{example.title}</h3>
              <div className="example-photos">
                {(['before', 'after'] as const).map((stage) => (
                  <figure key={stage}>
                    <figcaption>{stage === 'before' ? 'Before' : 'After'}</figcaption>
                    <a
                      href={example[stage]}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open ${example.title.toLowerCase()} ${stage} photo`}
                    >
                      <img
                        src={example[stage]}
                        alt={`${example.title}, ${stage} repair`}
                        loading="lazy"
                        width="320"
                        height="220"
                      />
                    </a>
                  </figure>
                ))}
              </div>
              <div className="example-output">
                <p>
                  <span>AI before</span>
                  {result.before.result.next_action.title}
                </p>
                <p>
                  <span>AI after</span>
                  <strong>
                    {changeLabels[result.after.result.comparison?.change ?? 'cannot_judge']}.
                  </strong>{' '}
                  {result.after.result.next_action.title}
                </p>
              </div>
              <details>
                <summary>Read AI guidance</summary>
                <Assessment label="Before" result={result.before.result} />
                <Assessment label="After" result={result.after.result} />
              </details>
              <a className="example-source" href={example.url} target="_blank" rel="noreferrer">
                Photos: {example.source}
              </a>
            </article>
          )
        })}
      </div>
    </section>
  )
}
