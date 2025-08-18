// src/modules/messageFiltering.js

const {
  parseISO,
  isAfter,
  isBefore,
  isValid,
} = require("./utils/dateHelpers");

/**
 * Filter messages by participant phone number.
 * No change needed.
 */
function filterMessagesByParticipant(messages, phoneNumber) {
  return messages.filter(
    (msg) =>
      msg.sender === phoneNumber ||
      (msg.participants && msg.participants.includes(phoneNumber)),
  );
}

/**
 * Filter messages within a date range.
 * Uses 'timestamp' instead of 'date'.
 */
function filterMessagesByDateRange(messages, startDateStr, endDateStr) {
  const startDate = startDateStr ? parseISO(startDateStr) : null;
  const endDate = endDateStr ? parseISO(endDateStr) : null;

  return messages.filter((msg) => {
    if (!msg.timestamp) return false; // use 'timestamp'
    const msgDate = new Date(msg.timestamp);
    if (!isValid(msgDate)) return false;

    if (
      startDate &&
      !isAfter(msgDate, startDate) &&
      +msgDate !== +startDate
    )
      return false;
    if (endDate && !isBefore(msgDate, endDate) && +msgDate !== +endDate)
      return false;

    return true;
  });
}

/**
 * Filter messages containing search text.
 */
function filterMessagesByText(messages, searchText) {
  const lowerSearch = searchText.toLowerCase();
  return messages.filter(
    (msg) =>
      msg.message_text &&
      msg.message_text.toLowerCase().includes(lowerSearch),
  );
}

/**
 * Get messages with attachments.
 */
function getMessagesWithAttachments(messages) {
  return messages.filter(
    (msg) =>
      Array.isArray(msg.attachments) && msg.attachments.length > 0,
  );
}

module.exports = {
  filterMessagesByParticipant,
  filterMessagesByDateRange,
  filterMessagesByText,
  getMessagesWithAttachments,
};
