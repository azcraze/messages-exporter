// ./modules/getSimplifiedMessages.js
const fs = require("fs");
const path = require("path");
const { cleanMessage } = require("../utils/messageCleaner"); // import your utility

const { v4: uuidv4 } = require("uuid");

/**
 * Helper: Parse date string into timestamp in ms.
 */
function getTimestamp(dateStr) {
  if (dateStr === "Unknown Date") {
    return Number.MAX_SAFE_INTEGER;
  }
  const date = new Date(dateStr);
  return isNaN(date.getTime())
    ? Number.MAX_SAFE_INTEGER
    : date.getTime();
}

/**
 * Group messages into conversations based on time proximity (2 hours window).
 */
function groupMessagesByTime(messages, timeWindowMs) {
  // sort messages by timestamp
  messages.sort((a, b) => getTimestamp(a.date) - getTimestamp(b.date));

  let currentConvId = uuidv4();
  let lastTimestamp = -1;

  for (let msg of messages) {
    const ts = getTimestamp(msg.date);
    if (lastTimestamp === -1 || ts - lastTimestamp > timeWindowMs) {
      // start new conversation
      currentConvId = uuidv4();
    }
    msg.conversationId = currentConvId;
    lastTimestamp = ts;
  }
}

/**
 * Main processing function
 */
function processMessages(inputFilePath) {
  // Read raw data
  const rawData = JSON.parse(fs.readFileSync(inputFilePath, "utf-8"));

  if (!rawData.messages || !Array.isArray(rawData.messages)) {
    throw new Error("Invalid data: messages array missing.");
  }

  // Use your messageCleaner.js for cleaning
  const cleanedMessages = rawData.messages.map((rawMsg) =>
    cleanMessage(rawMsg),
  );

  // Group messages by time proximity (2 hours)
  groupMessagesByTime(cleanedMessages, 2 * 60 * 60 * 1000);

  // Organize into conversations
  const conversationsMap = {};

  for (let msg of cleanedMessages) {
    const convId = msg.conversationId;
    if (!conversationsMap[convId]) {
      conversationsMap[convId] = {
        conversationId: convId,
        messages: [],
      };
    }
    conversationsMap[convId].messages.push(msg);
  }

  const conversations = Object.values(conversationsMap);
  return { conversations };
}

/**
 * Save conversations data
 */
function saveConversationsToFile(data, outputPath) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), "utf-8");
}

// Usage
const inputPath = "./data/data.json"; // set your actual input path
const outputPath = "output/simplified_messages.json";

try {
  const conversationsData = processMessages(inputPath);
  saveConversationsToFile(conversationsData, outputPath);
  console.log(`Conversations grouped and saved to ${outputPath}`);
} catch (err) {
  console.error(`Error: ${err.message}`);
}
