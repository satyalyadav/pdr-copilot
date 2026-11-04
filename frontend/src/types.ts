export type Region = { x: number; y: number; width: number; height: number }
export type Capture = {
  id: string
  title: string
  note: string
  url: string
  file: File
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
  finding_ids: string[]
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

export type Outcome =
  | 'not_reported'
  | 'not_done'
  | 'still_low'
  | 'looks_flatter'
  | 'went_high'
  | 'paint_issue'
  | 'unsure'
export type CaseContext = {
  vehicle: string
  material: 'unknown' | 'steel' | 'aluminum' | 'other'
}
export type Selection = {
  visible_evidence: string
  dent_shape: 'crease' | 'broad_low' | 'small_ding' | 'raised_spot' | 'nearly_flat' | 'unclear'
  assumptions: string[]
  dent_region: Region | null
  confidence: 'low' | 'medium' | 'high'
  card_id: string
  where_to_work: string
  reason: string
  comparison: {
    view_match: 'similar' | 'uncertain' | 'different'
    change: 'looks_flatter' | 'no_visible_change' | 'looks_worse' | 'cannot_judge'
    evidence: string
  } | null
}
export type CopilotResult = Omit<Selection, 'card_id'> & {
  image_fingerprint: string
  selection: Selection
  status: 'ready' | 'proposal' | 'stop'
  next_action: {
    id: string
    title: string
    kind: 'repair' | 'inspection' | 'stop'
    tools: string
    approach: string
    expected_change: string
    steps: string[]
    stop_when: string
    scope: string
    source_ids: string[]
  }
  physical_preconditions: string[]
  sources: Source[]
  limits: string
  repair_actions_validated: false
}
export type Cycle = {
  id: string
  captureId: string
  previousCaptureId: string | null
  result: CopilotResult
  actionNote: string
  outcome: Outcome
  context: CaseContext
  timestamp: string
}
