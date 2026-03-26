// src/modules/groupConversationsByTime.js

const { format } = require("date-fns");

/**
 * Groups messages into conversations based on inactivity gap.
 * @param {Array<Object>} messages - array of messages with dateTime in ISO format.
 * @param {String} dateStr - human-readable date string for logging.
 * @param {Number} gapHours - inactivity gap in hours, default 3.
 * @returns {Object} - { date: <dateStr>, conversations: Array }
 */
function groupMessagesByInactivity(messages, dateStr, gapHours = 3) {
  if (!Array.isArray(messages))
    return { date: dateStr, conversations: [] };

  // Map messages and parse dateTime
  const msgsWithDate = messages
    .map((msg) => {
      const dateObj = new Date(msg.date);
      return {
        ...msg,
        dateObj,
      };
    })
    .filter((m) => m.dateObj && !isNaN(m.dateObj))
    .sort((a, b) => a.dateObj - b.dateObj);

  const conversations = [];
  let currentConvMsgs = [];
  let conversationID = 1;

  for (let i = 0; i < msgsWithDate.length; i++) {
    const currentMsg = msgsWithDate[i];

    if (currentConvMsgs.length === 0) {
      // Start new conversation
      currentConvMsgs.push(currentMsg);
    } else {
      // Check time difference from previous message
      const prevMsg = msgsWithDate[i - 1];
      const diffHours =
        (currentMsg.dateObj - prevMsg.dateObj) / (1000 * 60 * 60); // hours

      if (diffHours >= gapHours) {
        // Break, start new conversation
        conversations.push({
          conversationID,
          conversationMsgs: currentConvMsgs,
        });
        conversationID++;
        currentConvMsgs = [currentMsg];
      } else {
        // Continue current conversation
        currentConvMsgs.push(currentMsg);
      }
    }
  }

  // Push the last conversation
  if (currentConvMsgs.length > 0) {
    conversations.push({
      conversationID,
      conversationMsgs: currentConvMsgs,
    });
  }

  return { date: dateStr, conversations };
}

module.exports = { groupMessagesByInactivity };
