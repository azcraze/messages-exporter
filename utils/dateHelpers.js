const {
  parseISO,
  isValid,
  isAfter,
  isBefore,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  format,
  getHours,
  getDay,
  differenceInMinutes,
  differenceInDays,
  addDays,
} = require('date-fns');

function parseAndValidateDate(dateStr) {
  const date = parseISO(dateStr);
  return { date, isValid: isValid(date) };
}

module.exports = {
  parseISO,
  isValid,
  isAfter,
  isBefore,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  format,
  getHours,
  getDay,
  differenceInMinutes,
  differenceInDays,
  addDays,
  parseAndValidateDate,
};
