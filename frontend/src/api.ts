import type { Capture, Region } from './types'

export function captureForm(capture: Capture, region: Region, previous?: Capture): FormData {
  const form = new FormData()
  form.set('image', capture.file)
  if (previous) form.set('previous_image', previous.file)
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
