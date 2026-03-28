/**
 * reports/curse-words-report.js
 *
 * Profanity usage frequency, per sender and per word.
 *
 * build(result) → { data, sections }
 * result = output of analyzeCurseWords()
 */

var { formatNumber } = require('../lib/reporters/base-reporter');

function build(result) {
  if (!result || typeof result !== 'object') {
    result = { total: 0, uniqueWordsUsed: 0, byWord: {}, bySender: {}, topWords: [], byConversation: [] };
  }

  var data     = result;
  var sections = [];

  sections.push({ type: 'heading', level: 2, text: 'Profanity Usage Patterns' });
  sections.push({
    type: 'kv',
    pairs: [
      ['Total occurrences',     formatNumber(result.total || 0)],
      ['Unique words used',     formatNumber(result.uniqueWordsUsed || 0)],
      ['Senders with matches',  formatNumber(Object.keys(result.bySender || {}).length)],
    ],
  });
  sections.push({ type: 'blank' });

  // Top words overall
  var topWords = (result.topWords || []).slice(0, 20);
  if (topWords.length > 0) {
    sections.push({ type: 'heading', level: 3, text: 'Top Words by Frequency' });
    var rows = topWords.map(function(w) {
      return [String(w.rank), w.word, formatNumber(w.count)];
    });
    sections.push({
      type:    'table',
      headers: ['Rank', 'Word', 'Count'],
      aligns:  ['right', 'left', 'right'],
      rows:    rows,
    });
    sections.push({ type: 'blank' });
  }

  // Per sender totals
  var bySender = result.bySender || {};
  var senderRows = Object.keys(bySender)
    .map(function(s) {
      var sd = bySender[s];
      var top = Object.keys(sd.byWord || {})
        .sort(function(a, b) { return (sd.byWord[b] || 0) - (sd.byWord[a] || 0); })[0] || '—';
      return [s, formatNumber(sd.total || 0), top];
    })
    .sort(function(a, b) { return parseInt(b[1].replace(/,/g, '')) - parseInt(a[1].replace(/,/g, '')); });

  if (senderRows.length > 0) {
    sections.push({ type: 'heading', level: 3, text: 'Usage per Sender' });
    sections.push({
      type:    'table',
      headers: ['Sender', 'Total', 'Top Word'],
      aligns:  ['left', 'right', 'left'],
      rows:    senderRows,
    });
    sections.push({ type: 'blank' });
  }

  // Per conversation top (up to 10)
  var byConv = (result.byConversation || []).slice(0, 10);
  if (byConv.length > 0) {
    sections.push({ type: 'heading', level: 3, text: 'Highest-Profanity Conversations' });
    var convRows = byConv.map(function(c) {
      return [
        c.conversationId != null ? String(c.conversationId) : '—',
        c.date ? c.date.slice(0, 10) : '—',
        formatNumber(c.total),
        c.topWord || '—',
      ];
    });
    sections.push({
      type:    'table',
      headers: ['Conv ID', 'Date', 'Occurrences', 'Top Word'],
      aligns:  ['right', 'left', 'right', 'left'],
      rows:    convRows,
    });
  }

  return { data, sections };
}

module.exports = { build };
