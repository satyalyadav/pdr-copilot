import { LoaderCircle, ScanLine, Sparkles } from 'lucide-react'
import type { Analysis, Guidance } from './types'

export function GuidancePanel({
  analysis,
  guidance,
  zen,
  busy,
  onZen,
}: {
  analysis: Analysis | null
  guidance: Guidance | null
  zen: { configured: boolean; model: string }
  busy: string | null
  onZen: () => void
}) {
  return (
    <aside className="guidance" aria-label="Inspection evidence and guidance">
      <div className="guidance-heading">
        <span className="step-marker">1</span>
        <div>
          <h2>What is visible</h2>
          <p>Computed image evidence</p>
        </div>
      </div>
      {analysis ? (
        <>
          <p className="observation-text">{analysis.observation.summary}</p>
          <dl className="evidence">
            <div>
              <dt>Usable stripe tracks</dt>
              <dd>{analysis.observation.tracked_stripes}</dd>
            </div>
            <div>
              <dt>Mean reference departure</dt>
              <dd>
                {analysis.observation.mean_deviation_px === null
                  ? 'Unavailable'
                  : `${analysis.observation.mean_deviation_px.toFixed(2)} px`}
              </dd>
            </div>
          </dl>
          <details className="method">
            <summary>How to read the overlay</summary>
            <p>
              {analysis.observation.reference} This pixel proxy is not depth or a repair-quality
              score.
            </p>
          </details>
        </>
      ) : (
        <div className="empty-evidence">
          <ScanLine size={31} />
          <p>Choose an input and assess the image to highlight visible stripe departures.</p>
        </div>
      )}
      <div className="guidance-divider" />
      <div className="guidance-heading">
        <span className="step-marker">2</span>
        <div>
          <h2>What to inspect next</h2>
          <p>{guidance?.label ?? 'Source-backed inspection guidance'}</p>
        </div>
      </div>
      {guidance ? (
        <>
          {guidance.findings.length > 0 && (
            <div className="model-findings">
              {guidance.findings.map((finding) => (
                <p key={finding}>{finding}</p>
              ))}
            </div>
          )}
          <ol className="inspection-steps">
            {guidance.steps.map((step) => (
              <li key={step.id}>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
                <div className="source-links">
                  {step.source_ids.map((id) => {
                    const source = guidance.sources.find((item) => item.id === id)
                    return (
                      source && (
                        <a key={id} href={source.url} target="_blank" rel="noreferrer">
                          {source.title}
                        </a>
                      )
                    )
                  })}
                </div>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="muted">
          An assessment includes a local guidance template. OpenCode can also review the image and
          select curated inspection guidance.
        </p>
      )}
      <button
        className="button zen-button"
        disabled={!analysis || !!busy || !zen.configured}
        onClick={onZen}
      >
        {busy === 'zen' ? <LoaderCircle size={17} className="spin" /> : <Sparkles size={17} />}
        {busy === 'zen' ? 'Reviewing image' : 'Send image to OpenCode'}
      </button>
      <p className="privacy-note">
        {zen.configured
          ? `Uses ${zen.model}. Sends this image, the selection, and curated sources to OpenCode. No automatic requests.`
          : 'Add OPENCODE_API_KEY to the backend .env file and restart to enable live image review.'}
      </p>
      {guidance && (
        <details className="source-library">
          <summary>Read the source passages</summary>
          {guidance.sources.map((source) => (
            <article key={source.id}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.title}
              </a>
              <small>{source.locator}</small>
              <p>{source.passage}</p>
              <small>{source.status}</small>
            </article>
          ))}
        </details>
      )}
    </aside>
  )
}
