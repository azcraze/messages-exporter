// src/scripts/groupConversations.js

const {
  getSimplifiedMessages,
} = require("../modules/getSimplifiedMessages");
const {
  groupMessagesByInactivity,
} = require("../modules/groupConversationsByTime");
const { format } = require("date-fns");
const fs = require("fs");

(async () => {
  const data = require("../data/data.json");
  const simplifiedMessages = getSimplifiedMessages(data);

  console.log(
    `Total simplified messages: ${simplifiedMessages.length}`,
  );
  if (simplifiedMessages.length === 0) {
    console.warn("No messages to process. Exiting...");
    return;
  }

  const messagesByDate = {};

  // Organize messages into date buckets
  console.log("Organizing messages into date buckets...");
  simplifiedMessages.forEach((msg, index) => {
    const dateObj = new Date(msg.timestamp);
    if (isNaN(dateObj.getTime())) {
      console.warn("Invalid timestamp:", msg);
      return;
    }
    const dateStr = format(dateObj, "EEE, MMM dd, yyyy");
    if (!messagesByDate[dateStr]) {
      messagesByDate[dateStr] = [];
    }
    messagesByDate[dateStr].push({
      from: msg.sender,
      dateTime: msg.timestamp,
      message_text: msg.message_text,
      attachments: msg.attachments,
    });
  });

  // Prepare to output all conversations with unique IDs
  const allConversations = [];
  let conversationIdCounter = 0; // For unique ID assignment

  for (const dateStr in messagesByDate) {
    console.log(
      `Processing date: ${dateStr} (${messagesByDate[dateStr].length} messages)`,
    );
    const grouped = groupMessagesByInactivity(
      messagesByDate[dateStr],
      dateStr,
    );

    console.log(
      `- Found ${grouped.conversations.length} conversations on ${dateStr}`,
    );

    // Assign a unique ID to each conversation
    grouped.conversations.forEach((convo) => {
      allConversations.push({
        conversationId: conversationIdCounter++, // unique ID
        date: dateStr,
        conversationMsgs: convo.conversationMsgs,
        messageCount: convo.conversationMsgs.length,
      });
    });
  }

  // Ensure output directory exists
  const outputDir = "../output"; // keep your known path
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save the entire list
  fs.writeFileSync(
    `${outputDir}/conversations.json`,
    JSON.stringify(allConversations, null, 2),
  );

  console.log(
    `Saved ${allConversations.length} conversations with IDs to ${outputDir}/conversations.json`,
  );
})();
