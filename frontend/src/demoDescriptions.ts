import type { Demo } from './types'

export const demoDescriptions: Record<string, Pick<Demo, 'title' | 'note'>> = {
  initial: {
    title: 'Initial reflection',
    note: 'Starting example with the strongest stripe bending.',
  },
  adjusted: {
    title: 'Less stripe bending',
    note: 'The same generated pattern with less bending.',
  },
  reassessed: {
    title: 'Further reduced bending',
    note: 'A third generated image with still less bending.',
  },
  unchanged: {
    title: 'Same image again',
    note: 'An exact copy of the starting image. Expect no change.',
  },
  'camera-shift': {
    title: 'Camera moved',
    note: 'The starting image shifted sideways. Expect comparison to be blocked.',
  },
  'light-shift': {
    title: 'Light moved',
    note: 'The starting image with shifted stripes. Expect comparison to be blocked.',
  },
}
