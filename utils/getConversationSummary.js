// src/utils/getConversationSummary.js

const fs = require("fs");

/**
 * Reads the existing conversations JSON file and outputs an array with conversationId and messageCount.
 * @param {string} inputFilePath - Path to conversations JSON (e.g., './output/conversations.json')
 * @returns {Array} - Array of objects with conversationId and messageCount
 */
function generateConversationCounts(inputFilePath) {
  if (!fs.existsSync(inputFilePath)) {
    console.error("Input file does not exist:", inputFilePath);
    return;
  }

  const rawData = fs.readFileSync(inputFilePath, "utf-8");
  let conversations;
  try {
    conversations = JSON.parse(rawData);
  } catch (err) {
    console.error("Error parsing JSON:", err);
    return;
  }

  // Map to array of { conversationId, messageCount }
  const summary = conversations.map((conv) => {
    return {
      conversationId: conv.conversationId,
      messageCount: conv.messageCount,
    };
  });

  return summary;
}

module.exports = { generateConversationCounts };
