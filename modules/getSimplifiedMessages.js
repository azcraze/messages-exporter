const { cleanMessage } = require('../utils/messageCleaner');

/**
 * Takes raw converter output (array of message objects), cleans each one,
 * and returns a flat array sorted chronologically by date.
 *
 * @param {Array<Object>} messages - Raw messages from the DB converter
 * @returns {Array<Object>} Cleaned, sorted messages
 */
function getSimplifiedMessages(messages) {
  if (!Array.isArray(messages)) return [];

  return messages
    .map((msg) => cleanMessage(msg))
    .sort((a, b) => {
      const ta = a.date === 'Unknown Date' ? Number.MAX_SAFE_INTEGER : new Date(a.date).getTime();
      const tb = b.date === 'Unknown Date' ? Number.MAX_SAFE_INTEGER : new Date(b.date).getTime();
      return ta - tb;
    });
}

module.exports = { getSimplifiedMessages };
