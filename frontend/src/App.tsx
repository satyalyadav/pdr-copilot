import { useEffect, useRef, useState } from 'react'
import { Download, ImagePlus, LoaderCircle, ScanLine } from 'lucide-react'
import { request } from './api'
import { GuidancePanel } from './GuidancePanel'
import type { Capture, CaseContext, CopilotResult, Cycle, Outcome } from './types'

const initialContext: CaseContext = { vehicle: '', material: 'unknown' }
const outcomes: { id: Outcome; label: string }[] = [
  { id: 'not_reported', label: 'Let the copilot assess the result' },
  { id: 'not_done', label: 'No correction made' },
  { id: 'still_low', label: 'Still low under the light' },
  { id: 'looks_flatter', label: 'Looks flatter' },
  { id: 'went_high', label: 'Raised spot confirmed under the PDR light' },
  { id: 'paint_issue', label: 'Paint concern, stop corrections' },
  { id: 'unsure', label: 'Not sure yet' },
]

export function App() {
  const [captures, setCaptures] = useState<Capture[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [context, setContext] = useState<CaseContext>(initialContext)
  const [note, setNote] = useState('')
  const [outcome, setOutcome] = useState<Outcome>('not_reported')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [showPrevious, setShowPrevious] = useState(false)
  const upload = useRef<HTMLInputElement>(null)
  const resultPanel = useRef<HTMLDivElement>(null)
  const objectUrls = useRef<string[]>([])
  const controller = useRef<AbortController | null>(null)
  const sessionId = useRef(crypto.randomUUID())
  const capture = captures.find((item) => item.id === selectedId)
  const latest = cycles.at(-1)
  const selectedCycle = [...cycles].reverse().find((cycle) => cycle.captureId === selectedId)
  const previousCycle = !selectedCycle && latest?.captureId !== selectedId ? latest : undefined
  const previous = captures.find(
    (item) => item.id === (previousCycle?.captureId ?? selectedCycle?.previousCaptureId),
  )
  const result = selectedCycle?.result ?? previousCycle?.result ?? null
  const showingPrevious = !selectedCycle && Boolean(previousCycle)
  const photoResult = selectedCycle?.result
  const region = photoResult?.dent_region

  useEffect(() => {
    const abort = new AbortController()
    request<{ zen_configured: boolean }>('/api/health', { signal: abort.signal })
      .then((health) => setConfigured(health.zen_configured))
      .catch(() => {
        if (!abort.signal.aborted)
          setError('Cannot reach the backend. Start it and reload this page.')
      })
    return () => abort.abort()
  }, [])
  useEffect(
    () => () => {
      controller.current?.abort()
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url))
    },
    [],
  )

  function addPhotos(files: FileList | null) {
    if (!files?.length) return
    const incoming = Array.from(files)
    if (captures.length + incoming.length > 12) {
      setError('Use up to 12 photos per case.')
      return
    }
    if (
      incoming.some(
        (file) =>
          !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
          file.size > 12 * 1024 * 1024,
      )
    ) {
      setError('Choose PNG, JPEG or WebP photos up to 12 MB each.')
      return
    }
    const added = incoming.map((file) => {
      const url = URL.createObjectURL(file)
      objectUrls.current.push(url)
      return {
        id: crypto.randomUUID(),
        title: file.name,
        note: '',
        url,
        file,
        timestamp: new Date().toISOString(),
      }
    })
    setCaptures((items) => [...items, ...added])
    setSelectedId(added[0].id)
    setError('')
    setShowPrevious(false)
  }

  async function assess() {
    if (!capture || busy) return
    const abort = new AbortController()
    controller.current = abort
    setBusy(true)
    setError('')
    const submittedContext = { ...context }
    const baseline =
      previous ?? captures.find((item) => item.id === selectedCycle?.previousCaptureId)
    const submittedNote = previousCycle ? note.trim() : (selectedCycle?.actionNote ?? '')
    const submittedOutcome = previousCycle ? outcome : (selectedCycle?.outcome ?? 'not_reported')
    const pastCycles = selectedCycle
      ? cycles.slice(
          0,
          cycles.findIndex((cycle) => cycle.id === selectedCycle.id),
        )
      : cycles
    const form = new FormData()
    form.set('image', capture.file)
    form.set('mode', 'zen')
    form.set('session_id', sessionId.current)
    form.set('case_context', JSON.stringify(submittedContext))
    if (baseline) {
      form.set('previous_image', baseline.file)
      form.set('action_note', submittedNote)
      form.set('outcome', submittedOutcome)
      form.set(
        'history',
        JSON.stringify(
          pastCycles.slice(-3).map((cycle) => ({
            assessment: cycle.result.selection,
            action_note: cycle.actionNote,
            outcome: cycle.outcome,
          })),
        ),
      )
    }
    try {
      const assessed = await request<CopilotResult>('/api/guidance', {
        method: 'POST',
        body: form,
        signal: abort.signal,
      })
      const cycle: Cycle = {
        id: crypto.randomUUID(),
        captureId: capture.id,
        previousCaptureId: baseline?.id ?? null,
        result: assessed,
        actionNote: baseline ? submittedNote : '',
        outcome: baseline ? submittedOutcome : 'not_reported',
        context: submittedContext,
        timestamp: new Date().toISOString(),
      }
      setCycles((items) =>
        selectedCycle
          ? items.map((item) => (item.id === selectedCycle.id ? cycle : item))
          : [...items, cycle],
      )
      setContext(submittedContext)
      setNote('')
      setOutcome('not_reported')
      setShowPrevious(false)
      setTimeout(() => {
        resultPanel.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        document.getElementById('assessment-heading')?.focus({ preventScroll: true })
      }, 0)
    } catch (err) {
      if (!abort.signal.aborted)
        setError(err instanceof Error ? err.message : 'Review failed. Retry the assessment.')
    } finally {
      if (!abort.signal.aborted) setBusy(false)
    }
  }

  function exportCase() {
    const payload = {
      version: 3,
      sessionId: sessionId.current,
      context,
      photos: captures.map(({ id, title, timestamp }) => ({ id, title, timestamp })),
      cycles,
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'pdr-case.json'
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <>
      <header className="app-header">
        <div className="brand">
          <span className="brand-icon">
            <ScanLine size={23} />
          </span>
          <span>PDR copilot</span>
        </div>
        {cycles.length > 0 && (
          <button className="button secondary" onClick={exportCase}>
            <Download size={16} /> Export case
          </button>
        )}
      </header>
      <main>
        <div className="page-intro">
          <h1>Assess. Adjust. Reassess.</h1>
          <span className="prototype-label">Photo-guided prototype</span>
        </div>
        <details className="case-setup">
          <summary>Vehicle details, optional</summary>
          <div className="setup-fields">
            <label>
              Vehicle
              <input
                value={context.vehicle}
                maxLength={100}
                placeholder="e.g. Rivian R1S, model year"
                disabled={busy}
                onChange={(event) => setContext({ ...context, vehicle: event.target.value })}
              />
            </label>
            <label>
              Panel material
              <select
                value={context.material}
                disabled={busy}
                onChange={(event) =>
                  setContext({
                    ...context,
                    material: event.target.value as CaseContext['material'],
                  })
                }
              >
                <option value="unknown">Not confirmed</option>
                <option value="steel">Steel</option>
                <option value="aluminum">Aluminum</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>
        </details>
        {configured === false && (
          <p className="error">
            AI guidance needs OPENCODE_API_KEY in the backend .env file. Add it and restart the
            backend.
          </p>
        )}
        <input
          ref={upload}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          hidden
          aria-label="Upload dent photos"
          onChange={(event) => {
            addPhotos(event.target.files)
            event.target.value = ''
          }}
        />
        <div className="workspace">
          <section className="inspection" aria-label="Dent photo">
            <div className="section-toolbar">
              <h2>{capture?.title ?? 'Your dent photo'}</h2>
              <button
                className="button secondary"
                onClick={() => upload.current?.click()}
                disabled={busy}
              >
                <ImagePlus size={17} />
                {capture ? 'Add next photo' : 'Add photo'}
              </button>
            </div>
            {capture ? (
              <>
                <div className="viewer-shell">
                  <div className="image-plane">
                    <img
                      className="panel-image"
                      src={capture.url}
                      alt={`Current dent photo: ${capture.title}`}
                    />
                    {region && (
                      <div
                        className="dent-region"
                        style={{
                          left: `${region.x * 100}%`,
                          top: `${region.y * 100}%`,
                          width: `${region.width * 100}%`,
                          height: `${region.height * 100}%`,
                        }}
                      >
                        <span>Suggested dent area</span>
                      </div>
                    )}
                  </div>
                </div>
                {previous && (
                  <div className="previous-photo">
                    <button className="text-button" onClick={() => setShowPrevious(!showPrevious)}>
                      {showPrevious ? 'Hide' : 'View'} previous photo
                    </button>
                    {showPrevious && (
                      <figure>
                        <img src={previous.url} alt={`Previous photo: ${previous.title}`} />
                        <figcaption>{previous.title}</figcaption>
                      </figure>
                    )}
                  </div>
                )}
                {previousCycle && (
                  <section className="adjustment" aria-label="Adjustment since previous photo">
                    <h3>Anything to add? Optional</h3>
                    <textarea
                      aria-label="Action since previous photo"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      maxLength={600}
                      rows={2}
                      disabled={busy}
                      placeholder="Describe any known actions. Leave blank if the repair steps are unknown."
                    />
                    <label>
                      Your observation, optional
                      <select
                        value={outcome}
                        disabled={busy}
                        onChange={(event) => setOutcome(event.target.value as Outcome)}
                      >
                        {outcomes.map((item) => (
                          <option value={item.id} key={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </section>
                )}
                <div className="assess-row">
                  <span>
                    {selectedCycle
                      ? 'Add the next photo after a correction.'
                      : previousCycle
                        ? 'Compare with the last successful assessment.'
                        : 'Your photo is sent only when you assess.'}
                  </span>
                  <button
                    className="button primary"
                    onClick={() => void assess()}
                    disabled={
                      busy ||
                      configured !== true ||
                      Boolean(selectedCycle && selectedCycle.id !== latest?.id)
                    }
                  >
                    {busy ? <LoaderCircle size={17} className="spin" /> : <ScanLine size={17} />}
                    {busy
                      ? 'Reviewing…'
                      : previousCycle
                        ? 'Reassess image'
                        : selectedCycle
                          ? 'Assess again'
                          : 'Assess image'}
                  </button>
                </div>
              </>
            ) : (
              <div className="upload-empty">
                <ImagePlus size={36} />
                <h3>Start with a dent photo</h3>
                <p>Get a repair suggestion, make one adjustment, then add the next photo.</p>
                <button className="button primary" onClick={() => upload.current?.click()}>
                  Choose photo
                </button>
              </div>
            )}
          </section>
          <div ref={resultPanel}>
            <GuidancePanel
              result={result}
              busy={busy}
              error={error}
              showingPrevious={showingPrevious}
              pendingOutcome={outcome}
              saved={Boolean(selectedCycle && selectedCycle.id !== latest?.id)}
            />
          </div>
        </div>
        {captures.length > 0 && (
          <section className="sequence">
            <h2>Case photos</h2>
            <div className="capture-strip">
              {captures.map((item, index) => {
                const done = cycles.some((cycle) => cycle.captureId === item.id)
                return (
                  <button
                    className={`capture ${item.id === selectedId ? 'selected' : ''}`}
                    key={item.id}
                    disabled={busy}
                    aria-pressed={item.id === selectedId}
                    onClick={() => {
                      setSelectedId(item.id)
                      setError('')
                      setShowPrevious(false)
                    }}
                  >
                    <div>
                      <img src={item.url} alt="" />
                      <span>{done ? 'Assessed' : 'Not assessed'}</span>
                    </div>
                    <strong>
                      {index + 1}. {item.title}
                    </strong>
                  </button>
                )
              })}
              <button
                className="capture add-capture"
                onClick={() => upload.current?.click()}
                disabled={busy}
              >
                <ImagePlus size={24} />
                Add next photo
              </button>
            </div>
          </section>
        )}
        <footer>
          Keep one dent per case. This tab holds your case until reload; export to keep the record.
        </footer>
      </main>
    </>
  )
}
