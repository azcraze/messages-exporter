/**
 * scripts/analyze-tfidf.js
 *
 * Standalone entry point for the TF-IDF analysis family — runs just the 7
 * TF-IDF features (see scripts/tfidf-suite.js) without running the other 14
 * features in scripts/analyze.js. This is the first feature family carved
 * out of the monolithic full-analysis script; later families can follow the
 * same lib/analyze-shared.js + scripts/<family>-suite.js pattern.
 *
 * Usage:
 *   node scripts/analyze-tfidf.js [path/to/data.json] [--query "text"]
 *
 * Input:  data/data.json  (or the path provided)
 * Output: output/tfidf*.json           — intermediate data per feature
 *         output/reports/tfidf*.md     — markdown reports
 *         output/reports/tfidf*.csv    — CSV data files
 *
 * --query enables the TF-IDF relevance-search feature (ranks messages by
 * term-weighted relevance to the given text); omit it to skip that feature.
 */

'use strict';

var { loadContext }   = require('../lib/analyze-shared');
var { runTfidfSuite }  = require('./tfidf-suite');

function parseArgs(argv) {
  var inputPath = './data/data.json';
  var query     = null;

  var rest = argv.slice(2);
  var queryIdx = rest.indexOf('--query');
  if (queryIdx !== -1) {
    query = rest[queryIdx + 1] || null;
    rest.splice(queryIdx, 2);
  }
  if (rest[0]) inputPath = rest[0];

  return { inputPath: inputPath, query: query };
}

function main() {
  var args = parseArgs(process.argv);

  var ctx;
  try {
    ctx = loadContext(args.inputPath);
  } catch (e) {
    console.error('Could not read ' + args.inputPath + ':', e.message);
    process.exit(1);
  }
  console.log('Loaded ' + ctx.msgCount + ' simplified messages from ' + args.inputPath);

  var written = runTfidfSuite(ctx, { query: args.query });

  console.log('\n✓ TF-IDF suite complete. ' + written.length + ' features processed.\n');
  console.log('JSON data:   ./output/');
  console.log('Reports:     ./output/reports/\n');
  console.log('Files written:');
  written.forEach(function(name) {
    console.log('  ./output/' + name + '.json');
    console.log('  ./output/reports/' + name + '.md');
  });
}

main();
