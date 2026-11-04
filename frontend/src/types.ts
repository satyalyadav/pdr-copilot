export type Region = { x: number; y: number; width: number; height: number }
export type Demo = { id: string; title: string; note: string; url: string }
export type Capture = {
  id: string
  title: string
  note: string
  url: string
  demoId?: string
  file?: File
  timestamp: string
}
export type Source = {
  id: string
  title: string
  url: string
  locator: string
  status: string
  passage: string
}
export type Analysis = {
  observation: {
    state: 'observable' | 'insufficient'
    summary: string
    tracked_stripes: number
    mean_deviation_px: number | null
    marked_points: number
    reference: string
  }
  change_overlay: string | null
  overlay: string
  image: string
  region: Region
  width: number
  height: number
  provenance: 'synthetic' | 'upload'
  comparison: {
    status: 'not_requested' | 'unchanged' | 'comparable' | 'blocked' | 'unverified'
    summary: string
    mean_absolute_difference: number | null
    region_mean_absolute_difference?: number
    outside_mean_absolute_difference?: number | null
    previous_deviation_px?: number | null
    current_deviation_px?: number | null
  }
}
export type Guidance = {
  mode: 'local' | 'zen'
  label: string
  findings: string[]
  steps: { id: string; title: string; text: string; source_ids: string[] }[]
  sources: Source[]
  repair_actions_validated: false
  limits: string
}
export type SessionEntry = {
  id: string
  capture: string
  previous: string | null
  recordedAt: string
  region: Region
  analysis: Analysis
  guidance: Guidance
  technicianNote: string
}
