import { useEffect, useRef, useState } from 'react'
import {
  ArrowDownToLine,
  Check,
  CircleHelp,
  Eye,
  Focus,
  ImagePlus,
  Layers2,
  LoaderCircle,
  RotateCcw,
  ScanLine,
  ShieldCheck,
} from 'lucide-react'
import { FrameViewer } from './FrameViewer'
import { GuidancePanel } from './GuidancePanel'
import { captureForm, request } from './api'
import type { Analysis, Capture, Demo, Guidance, Region, SessionEntry } from './types'

const initialRegion: Region = { x: 0.28, y: 0.22, width: 0.44, height: 0.56 }
const statusNames: Record<Analysis['comparison']['status'], string> = {
  not_requested: 'First assessment',
  unchanged: 'Identical image',
  comparable: 'Synthetic comparison only',
  blocked: 'Comparison blocked',
  unverified: 'Capture conditions unverified',
}

export function App() {
  const [captures, setCaptures] = useState<Capture[]>([])
  const [selectedId, setSelectedId] = useState('initial')
  const [previousId, setPreviousId] = useState('')
  const [region, setRegion] = useState<Region>(initialRegion)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [guidance, setGuidance] = useState<Guidance | null>(null)
  const [zen, setZen] = useState({ configured: false, model: '' })
  const [busy, setBusy] = useState<'assessment' | 'zen' | null>(null)
  const [error, setError] = useState('')
  const [overlay, setOverlay] = useState(true)
  const [selecting, setSelecting] = useState(false)
  const [note, setNote] = useState('')
  const [entries, setEntries] = useState<SessionEntry[]>([])
  const [saved, setSaved] = useState(false)
  const [showProtocol, setShowProtocol] = useState(false)
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
        const [demos, health] = await Promise.all([
          request<Demo[]>('/api/demo', { signal: abort.signal }),
          request<{ zen_configured: boolean; model: string }>('/api/health', {
            signal: abort.signal,
          }),
        ])
        setCaptures(
          demos.map((item) => ({ ...item, demoId: item.id, timestamp: new Date().toISOString() })),
        )
        setZen({ configured: health.zen_configured, model: health.model })
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
    const next = captures.find((item) => item.id === id)
    setPreviousId(next?.demoId && id !== 'initial' ? 'initial' : '')
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
    if (captures.filter((item) => item.file).length + images.length > 12) {
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
      setPreviousId(capture?.file ? capture.id : '')
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
        <div className="header-actions">
          <span className={`connection ${zen.configured ? 'ready' : ''}`}>
            <i />
            {zen.configured ? 'OpenCode configured' : 'Local guidance available'}
          </span>
          <button
            className="button quiet"
            onClick={() => setShowProtocol((value) => !value)}
            aria-expanded={showProtocol}
          >
            <CircleHelp size={16} /> Capture guide
          </button>
        </div>
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
          <div className="prototype-tag">
            <ShieldCheck size={18} />
            <span>
              Interview prototype
              <br />
              <strong>Physical corrections unvalidated</strong>
            </span>
          </div>
        </div>
        {showProtocol && (
          <section className="protocol" aria-label="Capture guide">
            <h2>Capture a useful reflection</h2>
            <ol>
              <li>
                Show continuous, near-vertical bright stripes over the inspection region. Reduce
                glare and remove obstructions.
              </li>
              <li>
                Fix the camera, panel, and light. Keep focus and exposure consistent. Record camera
                and light positions independently.
              </li>
              <li>
                Uploaded comparisons remain unverified. Confirm model year, panel material, paint
                inspection, and current OEM procedures before any physical work.
              </li>
            </ol>
            <p>
              Synthetic frames are predetermined stripe warps. They are not an optical or
              metal-deformation simulation.
            </p>
          </section>
        )}
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <div className="workspace">
          <section className="inspection" aria-label="Image inspection">
            <div className="section-toolbar">
              <div>
                <h2>{capture?.title ?? 'Loading inspection workspace'}</h2>
                <span className={`provenance ${capture?.demoId ? 'synthetic' : ''}`}>
                  {capture?.demoId ? 'Synthetic input' : 'Uploaded input'}
                </span>
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
            <div className="image-tools">
              <div className="tool-group">
                <button
                  className={`tool ${overlay ? 'active' : ''}`}
                  aria-pressed={overlay}
                  onClick={() => setOverlay((value) => !value)}
                >
                  <Layers2 size={15} /> Overlay
                </button>
                <button
                  className={`tool ${selecting ? 'active' : ''}`}
                  aria-pressed={selecting}
                  disabled={!!busy}
                  onClick={() => setSelecting((value) => !value)}
                >
                  <Focus size={15} /> Select region
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
              <span>
                {selecting ? 'Drag a rectangle over the image' : 'Vertical stripe inspection'}
              </span>
            </div>
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
                selecting={selecting}
                disabled={!!busy}
              />
            )}
            <details className="region-controls">
              <summary>Adjust the region with keyboard controls</summary>
              <div>
                {(['x', 'y', 'width', 'height'] as const).map((key) => (
                  <label key={key}>
                    {key}
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
                <figcaption>
                  {previous.title}. {previous.demoId ? 'Synthetic input.' : 'Uploaded input.'}
                </figcaption>
              </figure>
            )}
            {analysis && (
              <div className={`comparison-result ${analysis.comparison.status}`} role="status">
                <strong>{statusNames[analysis.comparison.status]}</strong>
                <p>{analysis.comparison.summary}</p>
              </div>
            )}
            <div className="assess-row">
              <span>
                The selection localizes an inspection.
                <br />
                It does not identify a push or pull point.
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
          </section>
          <GuidancePanel
            analysis={analysis}
            guidance={guidance}
            zen={zen}
            busy={busy}
            onZen={() => void assess('zen')}
          />
        </div>
        <section className="sequence" aria-label="Input sequence">
          <div className="sequence-heading">
            <div>
              <h2>Assess. Adjust. Reassess.</h2>
              <p>Replay illustrative inputs or add a capture after a technician's adjustment.</p>
            </div>
            <span>Replay does not establish AI-caused outcomes.</span>
          </div>
          <div className="capture-strip">
            {captures.map((item, index) => (
              <button
                key={item.id}
                className={`capture ${selectedId === item.id ? 'selected' : ''}`}
                disabled={!!busy}
                onClick={() => chooseCapture(item.id)}
                aria-pressed={selectedId === item.id}
              >
                <div>
                  <img src={item.url} alt="" />
                  <span>
                    {item.demoId ? (index < 3 ? `Stage ${index + 1}` : 'Control') : 'Upload'}
                  </span>
                </div>
                <strong>{item.title}</strong>
                <small>{item.demoId ? 'Computer-generated' : 'Your photo'}</small>
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
        <section className="session">
          <div className="session-copy">
            <div className="guidance-heading">
              <span className="step-marker">3</span>
              <div>
                <h2>Record and reassess</h2>
                <p>Keep the technician's action separate from the image evidence.</p>
              </div>
            </div>
            <label htmlFor="technician-note">Technician's adjustment or reviewer note</label>
            <textarea
              id="technician-note"
              value={note}
              placeholder="Record what happened, or mark a proposed step as hypothetical."
              rows={3}
              onChange={(event) => {
                setNote(event.target.value)
                setSaved(false)
              }}
            />
            <p>Records stay in this tab until exported. Reloading clears them.</p>
          </div>
          <div className="session-actions">
            <button
              className="button secondary"
              disabled={!analysis || !guidance || saved || !!busy}
              onClick={saveAssessment}
            >
              {saved ? <Check size={16} /> : <ArrowDownToLine size={16} />}
              {saved ? 'Assessment recorded' : 'Record this assessment'}
            </button>
            <button className="button quiet" disabled={!entries.length} onClick={exportSession}>
              <ArrowDownToLine size={16} /> Export session ({entries.length})
            </button>
          </div>
        </section>
        <footer>
          <ShieldCheck size={16} />
          <p>
            Inspection assistance only. No depth, high/low sign, tool placement, force,
            repair-quality score, or OEM compliance is established. Expert review is the next
            validation step.
          </p>
        </footer>
      </main>
    </div>
  )
}
