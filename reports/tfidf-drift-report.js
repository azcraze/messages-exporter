/**
 * reports/tfidf-drift-report.js
 *
 * Vocabulary drift between consecutive time periods.
 *
 * build(result) → { data, sections }
 * result = output of computeVocabularyDrift()
 */

var { formatFloat } = require('../lib/reporters/base-reporter');

function build(result) {
  if (!result || typeof result !== 'object') result = { granularity: null, transitions: [] };

  var data     = result;
  var sections = [];

  sections.push({ type: 'heading', level: 2, text: 'TF-IDF: Vocabulary Drift Over Time' });
  sections.push({
    type:  'callout',
    label: 'Note',
    text:  'Rising terms grew more distinctive from one period to the next (granularity: ' + (result.granularity || 'month') +
           '); falling terms became less distinctive or dropped out entirely.',
  });
  sections.push({ type: 'blank' });

  var transitions = result.transitions || [];
  if (transitions.length === 0) {
    sections.push({ type: 'text', text: 'No data (need at least two periods to compare).' });
    return { data, sections };
  }

  transitions.forEach(function(t) {
    sections.push({ type: 'heading', level: 3, text: t.from + ' → ' + t.to });

    if ((t.rising || []).length > 0) {
      sections.push({ type: 'text', text: '**Rising:**' });
      sections.push({
        type:    'table',
        headers: ['Term', 'Before', 'After', 'Delta'],
        aligns:  ['left', 'right', 'right', 'right'],
        rows:    t.rising.map(function(r) {
          return [r.term, formatFloat(r.before, 4), formatFloat(r.after, 4), formatFloat(r.delta, 4)];
        }),
      });
      sections.push({ type: 'blank' });
    }

    if ((t.falling || []).length > 0) {
      sections.push({ type: 'text', text: '**Falling:**' });
      sections.push({
        type:    'table',
        headers: ['Term', 'Before', 'After', 'Delta'],
        aligns:  ['left', 'right', 'right', 'right'],
        rows:    t.falling.map(function(r) {
          return [r.term, formatFloat(r.before, 4), formatFloat(r.after, 4), formatFloat(r.delta, 4)];
        }),
      });
      sections.push({ type: 'blank' });
    }
  });

  return { data, sections };
}

module.exports = { build };
