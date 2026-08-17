/**
 * reports/tfidf-by-period-report.js
 *
 * TF-IDF distinctive terms per time period (day/week/month).
 *
 * build(result) → { data, sections }
 * result = output of computeTfIdfByPeriod()
 */

var { formatFloat } = require('../lib/reporters/base-reporter');

function build(result) {
  if (!result || typeof result !== 'object') result = { byPeriod: {}, granularity: null };

  var data     = result;
  var sections = [];

  sections.push({ type: 'heading', level: 2, text: 'TF-IDF: Distinctive Terms per Period' });
  sections.push({
    type:  'callout',
    label: 'Note',
    text:  'TF-IDF ranks terms that are frequent within a time period (granularity: ' + (result.granularity || 'month') +
           ') but rare across other periods — surfacing vocabulary distinctive to that stretch of time.',
  });
  sections.push({ type: 'blank' });

  var periodKeys = Object.keys(result.byPeriod || {}).sort();
  if (periodKeys.length === 0) {
    sections.push({ type: 'text', text: 'No data.' });
    return { data, sections };
  }

  periodKeys.forEach(function(period) {
    var terms = (result.byPeriod[period] || []).slice(0, 20);
    if (terms.length === 0) return;

    sections.push({ type: 'heading', level: 3, text: 'Period: ' + period });

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
