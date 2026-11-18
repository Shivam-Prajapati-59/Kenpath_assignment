const { isValidDateString, todayString } = require('./dates');

const SLOTS = {
  MORNING_FASTING: 'Morning (fasting)',
  AFTER_BREAKFAST: 'After breakfast',
  AFTER_LUNCH: 'After lunch',
  AFTER_DINNER: 'After dinner',
};
const SLOT_ORDER = Object.keys(SLOTS);
const MAX_READINGS_PER_DAY = 4;
const MIN_VALUE = 40;
const MAX_VALUE = 600;

const MESSAGES = {
  valueRequired: 'Please enter a glucose value.',
  valueRange: `Value must be between ${MIN_VALUE} and ${MAX_VALUE} mg/dl.`,
  dateRequired: 'Please select a valid date.',
  dateFuture: 'Date cannot be in the future.',
  slotInvalid: 'Please select a time slot.',
  maxPerDay: `You can add only ${MAX_READINGS_PER_DAY} readings per day.`,
  duplicateSlot: (slot) => `You already have an ${SLOTS[slot]} reading for this date.`,
};

/**
 * Field-level validation that does not need the database.
 * Returns { errors, data } where errors is a { field: message } map (empty when valid).
 */
function validateReadingInput(input = {}, today = todayString()) {
  const errors = {};
  const { date, slot } = input;
  let { value } = input;

  if (value === undefined || value === null || String(value).trim() === '') {
    errors.value = MESSAGES.valueRequired;
  } else {
    const num = Number(value);
    if (!Number.isInteger(num) || num < MIN_VALUE || num > MAX_VALUE) {
      errors.value = MESSAGES.valueRange;
    } else {
      value = num;
    }
  }

  if (!isValidDateString(date)) {
    errors.date = MESSAGES.dateRequired;
  } else if (date > today) {
    errors.date = MESSAGES.dateFuture;
  }

  if (!SLOT_ORDER.includes(slot)) {
    errors.slot = MESSAGES.slotInvalid;
  }

  return { errors, data: { date, slot, value } };
}

module.exports = {
  SLOTS,
  SLOT_ORDER,
  MAX_READINGS_PER_DAY,
  MESSAGES,
  validateReadingInput,
};
