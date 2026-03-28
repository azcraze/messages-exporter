/**
 * reports/emoji-report.js
 *
 * Emoji usage frequency overall and per sender.
 *
 * build(result) → { data, sections }
 * result = output of emojiStats({ perSender: true })
 */

var { formatNumber } = require('../lib/reporters/base-reporter');

function build(result) {
  if (!result || typeof result !== 'object') {
    result = { total: 0, unique: 0, topN: [], perSender: {} };
  }

  var data     = result;
  var sections = [];

  sections.push({ type: 'heading', level: 2, text: 'Emoji Usage Patterns' });
  sections.push({
    type: 'kv',
    pairs: [
      ['Total emoji used',   formatNumber(result.total  || 0)],
      ['Unique emoji types', formatNumber(result.unique || 0)],
    ],
  });
  sections.push({ type: 'blank' });

  // Top overall emoji
  var topN = (result.topN || []).slice(0, 30);
  if (topN.length > 0) {
    sections.push({ type: 'heading', level: 3, text: 'Top Emoji Overall' });
    var rows = topN.map(function(e) {
      return [String(e.rank), e.emoji, formatNumber(e.count)];
    });
    sections.push({
      type:    'table',
      headers: ['Rank', 'Emoji', 'Count'],
      aligns:  ['right', 'left', 'right'],
      rows:    rows,
    });
    sections.push({ type: 'blank' });
  }

  // Per-sender top-10
  var perSender = result.perSender || {};
  var senders   = Object.keys(perSender);
  if (senders.length > 0) {
    sections.push({ type: 'heading', level: 3, text: 'Top Emoji per Sender' });
    senders.forEach(function(sender) {
      var emojis = (perSender[sender] || []).slice(0, 10);
      if (emojis.length === 0) return;

      sections.push({ type: 'heading', level: 4, text: sender });
      var sRows = emojis.map(function(e) {
        return [String(e.rank), e.emoji, formatNumber(e.count)];
      });
      sections.push({
        type:    'table',
        headers: ['Rank', 'Emoji', 'Count'],
        aligns:  ['right', 'left', 'right'],
        rows:    sRows,
      });
      sections.push({ type: 'blank' });
    });
  }

  return { data, sections };
}

module.exports = { build };
