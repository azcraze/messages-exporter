// src/utils/dateHelpers.js
const { parseISO, isValid, startOfDay, format } = require('date-fns');

function parseAndValidateDate(dateStr) {
  const date = parseISO(dateStr);
  return { date, isValid: isValid(date) };
}

module.exports = {
  parseISO,
  isValid,
  startOfDay,
  format,
  parseAndValidateDate
};
