/**
 * run.js
 *
 * Process-from-file entry point.
 * Reads a previously saved data/data.json, runs the full pipeline,
 * and writes all outputs to ./output/.
 *
 * Usage:  node run.js [path/to/data.json]
 */

const { readJsonFile, saveJSON }    = require('./utils/fileIO');
const { generateConversationCounts } = require('./utils/getConversationSummary');
const { countItemsInOutputFiles }   = require('./utils/countOutputItems');
const { runPipeline }               = require('./lib/pipeline');

async function run() {
  const inputPath = process.argv[2] || './data/data.json';

  let rawMessages;
  try {
    rawMessages = readJsonFile(inputPath);
  } catch (e) {
    console.error(`Could not read ${inputPath}:`, e.message);
    process.exit(1);
  }

  console.log(`Loaded ${rawMessages.length} raw messages from ${inputPath}`);

  const results = runPipeline(rawMessages);

  saveJSON(results.simplified,          'simplified_messages.json');
  console.log(`Simplified messages:       ${results.simplified.length}`);

  saveJSON(results.conversations,        'conversations.json');
  console.log(`Conversations:             ${results.conversations.length}`);

  saveJSON(results.dailyCounts,          'daily_counts.json');
  console.log(`Days with messages:        ${results.dailyCounts.length}`);

  saveJSON(results.largeConversations,   'large_conversations.json');
  console.log(`Large conversations (≥15): ${results.largeConversations.length}`);

  saveJSON(results.longMessages,         'long_char_messages.json');
  console.log(`Long messages (≥300 ch):  ${results.longMessages.length}`);

  generateConversationCounts('./output/conversations.json', './output/conversation_summary.json');

  const counts = countItemsInOutputFiles('./output');
  console.log('\nOutput file item counts:');
  Object.keys(counts).forEach(function(f) { console.log(`  ${f}: ${counts[f]}`); });

  console.log('\nProcessing complete. Files saved to ./output/');
}

run().catch(function(err) {
  console.error('Fatal error:', err);
  process.exit(1);
});
