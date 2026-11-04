import { useRef, useState, type PointerEvent } from 'react'
import type { Analysis, Capture, Region } from './types'

const clamp = (n: number) => Math.max(0, Math.min(1, n))

export function FrameViewer({
  capture,
  analysis,
  region,
  onRegion,
  overlay,
  changeView,
  selecting,
  disabled,
}: {
  capture: Capture
  analysis: Analysis | null
  region: Region
  onRegion: (region: Region) => void
  changeView: boolean
  overlay: boolean
  selecting: boolean
  disabled: boolean
}) {
  const container = useRef<HTMLDivElement>(null)
  const [start, setStart] = useState<{ x: number; y: number } | null>(null)
  const [draft, setDraft] = useState<Region | null>(null)
  function rectangle(
    event: PointerEvent<HTMLDivElement>,
    origin: { x: number; y: number },
  ): Region {
    const rect = container.current!.getBoundingClientRect()
    const x = clamp((event.clientX - rect.left) / rect.width)
    const y = clamp((event.clientY - rect.top) / rect.height)
    return {
      x: Math.min(origin.x, x),
      y: Math.min(origin.y, y),
      width: Math.abs(origin.x - x),
      height: Math.abs(origin.y - y),
    }
  }
  const active = draft ?? region
  return (
    <div className="viewer-shell">
      <div
        className={`image-plane ${selecting ? 'selecting' : ''}`}
        ref={container}
        onPointerDown={(event) => {
          if (!selecting || disabled) return
          event.currentTarget.setPointerCapture(event.pointerId)
          const rect = container.current!.getBoundingClientRect()
          setStart({
            x: clamp((event.clientX - rect.left) / rect.width),
            y: clamp((event.clientY - rect.top) / rect.height),
          })
        }}
        onPointerMove={(event) => {
          if (start) setDraft(rectangle(event, start))
        }}
        onPointerUp={(event) => {
          if (!start) return
          const next = rectangle(event, start)
          if (next.width >= 0.05 && next.height >= 0.05) onRegion(next)
          setStart(null)
          setDraft(null)
        }}
        onPointerCancel={() => {
          setStart(null)
          setDraft(null)
        }}
      >
        <img
          className="panel-image"
          src={analysis?.image ?? capture.url}
          alt={`${capture.title}. Uploaded inspection photo.`}
          draggable={false}
        />
        {analysis && overlay && (
          <img
            className="distortion-overlay"
            src={changeView && analysis.change_overlay ? analysis.change_overlay : analysis.overlay}
            alt={
              changeView
                ? 'Cyan marks show changed pixels between synthetic captures.'
                : 'Yellow-orange dots mark where stripes bend away from a fitted straight line.'
            }
            draggable={false}
          />
        )}
        <div
          className="inspection-region"
          style={{
            left: `${active.x * 100}%`,
            top: `${active.y * 100}%`,
            width: `${active.width * 100}%`,
            height: `${active.height * 100}%`,
          }}
        >
          <span>Inspection area</span>
        </div>
      </div>
      <div className="viewer-caption">
        {analysis && overlay && <span className={`legend-dot ${changeView ? 'changes' : ''}`} />}{' '}
        {!analysis
          ? 'Click Assess image to add yellow-orange dots where the stripes bend.'
          : overlay
            ? changeView
              ? 'Cyan marks show changed pixels, not repair progress.'
              : 'Yellow-orange dots show where stripes bend away from a fitted straight line.'
            : 'Bend markers are hidden. Click Highlight bends to show them.'}
      </div>
    </div>
  )
}
