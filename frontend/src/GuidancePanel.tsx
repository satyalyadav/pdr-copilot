import { LoaderCircle } from 'lucide-react'
import type { CopilotResult, Outcome } from './types'

const changeLabels = {
  looks_flatter: 'Looks flatter',
  no_visible_change: 'No visible change',
  looks_worse: 'Looks more distorted',
  cannot_judge: 'Change is unclear',
}

export function GuidancePanel({
  result,
  busy,
  error,
  showingPrevious,
  pendingOutcome,
  saved,
}: {
  result: CopilotResult | null
  busy: boolean
  error: string
  showingPrevious: boolean
  pendingOutcome: Outcome
  saved: boolean
}) {
  return (
    <aside className="guidance" aria-label="Assessment results">
      <h2 tabIndex={-1} id="assessment-heading">
        {showingPrevious ? 'Previous assessment' : saved ? 'Saved assessment' : 'Your next action'}
      </h2>
      <div aria-live="polite">
        {busy && (
          <div className="review-loading">
            <LoaderCircle size={22} className="spin" /> Reviewing…
          </div>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {!result && !busy && <p className="muted">Add a dent photo, then click Assess image.</p>}
        {showingPrevious ? (
          <p className="stop-condition">
            {pendingOutcome === 'paint_issue'
              ? 'You reported a paint concern. Keep corrections paused and reassess.'
              : pendingOutcome === 'went_high'
                ? 'You reported a raised spot. Do not repeat the previous pull; reassess this photo.'
                : 'Reassess the new photo to get an updated plan. The previous instructions do not apply to this image.'}
          </p>
        ) : (
          result && (
            <>
              {result.comparison && (
                <section className={`change-result change-${result.comparison.change}`}>
                  <p className="change-status">
                    <span>Since the previous photo:</span>{' '}
                    <strong>{changeLabels[result.comparison.change]}</strong>
                  </p>
                  <details>
                    <summary>What changed</summary>
                    <p>{result.comparison.evidence}</p>
                    <p className="note">
                      Visual comparison only; lighting and angle can affect appearance.
                    </p>
                  </details>
                </section>
              )}
              <section className={`action-plan ${result.status === 'stop' ? 'stopped' : ''}`}>
                {result.status === 'proposal' && (
                  <p className="plan-label">Proposed adjustment, based on this photo</p>
                )}
                <h3>{result.next_action.title}</h3>
                {result.confidence === 'low' && (
                  <p className="low-confidence">The image interpretation has low confidence.</p>
                )}
                <dl className="plan-facts">
                  <dt>Focus area</dt>
                  <dd>{result.where_to_work}</dd>
                  <dt>Tools</dt>
                  <dd>{result.next_action.tools}</dd>
                </dl>
                <ol className="action-steps">
                  {result.next_action.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <div className="outcome-pair">
                  <div className="expected-change">
                    <h4>What to expect</h4>
                    <p>{result.next_action.expected_change}</p>
                  </div>
                  <div className="stop-condition">
                    <h4>Pause</h4>
                    <p>{result.next_action.stop_when}</p>
                  </div>
                </div>
              </section>
              <div className="more-details">
                <details>
                  <summary>Assumptions and physical checks</summary>
                  <p>{result.reason}</p>
                  <p>{result.next_action.approach}</p>
                  {result.assumptions.map((assumption) => (
                    <p key={assumption}>{assumption}</p>
                  ))}
                  {result.physical_preconditions.map((condition) => (
                    <p key={condition}>{condition}</p>
                  ))}
                  <p>{result.next_action.scope}</p>
                  <p>{result.limits}</p>
                </details>
                <details>
                  <summary>Repair knowledge and sources</summary>
                  {result.sources.map((source) => (
                    <article key={source.id}>
                      <a href={source.url} target="_blank" rel="noreferrer">
                        {source.title}
                      </a>
                      <p>{source.passage}</p>
                      <small>{source.locator}</small>
                      <small>{source.status}</small>
                    </article>
                  ))}
                </details>
              </div>
            </>
          )
        )}
      </div>
    </aside>
  )
}
