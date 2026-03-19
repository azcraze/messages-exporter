// src/run.js

const { readJsonFile } = require("./utils/fileIO");
const { format } = require("date-fns");

// Import modules
const {
  getSimplifiedMessages,
} = require("./modules/getSimplifiedMessages");
const {
  countMessagesPerDay,
} = require("./modules/countMessagesPerDay");
const {
  filterMessagesByParticipant,
  filterMessagesByDateRange,
  filterMessagesByText,
  getMessagesWithAttachments,
} = require("./modules/messageFiltering");
const {
  groupMessagesByInactivity,
} = require("./modules/groupConversationsByTime");
const { getHighCharMessages } = require("./modules/highCharMessages");
const {
  filterGroupedConversations,
} = require("./modules/filterLargeConversations");
const { countItemsInOutputFiles } = require("./utils/countOutputItems");
const {
  generateConversationCounts,
} = require("./utils/getConversationSummary");
const fs = require("fs");

function saveJSON(data, filename) {
  const outputDir = "./output";
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
  fs.writeFileSync(
    `${outputDir}/${filename}`,
    JSON.stringify(data, null, 2),
  );
}

async function run() {
  try {
    // Load raw data
    const data = readJsonFile("./data/data.json");

    // Simplify messages
    const simplifiedMessages = getSimplifiedMessages(data);
    console.log(
      `Total simplified messages: ${simplifiedMessages.length}`,
    );
    saveJSON(simplifiedMessages, "simplified_messages.json");

    // Group messages by date
    const messagesByDate = {};
    simplifiedMessages.forEach((msg, index) => {
      // Parse timestamp
      const dateObj = new Date(msg.date);
      if (isNaN(dateObj.getTime())) {
        console.warn("Invalid date in message:", msg);
        return;
      }

      // Format date string
      const dateStr = format(dateObj, "EEE, MMM dd, yyyy");
      if (!messagesByDate[dateStr]) {
        messagesByDate[dateStr] = [];
      }

      // Collect message info for grouping
      messagesByDate[dateStr].push({
        from: msg.sender,
        date: msg.date,
        message_text: msg.message_text,
        attachments: msg.attachments,
      });
    });

    // Apply grouping per date
    const allConversations = [];
    for (const dateStr in messagesByDate) {
      console.log(
        `Grouping conversations for date: ${dateStr} (${messagesByDate[dateStr].length} messages)`,
      );
      const group = groupMessagesByInactivity(
        messagesByDate[dateStr],
        dateStr,
      );
      // Append each conversation with date info
      group.conversations.forEach((convo) => {
        allConversations.push({
          date: dateStr,
          conversation_msgs: convo.conversationMsgs,
        });
      });
    }

    // Save all grouped conversations
    saveJSON(allConversations, "conversations.json");
    console.log("All conversations saved.");

    // Filter for large conversations
    const largeConversations = filterGroupedConversations(
      allConversations,
      15,
    );
    saveJSON(largeConversations, "largeConversations.json");
    console.log("Large conversations (>15 msgs) saved.");

    // Count messages per day
    const dailyCounts = countMessagesPerDay(simplifiedMessages);
    saveJSON(dailyCounts, "daily_counts.json");
    console.log("Daily message counts saved.");

    // Extract long messages (>=300 chars)
    const longMessages = getHighCharMessages(simplifiedMessages);
    console.log(
      `Total long messages (>=300 chars): ${longMessages.length}`,
    );
    saveJSON(longMessages, "long_char_messages.json");

    const outputDir = "./output"; // or your output folder path
    const counts = countItemsInOutputFiles(outputDir);
    console.log("Item counts per file:", counts);
    // Optional filters (uncomment and customize as needed)
    // const filteredByParticipant = filterMessagesByParticipant(simplifiedMessages, '+1234567890');
    // saveJSON(filteredByParticipant, 'filtered_by_participant.json');

    // Provide the path to your saved conversations
    const inputFile = "./output/conversations.json";
    const outputFile = "./output/conversation_summary.json";

    generateConversationCounts(inputFile, outputFile);

    console.log("Processing complete. Files saved in ./output/");
  } catch (err) {
    console.error("Error during processing:", err);
  }
}

run();
