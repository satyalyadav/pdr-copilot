import { useRef, useState, type PointerEvent } from 'react'
import type { Analysis, Capture, Region } from './types'

const clamp = (n: number) => Math.max(0, Math.min(1, n))

export function FrameViewer({
  capture,
  analysis,
  region,
  onRegion,
  overlay,
  selecting,
  disabled,
}: {
  capture: Capture
  analysis: Analysis | null
  region: Region
  onRegion: (region: Region) => void
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
          alt={`${capture.title}. ${capture.demoId ? 'Computer-generated reflection stripes.' : 'Uploaded inspection photo.'}`}
          draggable={false}
        />
        {analysis && overlay && (
          <img
            className="distortion-overlay"
            src={analysis.overlay}
            alt="Amber points mark stripe departures from a fitted reference."
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
          <span>Inspection region</span>
        </div>
      </div>
      <div className="viewer-caption">
        <span className="legend-dot" />{' '}
        {overlay
          ? 'Amber marks show image evidence, not tool positions.'
          : 'Original image. Overlay hidden.'}
      </div>
    </div>
  )
}
