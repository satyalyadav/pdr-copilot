import { LoaderCircle } from 'lucide-react'
import type { Analysis, Guidance } from './types'

const stepTitles: Record<string, string> = {
  confirm_lighting: 'Check the lighting',
  recapture: 'Take a clearer photo',
  inspect_paint: 'Have the paint checked',
  verify_procedure: "Check the vehicle's repair procedure",
}

const findingLabels: Record<string, string> = {
  stripe_curvature: 'Some reflected lines appear curved.',
  readable_stripes: 'The reflected lines are visible.',
  glare: 'Glare may obscure part of the photo.',
  occlusion: 'Part of the view may be blocked.',
  uncertain: 'A clearer view is needed.',
}

function findingText(id: string | undefined, fallback: string): string {
  return (id && findingLabels[id]) || fallback
}

export function GuidancePanel({
  analysis,
  guidance,
  zenConfigured,
  busy,
  hasPhoto,
  error,
  showDots,
}: {
  analysis: Analysis | null
  guidance: Guidance | null
  zenConfigured: boolean
  busy: string | null
  hasPhoto: boolean
  error: string
  showDots: boolean
}) {
  return (
    <aside className="guidance" aria-label="Assessment results">
      <div className="guidance-heading">
        <h2 id="assessment-heading">Assessment</h2>
        {!busy && guidance && (
          <span className="assessment-badge">
            {guidance.mode === 'zen' ? 'AI review' : 'Basic checklist'}
          </span>
        )}
      </div>
      <div className="assessment-content" aria-live="polite" aria-atomic="true">
        {error && (
          <p className="assessment-error" role="alert">
            {error}
          </p>
        )}
        {busy ? (
          <div className="review-loading">
            <LoaderCircle className="spin" size={24} />
            <p>{busy === 'zen' ? 'Reviewing your photo...' : 'Checking your photo...'}</p>
          </div>
        ) : guidance ? (
          <>
            {guidance.mode === 'zen' && (guidance.finding_ids?.length ?? 0) > 0 && (
              <div className="model-findings">
                {guidance.finding_ids.map((id, index) => (
                  <p key={id}>{findingText(id, guidance.findings[index] ?? '')}</p>
                ))}
              </div>
            )}
            {guidance.mode === 'local' && (
              <p className="assessment-note">
                {zenConfigured
                  ? 'AI review was not completed. Basic checks are shown below.'
                  : 'AI review is unavailable. Basic checks are shown below.'}
              </p>
            )}
            <h3 className="next-checks-title">Next checks</h3>
            <ol className="inspection-steps">
              {guidance.steps.map((step) => (
                <li key={step.id}>
                  <h3>{stepTitles[step.id] ?? step.title}</h3>
                </li>
              ))}
            </ol>
            <p className="guidance-limits">
              {showDots && 'Dots mark where reflected lines bend. '}
              This is not a measure of dent depth, repair quality, or progress.
            </p>
            <details className="source-library">
              <summary>Sources</summary>
              {guidance.sources.map((source) => (
                <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
                  {source.title}
                </a>
              ))}
            </details>
          </>
        ) : (
          <p className="assessment-placeholder">
            {!hasPhoto
              ? 'Add a photo and click Assess image.'
              : analysis
                ? 'Click Assess image to try again.'
                : 'Click Assess image to review this photo.'}
          </p>
        )}
      </div>
    </aside>
  )
}
