// src/modules/countMessagesPerDay.js

const {
  parseISO,
  isValid,
  startOfDay,
  format,
} = require("../utils/dateHelpers");
const _ = require("lodash");

/**
 * Counts messages per day, with formatted and ISO date keys.
 * @param {Array<Object>} messages
 * @returns {Array<Object>} E.g., [{ date: 'Mon, Jan 01, 2023', isoDate: '2023-01-01', message_count: 5 }]
 */
function countMessagesPerDay(messages) {
  if (!Array.isArray(messages)) return [];

  const validMessages = messages
    .filter((msg) => {
      if (!msg.date) return false;
      const parsedDate = parseISO(msg.date);
      return isValid(parsedDate);
    })
    .map((msg) => {
      const parsedDate = parseISO(msg.date);
      return { ...msg, parsedDate };
    });

  const groupedByDay = _.groupBy(validMessages, (msg) =>
    format(startOfDay(msg.parsedDate), "yyyy-MM-dd"),
  );

  return Object.keys(groupedByDay)
    .sort()
    .map((dateKey) => {
      const messagesInDay = groupedByDay[dateKey];
      const dateObj = messagesInDay[0].parsedDate;
      return {
        date: format(dateObj, "EEE, MMM dd, yyyy"),
        isoDate: dateKey,
        message_count: messagesInDay.length,
      };
    });
}

module.exports = { countMessagesPerDay };
