import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReadingForm } from './ReadingForm'
import { ApiError } from '@/lib/api'

function setup(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  render(<ReadingForm onSubmit={onSubmit} />)
  return { onSubmit, user: userEvent.setup() }
}

describe('ReadingForm', () => {
  test('shows an error when the value is missing', async () => {
    const { onSubmit, user } = setup()
    await user.selectOptions(screen.getByLabelText('Time slot'), 'AFTER_LUNCH')
    await user.click(screen.getByRole('button', { name: 'Add reading' }))
    expect(screen.getByText('Please enter a glucose value.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  test('shows an error when the value is out of range', async () => {
    const { onSubmit, user } = setup()
    await user.selectOptions(screen.getByLabelText('Time slot'), 'AFTER_LUNCH')
    await user.type(screen.getByLabelText('Glucose (mg/dl)'), '700')
    await user.click(screen.getByRole('button', { name: 'Add reading' }))
    expect(screen.getByText('Value must be between 40 and 600 mg/dl.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  test('shows an error for a future date', async () => {
    const { user } = setup()
    const date = screen.getByLabelText('Date')
    await user.clear(date)
    await user.type(date, '2999-01-01')
    await user.click(screen.getByRole('button', { name: 'Add reading' }))
    expect(screen.getByText('Date cannot be in the future.')).toBeInTheDocument()
  })

  test('submits a valid reading as a number', async () => {
    const { onSubmit, user } = setup()
    await user.selectOptions(screen.getByLabelText('Time slot'), 'MORNING_FASTING')
    await user.type(screen.getByLabelText('Glucose (mg/dl)'), '110')
    await user.click(screen.getByRole('button', { name: 'Add reading' }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ slot: 'MORNING_FASTING', value: 110 }))
  })

  test('shows the server error, e.g. a duplicate slot', async () => {
    const message = 'You already have an After lunch reading for this date.'
    const { user } = setup(vi.fn().mockRejectedValue(new ApiError(400, message)))
    await user.selectOptions(screen.getByLabelText('Time slot'), 'AFTER_LUNCH')
    await user.type(screen.getByLabelText('Glucose (mg/dl)'), '140')
    await user.click(screen.getByRole('button', { name: 'Add reading' }))
    expect(await screen.findByText(message)).toBeInTheDocument()
  })
})
