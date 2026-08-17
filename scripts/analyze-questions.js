/**
 * scripts/analyze-questions.js
 *
 * Standalone entry point for the question-detection analysis family — runs
 * just the 8 question features (see scripts/question-suite.js) without
 * running the other features in scripts/analyze.js. Mirrors
 * scripts/analyze-tfidf.js.
 *
 * Usage:
 *   node scripts/analyze-questions.js [path/to/data.json]
 *
 * Input:  data/data.json  (or the path provided)
 * Output: output/question-*.json / output/unanswered-questions.json / output/rhetorical-questions.json
 *         output/reports/*.md
 *         output/reports/*.csv
 */

'use strict';

var { loadContext }     = require('../lib/analyze-shared');
var { runQuestionSuite } = require('./question-suite');

function main() {
  var inputPath = process.argv[2] || './data/data.json';

  var ctx;
  try {
    ctx = loadContext(inputPath);
  } catch (e) {
    console.error('Could not read ' + inputPath + ':', e.message);
    process.exit(1);
  }
  console.log('Loaded ' + ctx.msgCount + ' simplified messages from ' + inputPath);

  var written = runQuestionSuite(ctx);

  console.log('\n✓ Question suite complete. ' + written.length + ' features processed.\n');
  console.log('JSON data:   ./output/');
  console.log('Reports:     ./output/reports/\n');
  console.log('Files written:');
  written.forEach(function(name) {
    console.log('  ./output/' + name + '.json');
    console.log('  ./output/reports/' + name + '.md');
  });
}

main();
