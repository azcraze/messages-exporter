/**
 * reports/conversation-length-report.js
 *
 * Conversation length distribution with summary stats.
 *
 * build(result) → { data, sections }
 * result = output of conversationStats()
 */

var { formatNumber, formatFloat, asciiBar } = require('../lib/reporters/base-reporter');

function build(result) {
  if (!result || typeof result !== 'object') {
    result = { total: 0, totalMessages: 0, average: 0, median: 0, distribution: {} };
  }

  var data     = result;
  var sections = [];

  sections.push({ type: 'heading', level: 2, text: 'Conversation Length Distribution' });
  sections.push({
    type: 'kv',
    pairs: [
      ['Total conversations',    formatNumber(result.total || 0)],
      ['Total messages',         formatNumber(result.totalMessages || 0)],
      ['Average length',         formatFloat(result.average || 0, 1) + ' messages'],
      ['Median length',          formatFloat(result.median  || 0, 1) + ' messages'],
      ['Longest conversation',   result.longest  ? formatNumber(result.longest.messageCount)  + ' messages (' + (result.longest.date  || '—') + ')' : '—'],
      ['Shortest conversation',  result.shortest ? formatNumber(result.shortest.messageCount) + ' messages (' + (result.shortest.date || '—') + ')' : '—'],
    ],
  });
  sections.push({ type: 'blank' });

  // Distribution table with inline bar
  var dist = result.distribution || {};
  var buckets = ['1-5', '6-15', '16-30', '31-60', '60+'];
  var maxCount = Math.max.apply(null, buckets.map(function(b) { return dist[b] || 0; }));

  var distRows = buckets.map(function(b) {
    var count = dist[b] || 0;
    var pct   = result.total > 0 ? (count / result.total * 100).toFixed(1) : '0.0';
    return [b + ' msgs', formatNumber(count), pct + '%', asciiBar(count, maxCount, 16)];
  });

  sections.push({ type: 'heading', level: 3, text: 'Length Distribution' });
  sections.push({
    type:    'table',
    headers: ['Bucket', 'Conversations', '%', 'Bar'],
    aligns:  ['left', 'right', 'right', 'left'],
    rows:    distRows,
  });

  return { data, sections };
}

module.exports = { build };
