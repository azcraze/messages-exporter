// src/modules/filterLargeConversations.js

const { format } = require("../utils/dateHelpers");

/**
 * Filters conversations with >= minMessages.
 * @param {Array<Object>} groupedConversations - Array of { date, conversationMsgs }
 * @param {Number} minMessages
 * @returns {Array<Object>} with formatted date.
 */
function filterGroupedConversations(
  groupedConversations,
  minMessages = 15,
) {
  if (!Array.isArray(groupedConversations)) return [];

  return groupedConversations
    .filter(
      (convo) =>
        Array.isArray(convo.conversationMsgs) &&
        convo.conversationMsgs.length >= minMessages,
    )
    .map((convo) => {
      const dateStr =
        convo.conversationMsgs.length > 0
          ? convo.conversationMsgs[0].dateTime
          : null;
      const dateObj = dateStr ? new Date(dateStr) : null;

      const formattedDate =
        dateObj && !isNaN(dateObj)
          ? format(dateObj, "EEE, MMM dd, yyyy")
          : "Unknown";

      return {
        date: formattedDate,
        conversation_msgs: convo.conversationMsgs,
      };
    });
}

module.exports = { filterGroupedConversations };
