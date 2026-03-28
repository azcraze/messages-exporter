/**
 * reports/tfidf-report.js
 *
 * TF-IDF distinctive terms per sender.
 *
 * build(result) → { data, sections }
 * result = output of computeTfIdf()
 */

var { formatFloat } = require('../lib/reporters/base-reporter');

function build(result) {
  if (!result || typeof result !== 'object') result = { bySender: {} };

  var data     = result;
  var sections = [];

  sections.push({ type: 'heading', level: 2, text: 'TF-IDF: Distinctive Terms per Sender' });
  sections.push({
    type:  'callout',
    label: 'Note',
    text:  'TF-IDF ranks terms that are frequent for a sender but rare across other senders — identifying each person\'s characteristic vocabulary.',
  });
  sections.push({ type: 'blank' });

  var senders = Object.keys(result.bySender || {});
  if (senders.length === 0) {
    sections.push({ type: 'text', text: 'No data.' });
    return { data, sections };
  }

  senders.forEach(function(sender) {
    var terms = (result.bySender[sender] || []).slice(0, 20);
    if (terms.length === 0) return;

    sections.push({ type: 'heading', level: 3, text: 'Sender: ' + sender });

    var rows = terms.map(function(t) {
      return [String(t.rank), t.term, formatFloat(t.tfidf, 4)];
    });

    sections.push({
      type:    'table',
      headers: ['Rank', 'Term', 'TF-IDF Score'],
      aligns:  ['right', 'left', 'right'],
      rows:    rows,
    });
    sections.push({ type: 'blank' });
  });

  return { data, sections };
}

module.exports = { build };
