/**
 * main.js
 *
 * Live-import entry point.
 * Reads directly from an iOS backup or macOS chat.db, runs the full pipeline,
 * and writes all outputs to ./output/.
 *
 * Usage:
 *   node main.js [path]          – path to iOS backup dir or chat.db file
 *   node main.js system          – uses ~/Library/Messages/chat.db (macOS)
 *   node main.js                 – same as "system"
 */

const expandHomeDir = require('expand-home-dir');
const bfj           = require('bfj');
const path          = require('path');
const { importData }                 = require('./index');
const { saveJSON }                   = require('./utils/fileIO');
const { runPipeline }                = require('./lib/pipeline');

async function main() {
  let dbPathInput = process.argv[2] || 'system';
  if (dbPathInput === 'system') dbPathInput = '~/Library/Messages/chat.db';

  const dbPath = expandHomeDir(dbPathInput);
  console.log(`Importing from: ${dbPath}`);

  const options = { debug: false, showProgress: true };

  let rawMessages;
  try {
    rawMessages = await importData(dbPath, options);
  } catch (e) {
    console.error('Import failed:', e);
    process.exit(1);
  }

  console.log(`Imported ${rawMessages.length} messages.`);

  // Persist raw import so run.js can re-process without re-reading the DB
  const dataOutPath = path.join(__dirname, 'data', 'data.json');
  await bfj.write(dataOutPath, rawMessages, { space: 2 });
  console.log(`Raw messages saved to ${dataOutPath}`);

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

  console.log('\nDone. Files saved to ./output/');
}

main().catch(function(err) {
  console.error('Fatal error:', err);
  process.exit(1);
});
