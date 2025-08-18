// main.js
const { importData } = require("./index"); // Fixed: import function directly
const { format } = require("date-fns");
const path = require("path");
const expandHomeDir = require("expand-home-dir");
const fs = require("fs");

async function runPipeline() {
  // Determine the database path
  const dbPathInput = process.argv[2] || "~/Library/Messages/chat.db";
  const dbPath = expandHomeDir(dbPathInput);

  // Options, can be extended or made dynamic
  const options = {
    debug: false,
    showProgress: true,
    // add other options if needed
  };

  try {
    // Load raw messages from database
    const rawMessages = await importData(dbPath, options); // Call the function imported from index.js

    // Process data similarly to your run.js

    // Convert to simplified
    const {
      getSimplifiedMessages,
    } = require("./modules/getSimplifiedMessages");
    const simplified = getSimplifiedMessages({ messages: rawMessages });
    await saveJSON(simplified, "simplified.json");

    // Group by date
    const messagesByDate = {};
    simplified.forEach((msg) => {
      const dateObj = new Date(msg.date);
      const dateStr = format(dateObj, "EEE, MMM dd, yyyy");
      if (!messagesByDate[dateStr]) messagesByDate[dateStr] = [];
      messagesByDate[dateStr].push(msg);
    });

    // Group messages into conversations by inactivity
    const {
      groupMessagesByInactivity,
    } = require("./modules/groupConversationsByTime");
    const allConversations = [];
    for (const dateStr in messagesByDate) {
      const group = groupMessagesByInactivity(
        messagesByDate[dateStr],
        dateStr,
      );
      allConversations.push(group);
    }
    await saveJSON(allConversations, "grouped_conversations.json");

    // Count messages per day
    const {
      countMessagesPerDay,
    } = require("./modules/countMessagesPerDay");
    const dailyCounts = countMessagesPerDay(simplified);
    await saveJSON(dailyCounts, "daily_counts.json");

    // Large conversations filter
    const {
      filterGroupedConversations,
    } = require("./modules/filterLargeConversations");
    const largeConv = filterGroupedConversations(allConversations, 15);
    await saveJSON(largeConv, "large_conversations.json");

    // Long messages
    const {
      getHighCharMessages,
    } = require("./modules/highCharMessages");
    const longMessages = getHighCharMessages(simplified);
    await saveJSON(longMessages, "long_char_messages.json");

    console.log("Processing complete.");
  } catch (err) {
    console.error("Error during processing:", err);
  }
}

// Utility function
async function saveJSON(data, filename) {
  const outputDir = "./output";
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
  fs.writeFileSync(
    path.join(outputDir, filename),
    JSON.stringify(data, null, 2),
    "utf8",
  );
}

runPipeline();
