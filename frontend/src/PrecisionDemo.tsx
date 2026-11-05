import { useEffect, useState } from 'react'
import { request } from './api'

type Stage = 'original' | 'improved' | 'unchanged'
type PrecisionResult = {
  stage: Stage
  reflection: string
  estimated_depth_mm: number
  known_depth_mm: number
  profile: { position_mm: number[]; estimated_mm: number[]; known_mm: number[] }
}

const stages: { id: Stage; label: string }[] = [
  { id: 'original', label: 'Before' },
  { id: 'improved', label: 'Simulated improvement' },
  { id: 'unchanged', label: 'Same images' },
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
        <span className="estimated-line">Recovered shape</span>
        <span className="known-line">Known shape</span>
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
      <p className="profile-caption">A slice through the dent. Zero is the flat panel.</p>
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
        A virtual dent bends reflected stripes. OpenCV uses the known camera and screen positions to
        recover the dent's shape.
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
              <figcaption>Camera sees bent stripes</figcaption>
              <img
                src={result.reflection}
                alt="Geometry-rendered stripes reflected by the simulated dent"
              />
              <p className="profile-caption">One of 16 simulated pattern images.</p>
            </figure>
            <figure>
              <figcaption>System recovers the dent</figcaption>
              <Profile profile={result.profile} />
            </figure>
          </div>
          <div className="precision-result" aria-live="polite">
            <p>
              <strong>{result.estimated_depth_mm.toFixed(2)} mm recovered depth</strong>
              <span>Known depth: {result.known_depth_mm.toFixed(2)} mm</span>
            </p>
            <p>
              {result.stage === 'original'
                ? 'Measure the dent, then compare after a change.'
                : result.stage === 'improved'
                  ? 'The dent is shallower after a scripted change.'
                  : 'Same images, same depth. No improvement.'}
            </p>
          </div>
          <p className="precision-note">
            Ideal simulation, not a predicted repair. Real measurements need calibrated hardware.
          </p>
        </>
      )}
    </section>
  )
}
