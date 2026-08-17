/**
 * reports/tfidf-search-report.js
 *
 * TF-IDF relevance search results.
 *
 * build(results, query?) → { data, sections }
 * results = output of searchByRelevance()
 */

var { formatFloat } = require('../lib/reporters/base-reporter');

function build(results, query) {
  if (!Array.isArray(results)) results = [];

  var data     = results;
  var sections = [];

  sections.push({ type: 'heading', level: 2, text: 'TF-IDF: Relevance Search' });
  sections.push({
    type:  'callout',
    label: 'Note',
    text:  'Results ranked by TF-IDF relevance to the query' + (query ? ' "' + query + '"' : '') +
           ' — term-weighted concept matching, not literal string search.',
  });
  sections.push({ type: 'blank' });

  if (data.length === 0) {
    sections.push({ type: 'text', text: 'No matching results.' });
    return { data, sections };
  }

  var rows = data.map(function(r) {
    return [String(r.id), formatFloat(r.score, 4), r.preview || ''];
  });

  sections.push({
    type:    'table',
    headers: ['ID', 'Score', 'Preview'],
    aligns:  ['left', 'right', 'left'],
    rows:    rows,
  });
  sections.push({ type: 'blank' });

  return { data, sections };
}

module.exports = { build };
