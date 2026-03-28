/**
 * reports/phrase-patterns-report.js
 *
 * Per-sender n-gram phrase frequency.
 *
 * build(result) → { data, sections }
 * result = output of perSenderPhrases()
 */

var { formatNumber } = require('../lib/reporters/base-reporter');

function build(result) {
  if (!result || typeof result !== 'object') result = { bySender: {} };

  var data     = result;
  var sections = [];

  sections.push({ type: 'heading', level: 2, text: 'Phrase Patterns per Sender' });
  sections.push({
    type:  'callout',
    label: 'Note',
    text:  'Top 2- and 3-word phrases used by each sender (stop words retained for natural phrasing).',
  });
  sections.push({ type: 'blank' });

  var senders = Object.keys(result.bySender || {});
  if (senders.length === 0) {
    sections.push({ type: 'text', text: 'No data.' });
    return { data, sections };
  }

  senders.forEach(function(sender) {
    var phrases = result.bySender[sender] || [];
    if (phrases.length === 0) return;

    sections.push({ type: 'heading', level: 3, text: 'Sender: ' + sender });

    var rows = phrases.map(function(p) {
      return [String(p.rank), p.phrase, String(p.words) + '-gram', formatNumber(p.count)];
    });

    sections.push({
      type:    'table',
      headers: ['Rank', 'Phrase', 'Type', 'Count'],
      aligns:  ['right', 'left', 'left', 'right'],
      rows:    rows,
    });
    sections.push({ type: 'blank' });
  });

  return { data, sections };
}

module.exports = { build };
