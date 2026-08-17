/**
 * reports/question-response-time-report.js
 *
 * Latency between a question and its paired answer, overall and per
 * answerer/asker/pair.
 *
 * build(result) → { data, sections }
 * result = output of computeQuestionResponseTime()
 */

var { formatNumber, formatDuration } = require('../lib/reporters/base-reporter');

function build(result) {
  if (!result || typeof result !== 'object') {
    result = { overall: { mean: null, median: null, count: 0 }, byAnswerer: {}, byAsker: {}, byPair: {} };
  }

  var data     = result;
  var sections = [];

  sections.push({ type: 'heading', level: 2, text: 'Question Response Time' });

  var overall = result.overall || { mean: null, median: null, count: 0 };
  sections.push({
    type: 'kv',
    pairs: [
      ['Paired questions with latency', formatNumber(overall.count || 0)],
      ['Mean latency',                  formatDuration(overall.mean)],
      ['Median latency',                formatDuration(overall.median)],
    ],
  });
  sections.push({ type: 'blank' });

  function summaryTable(title, byGroup, groupLabel) {
    var groups = Object.keys(byGroup || {});
    if (groups.length === 0) return;

    var rows = groups
      .map(function(g) {
        var s = byGroup[g];
        return [g, formatDuration(s.mean), formatDuration(s.median), formatNumber(s.count)];
      })
      .sort(function(a, b) { return parseInt(b[3].replace(/,/g, '')) - parseInt(a[3].replace(/,/g, '')); });

    sections.push({ type: 'heading', level: 3, text: title });
    sections.push({
      type:    'table',
      headers: [groupLabel, 'Mean', 'Median', 'Count'],
      aligns:  ['left', 'right', 'right', 'right'],
      rows:    rows,
    });
    sections.push({ type: 'blank' });
  }

  summaryTable('By Answerer (how fast they answer questions asked of them)', result.byAnswerer, 'Answerer');
  summaryTable('By Asker (how fast their questions get answered)', result.byAsker, 'Asker');
  summaryTable('By Asker → Answerer Pair', result.byPair, 'Pair');

  return { data, sections };
}

module.exports = { build };
