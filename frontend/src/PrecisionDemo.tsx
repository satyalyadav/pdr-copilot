import { useEffect, useState } from 'react'
import { request } from './api'
import type { CopilotResult } from './types'

type Stage = 'original' | 'improved' | 'unchanged'
type PrecisionResult = {
  stage: Stage
  reflection: string
  estimated_depth_mm: number
  known_depth_mm: number
  reconstruction_rmse_mm: number
  comparison: string
  profile: { position_mm: number[]; estimated_mm: number[]; known_mm: number[] }
  next_action: CopilotResult['next_action']
  physical_preconditions: string[]
  sources: CopilotResult['sources']
  calibration: {
    camera_height_mm: number
    focal_length_px: number
    screen_height_mm: number
    screen_size_mm: number[]
    pattern_images: number
  }
}

const stages: { id: Stage; label: string }[] = [
  { id: 'original', label: 'Original dent' },
  { id: 'improved', label: 'Scripted improvement' },
  { id: 'unchanged', label: 'Unchanged control' },
]
const profileY = (height: number) => ((0.2 - height) / 2.6) * 260

function Profile({ profile }: { profile: PrecisionResult['profile'] }) {
  const points = (values: number[]) =>
    values
      .map((value, index) => `${(index / (values.length - 1)) * 600},${profileY(value)}`)
      .join(' ')
  return (
    <>
      <div className="profile-legend">
        <span className="estimated-line">Estimated from images</span>
        <span className="known-line">Known synthetic shape</span>
      </div>
      <div className="profile-plot">
        <div className="profile-axis" aria-hidden="true">
          {[0, -1, -2].map((value) => (
            <span key={value} style={{ top: `${(profileY(value) / 260) * 100}%` }}>
              {value} mm
            </span>
          ))}
        </div>
        <svg
          viewBox="0 0 600 260"
          preserveAspectRatio="none"
          role="img"
          aria-label="Estimated and known dent profiles across the center of the simulated panel"
        >
          <title>Height relative to the flat panel</title>
          {[0, -1, -2].map((value) => (
            <line
              key={value}
              x1="0"
              x2="600"
              y1={profileY(value)}
              y2={profileY(value)}
              stroke="#cad8dd"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <polyline
            points={points(profile.known_mm)}
            fill="none"
            stroke="#b46617"
            strokeWidth="4"
            strokeDasharray="6 5"
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            points={points(profile.estimated_mm)}
            fill="none"
            stroke="#276779"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <p className="profile-caption">Center section of the panel. Zero is the flat reference.</p>
    </>
  )
}

export function PrecisionDemo() {
  const [stage, setStage] = useState<Stage>('original')
  const [result, setResult] = useState<PrecisionResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setResult(null)
    setError('')
    request<PrecisionResult>(`/api/precision-demo?stage=${stage}`, { signal: controller.signal })
      .then((value) => {
        if (!controller.signal.aborted) setResult(value)
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : 'Could not load the precision demo.')
      })
    return () => controller.abort()
  }, [stage])

  return (
    <section className="precision-demo" aria-label="Calibrated deflectometry demo">
      <p className="precision-intro">
        Calibrated deflectometry measures shape from reflected patterns. This demo uses a virtual
        camera, screen and dented panel.
      </p>
      <div className="precision-stages" role="group" aria-label="Synthetic stage">
        {stages.map((item) => (
          <button
            key={item.id}
            className="button secondary"
            aria-pressed={stage === item.id}
            disabled={!result && !error}
            onClick={() => setStage(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="precision-note">
        The improvement is predefined, not predicted from a tool action. Every comparison uses the
        original dent.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!result && !error && <p role="status">Generating and measuring the reflected patterns…</p>}
      {result && (
        <>
          <div className="precision-figures">
            <figure>
              <figcaption>Reflected stripes</figcaption>
              <img
                src={result.reflection}
                alt="Geometry-rendered stripes reflected by the simulated dent"
              />
              <p className="profile-caption">
                One of {result.calibration.pattern_images} pattern images processed for this stage.
              </p>
            </figure>
            <figure>
              <figcaption>Recovered dent profile</figcaption>
              <Profile profile={result.profile} />
            </figure>
          </div>
          <div className="precision-result" aria-live="polite">
            <p>
              <strong>{result.estimated_depth_mm.toFixed(2)} mm estimated depth</strong>
              <span>Known synthetic depth: {result.known_depth_mm.toFixed(2)} mm</span>
            </p>
            <p>{result.comparison}</p>
          </div>
          <section className="precision-next">
            <h2>Example next step</h2>
            <p>{result.next_action.title}</p>
            <details>
              <summary>Repair guidance</summary>
              <p>
                <strong>Tools:</strong> {result.next_action.tools}
              </p>
              <ol>
                {result.next_action.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p>
                <strong>Pause:</strong> {result.next_action.stop_when}
              </p>
              {result.physical_preconditions.map((condition) => (
                <p key={condition}>{condition}</p>
              ))}
              <p>{result.next_action.scope}</p>
              <p>
                {result.sources.map((source) => (
                  <a key={source.id} href={source.url} target="_blank" rel="noreferrer">
                    {source.title}
                  </a>
                ))}
              </p>
            </details>
          </section>
          <details className="precision-method">
            <summary>How this works</summary>
            <p>
              A pinhole camera sits {result.calibration.camera_height_mm} mm above the panel. A{' '}
              {result.calibration.screen_size_mm.join(' × ')} mm screen sits{' '}
              {result.calibration.screen_height_mm} mm above it, behind the camera. The camera focal
              length is {result.calibration.focal_length_px} pixels.
            </p>
            <p>
              OpenCV decodes shifted stripe patterns into screen coordinates. Reflection geometry
              recovers surface tilt, then integration recovers height using the flat outer edge as
              the zero reference. The known dent shape is used only to render the images and check
              the answer.
            </p>
            <p>
              Ideal mirror reflection, fixed geometry and no sensor noise are assumed.
              Reconstruction error against the known shape:{' '}
              {result.reconstruction_rmse_mm.toFixed(5)} mm RMS in this simulation.
            </p>
            <p>
              This demo uses the same repair cards as the photo copilot, without a model call. It
              demonstrates simulated measurement, not validated real-world accuracy or repair
              physics.
            </p>
            <a
              href="https://opencsp.sandia.gov/opencsp-data/sofast-2-0-data-examples/"
              target="_blank"
              rel="noreferrer"
            >
              Deflectometry reference: Sandia SOFAST
            </a>
          </details>
        </>
      )}
    </section>
  )
}
