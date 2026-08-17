/**
 * reports/tfidf-similarity-report.js
 *
 * Pairwise TF-IDF vocabulary similarity.
 *
 * build(result) → { data, sections }
 * result = output of computeTfIdfSimilarity()
 */

var { formatFloat } = require('../lib/reporters/base-reporter');

function build(result) {
  if (!result || typeof result !== 'object') result = { groups: [], pairs: [], matrix: [] };

  var data     = result;
  var sections = [];

  sections.push({ type: 'heading', level: 2, text: 'TF-IDF: Vocabulary Similarity' });
  sections.push({
    type:  'callout',
    label: 'Note',
    text:  'Cosine similarity between each pair\'s TF-IDF vectors — 1.0 means identical vocabulary, 0.0 means no term overlap at all.',
  });
  sections.push({ type: 'blank' });

  var pairs = result.pairs || [];
  if (pairs.length === 0) {
    sections.push({ type: 'text', text: 'No data (need at least two groups to compare).' });
    return { data, sections };
  }

  var rows = pairs.slice(0, 50).map(function(p) {
    return [String(p.a), String(p.b), formatFloat(p.similarity, 4)];
  });

  sections.push({
    type:    'table',
    headers: ['Group A', 'Group B', 'Similarity'],
    aligns:  ['left', 'left', 'right'],
    rows:    rows,
  });
  sections.push({ type: 'blank' });

  return { data, sections };
}

module.exports = { build };
