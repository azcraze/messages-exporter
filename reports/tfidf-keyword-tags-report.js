/**
 * reports/tfidf-keyword-tags-report.js
 *
 * Per-message TF-IDF keyword tags.
 *
 * build(result) → { data, sections }
 * result = output of extractKeywordTags() (an Array, not an object)
 */

var { formatFloat } = require('../lib/reporters/base-reporter');

function build(result) {
  if (!Array.isArray(result)) result = [];

  var data     = result;
  var sections = [];

  sections.push({ type: 'heading', level: 2, text: 'TF-IDF: Per-Message Keyword Tags' });
  sections.push({
    type:  'callout',
    label: 'Note',
    text:  'Each message is scored against a corpus of every message, surfacing the terms most distinctive to that individual message.',
  });
  sections.push({ type: 'blank' });

  if (data.length === 0) {
    sections.push({ type: 'text', text: 'No data.' });
    return { data, sections };
  }

  var rows = data.slice(0, 200).map(function(entry) {
    var keywords = (entry.keywords || [])
      .map(function(k) { return k.term + ' (' + formatFloat(k.tfidf, 4) + ')'; })
      .join(', ');
    return [String(entry.id), keywords];
  });

  sections.push({
    type:    'table',
    headers: ['Message ID', 'Keywords'],
    aligns:  ['left', 'left'],
    rows:    rows,
  });
  sections.push({ type: 'blank' });

  if (data.length > 200) {
    sections.push({ type: 'text', text: 'Showing first 200 of ' + data.length + ' tagged messages. Full data in the JSON output.' });
  }

  return { data, sections };
}

module.exports = { build };
