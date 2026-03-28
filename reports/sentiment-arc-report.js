/**
 * reports/sentiment-arc-report.js
 *
 * Per-conversation sentiment arcs: emotional trajectory through each conversation.
 *
 * build(result) → { data, sections }
 * result = output of sentimentArcs()
 */

var { formatNumber, formatFloat } = require('../lib/reporters/base-reporter');

function build(result) {
  if (!result || typeof result !== 'object') result = { arcs: [] };

  var data     = result;
  var sections = [];

  sections.push({ type: 'heading', level: 2, text: 'Per-Conversation Sentiment Arcs' });

  var arcs = result.arcs || [];

  // Trend distribution
  var trendDist = { rising: 0, falling: 0, stable: 0, volatile: 0 };
  arcs.forEach(function(a) { if (trendDist[a.trend] != null) trendDist[a.trend]++; });

  sections.push({
    type: 'kv',
    pairs: [
      ['Conversations analysed', formatNumber(arcs.length)],
      ['Rising (warmer ending)',  formatNumber(trendDist.rising)],
      ['Falling (cooler ending)', formatNumber(trendDist.falling)],
      ['Stable',                  formatNumber(trendDist.stable)],
      ['Volatile',                formatNumber(trendDist.volatile)],
    ],
  });
  sections.push({ type: 'blank' });

  // Trend distribution table
  var distRows = [
    ['rising',   '↑ Rising',   String(trendDist.rising)],
    ['falling',  '↓ Falling',  String(trendDist.falling)],
    ['stable',   '→ Stable',   String(trendDist.stable)],
    ['volatile', '↕ Volatile', String(trendDist.volatile)],
  ];
  sections.push({ type: 'heading', level: 3, text: 'Arc Trend Distribution' });
  sections.push({
    type:    'table',
    headers: ['Trend', 'Label', 'Count'],
    aligns:  ['left', 'left', 'right'],
    rows:    distRows,
  });
  sections.push({ type: 'blank' });

  // Top conversations by absolute delta
  var topByDelta = arcs.slice().sort(function(a, b) {
    return Math.abs(b.delta) - Math.abs(a.delta);
  }).slice(0, 20);

  if (topByDelta.length > 0) {
    sections.push({ type: 'heading', level: 3, text: 'Conversations with Largest Sentiment Shift' });
    var rows = topByDelta.map(function(a) {
      return [
        a.conversationId != null ? String(a.conversationId) : '—',
        a.date ? a.date.slice(0, 10) : '—',
        formatNumber(a.messageCount),
        formatFloat(a.firstHalfMean, 3),
        formatFloat(a.secondHalfMean, 3),
        (a.delta >= 0 ? '+' : '') + formatFloat(a.delta, 3),
        a.trend,
      ];
    });
    sections.push({
      type:    'table',
      headers: ['Conv ID', 'Date', 'Messages', 'First Half', 'Second Half', 'Delta', 'Trend'],
      aligns:  ['right', 'left', 'right', 'right', 'right', 'right', 'left'],
      rows:    rows,
    });
  }

  return { data, sections };
}

module.exports = { build };
