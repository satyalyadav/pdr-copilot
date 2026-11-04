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
                <section className="change-result">
                  <h3>{changeLabels[result.comparison.change]}</h3>
                  <p>{result.comparison.evidence}</p>
                  <small>Visual comparison only; lighting and angle can affect appearance.</small>
                </section>
              )}
              <section className="ai-observation">
                <h3>What the image shows</h3>
                <p className="visible-evidence">{result.visible_evidence}</p>
                <p className="work-location">
                  <strong>Focus area:</strong> {result.where_to_work}
                </p>
                <p className="action-reason">{result.reason}</p>
                {result.confidence === 'low' && (
                  <p className="muted">The image interpretation has low confidence.</p>
                )}
              </section>
              <section className={`action-plan ${result.status === 'stop' ? 'stopped' : ''}`}>
                {result.status === 'proposal' && (
                  <p className="plan-label">Proposed adjustment, based on this photo</p>
                )}
                <h3>{result.next_action.title}</h3>
                <p>{result.next_action.approach}</p>
                <p className="plan-tools">
                  <strong>Tools:</strong> {result.next_action.tools}
                </p>
                <ol className="action-steps">
                  {result.next_action.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <div className="expected-change">
                  <h3>What to expect</h3>
                  <p>{result.next_action.expected_change}</p>
                </div>
                <p className="stop-condition">
                  <strong>Pause:</strong> {result.next_action.stop_when}
                </p>
              </section>
              <details className="source-library">
                <summary>Assumptions and physical checks</summary>
                {result.assumptions.map((assumption) => (
                  <p key={assumption}>{assumption}</p>
                ))}
                {result.physical_preconditions.map((condition) => (
                  <p key={condition}>{condition}</p>
                ))}
                <p>{result.next_action.scope}</p>
                <p>{result.limits}</p>
              </details>
              <details className="source-library">
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
            </>
          )
        )}
      </div>
    </aside>
  )
}
