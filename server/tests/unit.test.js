const { getReportRange, isValidDateString } = require('../src/utils/dates');
const { validateReadingInput, MESSAGES } = require('../src/utils/validation');

const TODAY = '2026-10-15';
const valid = { date: '2026-10-15', slot: 'AFTER_LUNCH', value: 120 };

describe('validateReadingInput', () => {
  test('accepts a valid reading', () => {
    expect(validateReadingInput(valid, TODAY).errors).toEqual({});
  });

  test.each([undefined, null, ''])('value %p is required', (value) => {
    expect(validateReadingInput({ ...valid, value }, TODAY).errors.value).toBe(MESSAGES.valueRequired);
  });

  test.each([39, 601, 120.5, 'abc', -5])('value %p is out of range', (value) => {
    expect(validateReadingInput({ ...valid, value }, TODAY).errors.value).toBe(
      'Value must be between 40 and 600 mg/dl.',
    );
  });

  test.each([40, 600, '250'])('value %p at the boundary is accepted', (value) => {
    expect(validateReadingInput({ ...valid, value }, TODAY).errors).toEqual({});
  });

  test('rejects future dates', () => {
    expect(validateReadingInput({ ...valid, date: '2026-10-16' }, TODAY).errors.date).toBe(
      'Date cannot be in the future.',
    );
  });

  test('rejects an unknown slot', () => {
    expect(validateReadingInput({ ...valid, slot: 'SNACK' }, TODAY).errors.slot).toBeDefined();
  });

  test('duplicate slot message uses the slot label', () => {
    expect(MESSAGES.duplicateSlot('AFTER_LUNCH')).toBe('You already have an After lunch reading for this date.');
  });
});

describe('dates', () => {
  test('isValidDateString rejects impossible dates', () => {
    expect(isValidDateString('2026-02-30')).toBe(false);
    expect(isValidDateString('2026-02-28')).toBe(true);
    expect(isValidDateString('15-10-2026')).toBe(false);
  });

  test('report ranges match the spec example (15 Oct 2026)', () => {
    expect(getReportRange('daily', '2026-10-15')).toEqual({ from: '2026-10-15', to: '2026-10-15' });
    expect(getReportRange('mtd', '2026-10-15')).toEqual({ from: '2026-10-01', to: '2026-10-15' });
    expect(getReportRange('monthly', '2026-10-15')).toEqual({ from: '2026-09-01', to: '2026-09-30' });
  });

  test('monthly report in January covers December of the previous year', () => {
    expect(getReportRange('monthly', '2026-01-10')).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });

  test('monthly report handles leap-year February', () => {
    expect(getReportRange('monthly', '2028-03-05')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });
});
