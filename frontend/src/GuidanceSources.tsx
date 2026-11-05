import { useEffect, useState } from 'react'
import { request } from './api'
import type { Source } from './types'

const uses: Record<string, string> = {
  'rivian-pdr-2023':
    'Paint inspection and vehicle restrictions. Historical 2023 statement; current vehicle applicability is unconfirmed.',
  'ding-king-lighting': 'Reading dents with lights and reflection boards.',
  'keco-controlled-pulls': 'Tab alignment and incremental crease pulls.',
  'carcosmetics-pdr': 'Glue pulling, checking remaining lows and highs, and finishing.',
}

export function GuidanceSources() {
  const [open, setOpen] = useState(false)
  const [sources, setSources] = useState<Source[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || sources) return
    const controller = new AbortController()
    setError('')
    request<Source[]>('/api/sources', { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) setSources(value)
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError('Could not load sources. Close and reopen this section to try again.')
      })
    return () => controller.abort()
  }, [open, sources])

  return (
    <details
      className="guidance-sources"
      id="guidance-sources"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Guidance sources</summary>
      <p className="sources-intro">References behind the copilot's repair techniques and checks.</p>
      {error && <p role="alert">{error}</p>}
      {!sources && !error && <p role="status">Loading sources...</p>}
      {sources && (
        <ul className="sources-list">
          {sources.map((source) => (
            <li key={source.id}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.title}
              </a>
              <p>{uses[source.id] ?? source.locator}</p>
            </li>
          ))}
        </ul>
      )}
    </details>
  )
}
