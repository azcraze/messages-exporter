/**
 * reports/sentiment-report.js
 *
 * Overall tone, per-participant sentiment, and trend over time.
 *
 * build(messages) → { data, sections }
 */

var { sentimentAnalysis } = require('../modules/nlp/sentimentAnalysis');
var { formatNumber, formatFloat, formatDate } = require('../lib/reporters/base-reporter');

function scoreLabel(score) {
  if (score >  0.5) return 'Very Positive';
  if (score >  0.1) return 'Positive';
  if (score >= -0.1) return 'Neutral';
  if (score >= -0.5) return 'Negative';
  return 'Very Negative';
}

function build(messages) {
  if (!Array.isArray(messages)) messages = [];

  var result = sentimentAnalysis(messages);
  var data   = result;

  // Per-participant table
  var partRows = Object.keys(result.byParticipant || {}).map(function(addr) {
    var ps = result.byParticipant[addr];
    return [
      addr,
      formatFloat(ps.mean, 2),
      scoreLabel(ps.mean),
      formatNumber(ps.count),
      String(ps.positive),
      String(ps.negative),
      String(ps.neutral),
    ];
  }).sort(function(a, b) { return parseFloat(b[1]) - parseFloat(a[1]); });

  // Trend table (daily averages — last 12 entries for brevity)
  var dailyKeys = Object.keys(result.byDay || {}).sort();
  var trendKeys = dailyKeys.slice(-12);
  var trendRows = trendKeys.map(function(day) {
    var ds = result.byDay[day];
    return [formatDate(day), formatFloat(ds.mean, 2), scoreLabel(ds.mean), formatNumber(ds.count)];
  });

  var sections = [
    { type: 'heading', level: 2, text: 'Sentiment Overview' },
    {
      type: 'kv',
      pairs: [
        ['Overall score',   formatFloat(result.overall, 2)],
        ['Overall tone',    scoreLabel(result.overall)],
        ['Messages scored', formatNumber(result.scored)],
        ['Positive msgs',   formatNumber(result.positive)],
        ['Negative msgs',   formatNumber(result.negative)],
        ['Neutral msgs',    formatNumber(result.neutral)],
      ],
    },
    { type: 'blank' },
    {
      type: 'callout',
      label: 'Insight',
      text: 'The overall conversation tone is **' + scoreLabel(result.overall) + '** (score: ' + formatFloat(result.overall, 2) + ').',
    },
    { type: 'blank' },
    { type: 'heading', level: 2, text: 'Sentiment by Participant' },
    {
      type: 'table',
      headers: ['Participant', 'Mean Score', 'Tone', 'Messages', 'Positive', 'Negative', 'Neutral'],
      aligns:  ['left', 'right', 'left', 'right', 'right', 'right', 'right'],
      rows: partRows,
    },
    { type: 'blank' },
    { type: 'heading', level: 2, text: 'Sentiment Trend (Last 12 Days Active)' },
    trendRows.length > 0 ? {
      type: 'table',
      headers: ['Date', 'Mean Score', 'Tone', 'Messages'],
      aligns:  ['left', 'right', 'left', 'right'],
      rows: trendRows,
    } : { type: 'text', text: 'Insufficient data for trend.' },
  ];

  return { data, sections };
}

module.exports = { build };
