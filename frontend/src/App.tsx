import { useEffect, useRef, useState } from 'react'
import {
  ArrowDownToLine,
  Check,
  Eye,
  Focus,
  ImagePlus,
  Layers2,
  LoaderCircle,
  RotateCcw,
  ScanLine,
} from 'lucide-react'
import { ChangeSummary } from './ChangeSummary'
import { FrameViewer } from './FrameViewer'
import { GuidancePanel } from './GuidancePanel'
import { captureForm, request } from './api'
import type { Analysis, Capture, Guidance, Region, SessionEntry } from './types'

const initialRegion: Region = { x: 0.28, y: 0.22, width: 0.44, height: 0.56 }
const regionLabels = {
  x: 'Left position',
  y: 'Top position',
  width: 'Box width',
  height: 'Box height',
}
const statusNames: Record<Analysis['comparison']['status'], string> = {
  not_requested: 'First assessment',
  unchanged: 'Identical image',
  comparable: 'Synthetic comparison only',
  blocked: 'Comparison blocked',
  unverified: 'Capture conditions unverified',
}

export function App() {
  const [captures, setCaptures] = useState<Capture[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [previousId, setPreviousId] = useState('')
  const [region, setRegion] = useState<Region>(initialRegion)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [guidance, setGuidance] = useState<Guidance | null>(null)
  const [zenConfigured, setZenConfigured] = useState(false)
  const [busy, setBusy] = useState<'assessment' | 'zen' | null>(null)
  const [error, setError] = useState('')
  const [changeView, setChangeView] = useState(false)
  const [overlay, setOverlay] = useState(true)
  const [selecting, setSelecting] = useState(false)
  const [note, setNote] = useState('')
  const [entries, setEntries] = useState<SessionEntry[]>([])
  const [saved, setSaved] = useState(false)
  const [showBaseline, setShowBaseline] = useState(false)
  const sessionId = useRef(crypto.randomUUID())
  const upload = useRef<HTMLInputElement>(null)
  const objectUrls = useRef<string[]>([])
  const controller = useRef<AbortController | null>(null)
  const capture = captures.find((item) => item.id === selectedId)
  const previous = captures.find((item) => item.id === previousId)

  useEffect(() => {
    const abort = new AbortController()
    async function initialize() {
      try {
        const health = await request<{ zen_configured: boolean }>('/api/health', {
          signal: abort.signal,
        })
        setZenConfigured(health.zen_configured)
      } catch (err) {
        if (!abort.signal.aborted)
          setError(err instanceof Error ? err.message : 'Start the backend and reload this page.')
      }
    }
    void initialize()
    return () => abort.abort()
  }, [])
  useEffect(
    () => () => {
      controller.current?.abort()
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url))
    },
    [],
  )

  function clearResult() {
    controller.current?.abort()
    setChangeView(false)
    setAnalysis(null)
    setGuidance(null)
    setError('')
    setNote('')
    setSaved(false)
    setShowBaseline(false)
  }
  function chooseCapture(id: string) {
    clearResult()
    setSelectedId(id)
    const index = captures.findIndex((item) => item.id === id)
    setPreviousId(index > 0 ? captures[index - 1].id : '')
  }
  async function assess(mode: 'local' | 'zen') {
    if (!capture) return
    const abort = new AbortController()
    controller.current = abort
    setBusy(mode === 'zen' ? 'zen' : 'assessment')
    setError('')
    setSaved(false)
    try {
      const form = captureForm(capture, region)
      form.set('mode', mode)
      form.set('session_id', sessionId.current)
      if (mode === 'local') {
        const [result, next] = await Promise.all([
          request<Analysis>('/api/analyze', {
            method: 'POST',
            body: captureForm(capture, region, previous),
            signal: abort.signal,
          }),
          request<Guidance>('/api/guidance', { method: 'POST', body: form, signal: abort.signal }),
        ])
        setAnalysis(result)
        setGuidance(next)
      } else {
        setGuidance(
          await request<Guidance>('/api/guidance', {
            method: 'POST',
            body: form,
            signal: abort.signal,
          }),
        )
      }
    } catch (err) {
      if (!abort.signal.aborted)
        setError(err instanceof Error ? err.message : 'The assessment failed. Retry the request.')
    } finally {
      if (controller.current === abort) setBusy(null)
    }
  }
  function addUploads(files: FileList | null) {
    if (!files) return
    const images = Array.from(files)
    if (
      images.some(
        (file) =>
          !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
          file.size > 12 * 1024 * 1024,
      )
    ) {
      setError('Choose PNG, JPEG, or WebP images smaller than 12 MB each.')
      return
    }
    if (captures.length + images.length > 12) {
      setError(
        'Use up to 12 uploaded captures per session. Export this session before reloading for another batch.',
      )
      return
    }
    const added = images.map((file) => {
      const url = URL.createObjectURL(file)
      objectUrls.current.push(url)
      return {
        id: crypto.randomUUID(),
        title: file.name,
        note: 'Your uploaded photo. Camera and light stability are unverified.',
        url,
        file,
        timestamp: new Date().toISOString(),
      }
    })
    if (added.length) {
      clearResult()
      setCaptures((current) => [...current, ...added])
      setPreviousId(capture?.id ?? '')
      setSelectedId(added[0].id)
    }
  }
  function saveAssessment() {
    if (!capture || !analysis || !guidance) return
    setEntries((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        capture: capture.title,
        previous: previous?.title ?? null,
        recordedAt: new Date().toISOString(),
        region,
        analysis,
        guidance,
        technicianNote: note,
      },
    ])
    setSaved(true)
  }
  function exportSession() {
    const data = {
      title: 'PDR inspection session',
      exportedAt: new Date().toISOString(),
      limitations:
        'Experimental image evidence and inspection guidance. No physical repair validation.',
      entries,
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = 'pdr-inspection-session.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  function updateRegion(next: Region) {
    clearResult()
    setRegion(next)
  }

  return (
    <div className="app">
      <header className="app-header">
        <a className="brand" href="/" aria-label="PDR inspection copilot home">
          <span className="brand-icon">
            <ScanLine size={23} />
          </span>
          <span>
            PDR <strong>inspection copilot</strong>
          </span>
        </a>
      </header>
      <main>
        <div className="page-intro">
          <div>
            <h1>
              Read the reflection.
              <br />
              Choose the next inspection.
            </h1>
            <p>Assess, record an adjustment, then reassess the visible evidence.</p>
          </div>
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <div className="workspace">
          <section className="inspection" aria-label="Image inspection">
            <div className="section-toolbar">
              <div>
                <h2>{capture?.title ?? 'Upload a dent photo'}</h2>
                {capture && <span className="provenance">Your photo</span>}
              </div>
              <button
                className="button secondary"
                disabled={!!busy}
                onClick={() => upload.current?.click()}
              >
                <ImagePlus size={16} /> Add photos
              </button>
              <input
                ref={upload}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                hidden
                onChange={(event) => {
                  addUploads(event.target.files)
                  event.target.value = ''
                }}
              />
            </div>
            {capture ? (
              <>
                <p className="image-explainer">
                  The box marks the area of your photo to inspect. Adjust it if you want to focus on
                  different reflection stripes.
                </p>
                <div className="image-tools">
                  <div className="tool-group">
                    <button
                      className={`tool ${analysis && overlay && !changeView ? 'active' : ''}`}
                      aria-pressed={!!analysis && overlay && !changeView}
                      disabled={!analysis}
                      title={
                        analysis
                          ? 'Show or hide the yellow-orange bend markers'
                          : 'Click Assess image first'
                      }
                      onClick={() => {
                        if (changeView) {
                          setChangeView(false)
                          setOverlay(true)
                        } else setOverlay((value) => !value)
                      }}
                    >
                      <Layers2 size={15} /> Highlight bends
                    </button>
                    {analysis?.change_overlay && (
                      <button
                        className={`tool ${changeView ? 'active' : ''}`}
                        aria-pressed={changeView}
                        onClick={() => {
                          setChangeView((value) => !value)
                          setOverlay(true)
                        }}
                      >
                        Highlight changes
                      </button>
                    )}
                    <button
                      className={`tool ${selecting ? 'active' : ''}`}
                      aria-pressed={selecting}
                      disabled={!!busy}
                      onClick={() => setSelecting((value) => !value)}
                    >
                      <Focus size={15} /> Choose area
                    </button>
                    <button
                      className="tool"
                      disabled={!!busy}
                      aria-label="Reset inspection region"
                      title="Reset the inspection box to its starting position and size"
                      onClick={() => updateRegion(initialRegion)}
                    >
                      <RotateCcw size={15} />
                    </button>
                  </div>
                  <span>
                    {selecting ? 'Drag a rectangle over the image' : 'Vertical stripe inspection'}
                  </span>
                </div>
                <p className="inspection-help">
                  {selecting
                    ? 'Drag a box around the stripes you want to inspect. Then click Assess image.'
                    : 'Choose area lets you draw the inspection box. Highlight bends shows or hides the dots after assessment.'}
                </p>
                {capture && (
                  <FrameViewer
                    capture={capture}
                    analysis={analysis}
                    region={region}
                    onRegion={(next) => {
                      updateRegion(next)
                      setSelecting(false)
                    }}
                    overlay={overlay}
                    changeView={changeView}
                    selecting={selecting}
                    disabled={!!busy}
                  />
                )}
                <details className="region-controls">
                  <summary>Move or resize the inspection box</summary>
                  <p>Use the sliders or arrow keys. Percentages are relative to the image.</p>
                  <div>
                    {(['x', 'y', 'width', 'height'] as const).map((key) => (
                      <label key={key}>
                        {regionLabels[key]}
                        <input
                          type="range"
                          min={key === 'width' || key === 'height' ? 5 : 0}
                          max={Math.floor(
                            (1 -
                              (key === 'x'
                                ? region.width
                                : key === 'y'
                                  ? region.height
                                  : key === 'width'
                                    ? region.x
                                    : region.y)) *
                              100,
                          )}
                          value={Math.round(region[key] * 100)}
                          disabled={!!busy}
                          onChange={(event) =>
                            updateRegion({ ...region, [key]: Number(event.target.value) / 100 })
                          }
                        />
                        <output>{Math.round(region[key] * 100)}%</output>
                      </label>
                    ))}
                  </div>
                </details>
                <p className="image-note">{capture?.note}</p>
                <div className="comparison-controls">
                  <label htmlFor="previous-capture">Compare with</label>
                  <select
                    id="previous-capture"
                    value={previousId}
                    disabled={!!busy}
                    onChange={(event) => {
                      clearResult()
                      setPreviousId(event.target.value)
                    }}
                  >
                    <option value="">No previous capture</option>
                    {captures.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                  <button
                    className="button quiet"
                    disabled={!previous}
                    onClick={() => setShowBaseline((value) => !value)}
                  >
                    <Eye size={16} /> {showBaseline ? 'Hide' : 'View'} previous
                  </button>
                </div>
                {showBaseline && previous && (
                  <figure className="baseline">
                    <img src={previous.url} alt={`Previous capture: ${previous.title}`} />
                    <figcaption>{previous.title}. Your uploaded photo.</figcaption>
                  </figure>
                )}
                {analysis && (
                  <div className={`comparison-result ${analysis.comparison.status}`} role="status">
                    <strong>{statusNames[analysis.comparison.status]}</strong>
                    <p>{analysis.comparison.summary}</p>
                    <ChangeSummary comparison={analysis.comparison} />
                  </div>
                )}
                <div className="assess-row">
                  <span>
                    Assess the stripes inside the box to add bend markers and inspection guidance.
                  </span>
                  <button
                    className="button primary"
                    disabled={!!busy || !capture}
                    onClick={() => void assess('local')}
                  >
                    {busy === 'assessment' ? (
                      <LoaderCircle className="spin" size={17} />
                    ) : (
                      <ScanLine size={17} />
                    )}
                    {busy === 'assessment' ? 'Assessing image' : 'Assess image'}
                  </button>
                </div>
              </>
            ) : (
              <div className="upload-empty">
                <ImagePlus size={40} aria-hidden="true" />
                <h3>Add your first dent photo</h3>
                <p>Choose a photo with clear reflection lighting to start the assessment.</p>
                <button className="button primary" onClick={() => upload.current?.click()}>
                  <ImagePlus size={17} /> Choose photo
                </button>
                <small>PNG, JPEG, or WebP. Up to 12 MB per photo.</small>
              </div>
            )}
          </section>
          <GuidancePanel
            analysis={analysis}
            guidance={guidance}
            zenConfigured={zenConfigured}
            busy={busy}
            onZen={() => void assess('zen')}
          />
        </div>
        {captures.length > 0 && (
          <section className="sequence" aria-label="Your photos">
            <div className="sequence-heading">
              <div>
                <h2>Your photos</h2>
                <p>Select a photo to inspect, or add the next capture after an adjustment.</p>
              </div>
            </div>
            <div className="capture-strip">
              {captures.map((item) => (
                <button
                  key={item.id}
                  className={`capture ${selectedId === item.id ? 'selected' : ''}`}
                  disabled={!!busy}
                  onClick={() => chooseCapture(item.id)}
                  aria-pressed={selectedId === item.id}
                >
                  <div>
                    <img src={item.url} alt="" />
                    <span>Your photo</span>
                  </div>
                  <strong>{item.title}</strong>
                  <small>{item.note}</small>
                </button>
              ))}
              <button
                className="capture add-capture"
                disabled={!!busy}
                onClick={() => upload.current?.click()}
              >
                <ImagePlus size={23} />
                <strong>Add capture</strong>
                <small>PNG, JPEG, WebP</small>
              </button>
            </div>
          </section>
        )}
        {capture && (
          <section className="session">
            <div className="session-copy">
              <div className="guidance-heading">
                <span className="step-marker">3</span>
                <div>
                  <h2>Save this assessment</h2>
                  <p>
                    Keep the current image, results, and any notes before moving to the next photo.
                  </p>
                </div>
              </div>
              <label htmlFor="technician-note">
                Optional notes about this image or what you did between photos
              </label>
              <textarea
                id="technician-note"
                value={note}
                placeholder="For example: Took a second photo with the same camera and light positions."
                rows={3}
                onChange={(event) => {
                  setNote(event.target.value)
                  setSaved(false)
                }}
              />
              <p>
                Notes are saved with the image and results. Download saved assessments to keep them;
                reloading clears this tab.
              </p>
            </div>
            <div className="session-actions">
              <button
                className="button secondary"
                disabled={!analysis || !guidance || saved || !!busy}
                onClick={saveAssessment}
              >
                {saved ? <Check size={16} /> : <ArrowDownToLine size={16} />}
                {saved ? 'Assessment saved' : 'Save assessment'}
              </button>
              <button className="button quiet" disabled={!entries.length} onClick={exportSession}>
                <ArrowDownToLine size={16} /> Download saved assessments ({entries.length})
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
