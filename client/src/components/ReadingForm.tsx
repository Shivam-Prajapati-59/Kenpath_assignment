import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ApiError } from '@/lib/api'
import { SLOTS, SLOT_KEYS, todayString, validateReading, type FieldErrors, type ReadingInput } from '@/lib/readings'

interface Props {
  initial?: Partial<ReadingInput>
  submitLabel?: string
  onSubmit: (data: { date: string; slot: string; value: number }) => Promise<void>
}

const selectClass =
  'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50'

export function ReadingForm({ initial, submitLabel = 'Add reading', onSubmit }: Props) {
  const [form, setForm] = useState<ReadingInput>({
    date: initial?.date ?? todayString(),
    slot: initial?.slot ?? '',
    value: initial?.value ?? '',
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(initial?.slot)

  const update = (field: keyof ReadingInput) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((errs) => ({ ...errs, [field]: undefined }))
    setFormError('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const clientErrors = validateReading(form)
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length) return

    setSaving(true)
    setFormError('')
    try {
      await onSubmit({ date: form.date, slot: form.slot, value: Number(form.value) })
      if (!isEdit) setForm((f) => ({ ...f, slot: '', value: '' }))
    } catch (err) {
      if (err instanceof ApiError) {
        // Show server rule errors (duplicate slot, max per day...) as one clear message.
        setFormError(err.message)
      } else {
        setFormError('Could not save the reading. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="reading-date">Date</Label>
        <Input id="reading-date" type="date" max={todayString()} value={form.date} onChange={update('date')} />
        {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reading-slot">Time slot</Label>
        <select id="reading-slot" className={selectClass} value={form.slot} onChange={update('slot')}>
          <option value="">Select a slot</option>
          {SLOT_KEYS.map((key) => (
            <option key={key} value={key}>
              {SLOTS[key]}
            </option>
          ))}
        </select>
        {errors.slot && <p className="text-sm text-destructive">{errors.slot}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reading-value">Glucose (mg/dl)</Label>
        <Input
          id="reading-value"
          type="number"
          inputMode="numeric"
          placeholder="e.g. 120"
          value={form.value}
          onChange={update('value')}
        />
        {errors.value && <p className="text-sm text-destructive">{errors.value}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}
