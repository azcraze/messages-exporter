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

  // Map to expected shape — use msg.date (not msg.timestamp which doesn't exist)
  // Pass the full stream at once so conversations spanning midnight are not split
  const msgs = simplifiedMessages.map((msg) => ({
    from: msg.sender,
    date: msg.date,
    message_text: msg.message_text,
    attachments: msg.attachments,
  }));

  const grouped = groupMessagesByInactivity(msgs, null);

  const allConversations = grouped.conversations.map((convo, index) => {
    const firstMsg = convo.conversationMsgs[0];
    const dateStr =
      firstMsg && firstMsg.date && firstMsg.date !== "Unknown Date"
        ? format(new Date(firstMsg.date), "EEE, MMM dd, yyyy")
        : "Unknown Date";
    return {
      conversationId: index,
      date: dateStr,
      conversationMsgs: convo.conversationMsgs,
      messageCount: convo.conversationMsgs.length,
    };
  });

  // Ensure output directory exists
  const outputDir = "./output";
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save the entire list
  fs.writeFileSync(
    `${outputDir}/conversations.json`,
    JSON.stringify(allConversations, null, 2),
  );

  console.log(
    `Saved ${allConversations.length} conversations to ${outputDir}/conversations.json`,
  );
})();
