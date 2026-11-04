import type { Analysis } from './types'

export function ChangeSummary({ comparison }: { comparison: Analysis['comparison'] }) {
  const before = comparison.previous_deviation_px
  const after = comparison.current_deviation_px
  if (comparison.status !== 'comparable' || before == null || after == null) return null
  const maximum = Math.max(before, after, 1)
  return (
    <div className="change-summary">
      <p>Stripe reference departure in this selection</p>
      <div
        role="img"
        aria-label={`Previous capture ${before.toFixed(2)} pixels. Current capture ${after.toFixed(2)} pixels. This compares image evidence, not repair quality.`}
      >
        {[
          { name: 'Previous', value: before },
          { name: 'Current', value: after },
        ].map((row) => (
          <div className="change-row" key={row.name}>
            <span>{row.name}</span>
            <div>
              <i style={{ width: `${(row.value / maximum) * 100}%` }} />
            </div>
            <strong>{row.value.toFixed(2)} px</strong>
          </div>
        ))}
      </div>
      <small>Image-space references only. Neither value measures physical dent depth.</small>
    </div>
  )
}
