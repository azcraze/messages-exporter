// src/modules/highCharMessages.js

const { format, parseISO } = require("../utils/dateHelpers");

/**
 * Extracts messages >=300 characters with standardized info.
 * @param {Array<Object>} messages
 * @returns {Array<Object>} e.g., { date, timestamp, sender, message_text, message_length }
 */
function getHighCharMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter((msg) => msg.message_text && msg.message_text.length >= 300)
    .map((msg) => {
      const sender = msg.is_from_me === 1 ? "ASH" : "BRY";
      const dateObj = msg.date ? new Date(msg.date) : null;
      const dateFormatted =
        dateObj && isValid(dateObj)
          ? format(dateObj, "EEE, MMM dd, yyyy")
          : "Unknown Date";

      return {
        date: dateFormatted,
        timestamp: msg.date || null,
        sender,
        message_text: msg.message_text,
        message_length: msg.message_text.length,
      };
    });
}

module.exports = { getHighCharMessages };
