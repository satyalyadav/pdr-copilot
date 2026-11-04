import type { Capture, Region } from './types'

export function captureForm(capture: Capture, region: Region, previous?: Capture): FormData {
  const form = new FormData()
  if (capture.demoId) form.set('demo_id', capture.demoId)
  else if (capture.file) form.set('image', capture.file)
  if (previous?.demoId) form.set('previous_demo_id', previous.demoId)
  else if (previous?.file) form.set('previous_image', previous.file)
  form.set('region', JSON.stringify(region))
  return form
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options)
  const payload = await response.json()
  if (!response.ok)
    throw new Error(
      typeof payload.detail === 'string'
        ? payload.detail
        : 'The request failed. Check the selected inputs and retry.',
    )
  return payload as T
}
