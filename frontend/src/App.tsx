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
  const [assessmentError, setAssessmentError] = useState('')
  const [changeView, setChangeView] = useState(false)
  const [overlay, setOverlay] = useState(true)
  const [selecting, setSelecting] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [note, setNote] = useState('')
  const [entries, setEntries] = useState<SessionEntry[]>([])
  const [saved, setSaved] = useState(false)
  const [showBaseline, setShowBaseline] = useState(false)
  const sessionId = useRef(crypto.randomUUID())
  const resultPanel = useRef<HTMLDivElement>(null)
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
    setAssessmentError('')
    setSaved(false)
    setShowBaseline(false)
    setBusy(null)
  }
  function chooseCapture(id: string) {
    if (id === selectedId) return
    clearResult()
    setSelectedId(id)
    setNote('')
    const index = captures.findIndex((item) => item.id === id)
    setPreviousId(index > 0 ? captures[index - 1].id : '')
  }
  async function assess() {
    if (!capture || busy) return
    const abort = new AbortController()
    controller.current = abort
    setBusy('assessment')
    setAssessmentError('')
    setSaved(false)
    setGuidance(null)
    requestAnimationFrame(() => {
      resultPanel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      resultPanel.current?.focus({ preventScroll: true })
    })
    try {
      const [result, local] = await Promise.all([
        request<Analysis>('/api/analyze', {
          method: 'POST',
          body: captureForm(capture, region, previous),
          signal: abort.signal,
        }),
        request<Guidance>('/api/guidance', {
          method: 'POST',
          body: captureForm(capture, region),
          signal: abort.signal,
        }),
      ])
      if (abort.signal.aborted) return
      setAnalysis(result)
      setGuidance(local)
      if (zenConfigured) {
        setBusy('zen')
        const form = captureForm(capture, region)
        form.set('mode', 'zen')
        form.set('session_id', sessionId.current)
        const review = await request<Guidance>('/api/guidance', {
          method: 'POST',
          body: form,
          signal: abort.signal,
        })
        if (!abort.signal.aborted) setGuidance(review)
      }
    } catch (err) {
      if (!abort.signal.aborted)
        setAssessmentError(err instanceof Error ? err.message : 'Assessment failed. Try again.')
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
      setNote('')
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
        <a className="brand" href="/" aria-label="PDR copilot home">
          <span className="brand-icon">
            <ScanLine size={23} />
          </span>
          <span>
            PDR <strong>copilot</strong>
          </span>
        </a>
      </header>
      <main>
        <div className="page-intro">
          <h1>Dent assessment</h1>
        </div>
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <div className="workspace">
          <section className="inspection" aria-label="Photo">
            <div className="section-toolbar">
              <h2>{capture?.title ?? 'Your photo'}</h2>
              <div className="photo-actions">
                <button
                  className="button secondary"
                  disabled={!!busy}
                  onClick={() => upload.current?.click()}
                >
                  <ImagePlus size={16} /> Add photos
                </button>
                {capture && (
                  <button
                    className="button primary"
                    disabled={!!busy}
                    onClick={() => void assess()}
                  >
                    {busy ? <LoaderCircle className="spin" size={17} /> : <ScanLine size={17} />}
                    {busy ? 'Assessing...' : 'Assess image'}
                  </button>
                )}
              </div>
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
                <FrameViewer
                  capture={capture}
                  analysis={analysis}
                  region={region}
                  onRegion={(next) => {
                    updateRegion(next)
                    setSelecting(false)
                  }}
                  overlay={overlay && analysis?.observation.state === 'observable'}
                  changeView={changeView}
                  selecting={selecting}
                  showRegion={toolsOpen || !!analysis}
                  disabled={!!busy}
                />
                {analysis?.observation.state === 'insufficient' && (
                  <p className="stripe-status">No readable stripe pattern in the checked area.</p>
                )}
                <details
                  className="image-options"
                  open={toolsOpen}
                  onToggle={(event) => {
                    setToolsOpen(event.currentTarget.open)
                    if (!event.currentTarget.open) setSelecting(false)
                  }}
                >
                  <summary>Image tools</summary>
                  <div className="image-tools">
                    <div className="tool-group">
                      <button
                        className={'tool ' + (analysis && overlay && !changeView ? 'active' : '')}
                        aria-pressed={!!analysis && overlay && !changeView}
                        disabled={!analysis || analysis.observation.state !== 'observable'}
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
                          className={'tool ' + (changeView ? 'active' : '')}
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
                        className={'tool ' + (selecting ? 'active' : '')}
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
                        onClick={() => updateRegion(initialRegion)}
                      >
                        <RotateCcw size={15} />
                      </button>
                    </div>
                  </div>
                  <details className="region-controls">
                    <summary>Adjust area</summary>
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
                </details>
                {captures.length > 1 && (
                  <div className="comparison-controls">
                    <label htmlFor="previous-capture">Previous photo</label>
                    <select
                      id="previous-capture"
                      value={previousId}
                      disabled={!!busy}
                      onChange={(event) => {
                        clearResult()
                        setPreviousId(event.target.value)
                      }}
                    >
                      <option value="">None</option>
                      {captures
                        .filter((item) => item.id !== selectedId)
                        .map((item) => (
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
                      <Eye size={16} /> {showBaseline ? 'Hide' : 'View'}
                    </button>
                  </div>
                )}
                {showBaseline && previous && (
                  <figure className="baseline">
                    <img src={previous.url} alt={'Previous photo: ' + previous.title} />
                  </figure>
                )}
                {analysis && analysis.comparison.status !== 'not_requested' && (
                  <div className={'comparison-result ' + analysis.comparison.status} role="status">
                    <strong>{statusNames[analysis.comparison.status]}</strong>
                    {analysis.comparison.status === 'unverified' && (
                      <p>Repair progress cannot be confirmed from these photos.</p>
                    )}
                    {analysis.comparison.status === 'blocked' && (
                      <p>Use photos with matching framing.</p>
                    )}
                    <ChangeSummary comparison={analysis.comparison} />
                  </div>
                )}
              </>
            ) : (
              <div className="upload-empty">
                <ImagePlus size={40} aria-hidden="true" />
                <h3>Add a dent photo</h3>
                <button className="button primary" onClick={() => upload.current?.click()}>
                  <ImagePlus size={17} /> Choose photo
                </button>
              </div>
            )}
          </section>
          <div
            className="result-panel"
            ref={resultPanel}
            tabIndex={-1}
            aria-labelledby="assessment-heading"
          >
            <GuidancePanel
              analysis={analysis}
              guidance={guidance}
              zenConfigured={zenConfigured}
              busy={busy}
              hasPhoto={!!capture}
              error={assessmentError}
              showDots={overlay && !changeView && analysis?.observation.state === 'observable'}
            />
          </div>
        </div>
        {captures.length > 0 && (
          <section className="sequence" aria-label="Your photos">
            <div className="sequence-heading">
              <h2>Your photos</h2>
            </div>
            <div className="capture-strip">
              {captures.map((item) => (
                <button
                  key={item.id}
                  className={'capture ' + (selectedId === item.id ? 'selected' : '')}
                  disabled={!!busy}
                  onClick={() => chooseCapture(item.id)}
                  aria-pressed={selectedId === item.id}
                >
                  <div>
                    <img src={item.url} alt="" />
                  </div>
                  <strong>{item.title}</strong>
                </button>
              ))}
              <button
                className="capture add-capture"
                disabled={!!busy}
                onClick={() => upload.current?.click()}
              >
                <ImagePlus size={23} />
                <strong>Add next photo</strong>
              </button>
            </div>
          </section>
        )}
        {capture && (
          <details className="session-options">
            <summary>Save assessment</summary>
            <div className="session">
              <div className="session-copy">
                <label htmlFor="technician-note">Notes, optional</label>
                <textarea
                  id="technician-note"
                  value={note}
                  rows={2}
                  placeholder="What changed between photos?"
                  onChange={(event) => {
                    setNote(event.target.value)
                    setSaved(false)
                  }}
                />
              </div>
              <div className="session-actions">
                <button
                  className="button secondary"
                  disabled={!analysis || !guidance || saved || !!busy}
                  onClick={saveAssessment}
                >
                  {saved && <Check size={16} />}
                  {saved ? 'Saved in this tab' : 'Save in this tab'}
                </button>
                <button className="button quiet" disabled={!entries.length} onClick={exportSession}>
                  <ArrowDownToLine size={16} /> Download ({entries.length})
                </button>
              </div>
            </div>
          </details>
        )}
      </main>
    </div>
  )
}
