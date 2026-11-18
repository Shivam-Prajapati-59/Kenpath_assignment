export const SLOTS = {
  MORNING_FASTING: 'Morning (fasting)',
  AFTER_BREAKFAST: 'After breakfast',
  AFTER_LUNCH: 'After lunch',
  AFTER_DINNER: 'After dinner',
} as const

export type Slot = keyof typeof SLOTS
export const SLOT_KEYS = Object.keys(SLOTS) as Slot[]

export interface Reading {
  id: number
  date: string
  slot: Slot
  value: number
}

export interface ReadingInput {
  date: string
  slot: Slot | ''
  value: string
}

export type FieldErrors = Partial<Record<keyof ReadingInput, string>>

const pad = (n: number) => String(n).padStart(2, '0')

/** Today's local date as YYYY-MM-DD. */
export function todayString(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Formats YYYY-MM-DD as e.g. "15 Oct 2026". */
export function formatDate(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Client-side mirror of the API's field validation (the API re-checks everything). */
export function validateReading(input: ReadingInput, today = todayString()): FieldErrors {
  const errors: FieldErrors = {}
  if (input.value.trim() === '') {
    errors.value = 'Please enter a glucose value.'
  } else {
    const n = Number(input.value)
    if (!Number.isInteger(n) || n < 40 || n > 600) errors.value = 'Value must be between 40 and 600 mg/dl.'
  }
  if (!input.date) errors.date = 'Please select a valid date.'
  else if (input.date > today) errors.date = 'Date cannot be in the future.'
  if (!input.slot) errors.slot = 'Please select a time slot.'
  return errors
}
