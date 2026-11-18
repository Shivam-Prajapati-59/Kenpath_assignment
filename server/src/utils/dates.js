// All dates are handled as 'YYYY-MM-DD' strings to avoid timezone surprises.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatDate(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Today's date in the server's local timezone, as YYYY-MM-DD. */
function todayString(now = new Date()) {
  return formatDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** True if the string is a real calendar date in YYYY-MM-DD form. */
function isValidDateString(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Date range for a report type, relative to the selected date.
 *  daily   -> the selected date
 *  mtd     -> 1st of the month .. selected date
 *  monthly -> whole previous month
 */
function getReportRange(type, selectedDate) {
  const [y, m] = selectedDate.split('-').map(Number);
  switch (type) {
    case 'daily':
      return { from: selectedDate, to: selectedDate };
    case 'mtd':
      return { from: formatDate(y, m, 1), to: selectedDate };
    case 'monthly': {
      const py = m === 1 ? y - 1 : y;
      const pm = m === 1 ? 12 : m - 1;
      return { from: formatDate(py, pm, 1), to: formatDate(py, pm, daysInMonth(py, pm)) };
    }
    default:
      throw new Error(`Unknown report type: ${type}`);
  }
}

module.exports = { todayString, isValidDateString, getReportRange };
