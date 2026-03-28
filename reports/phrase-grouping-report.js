/**
 * reports/phrase-grouping-report.js
 *
 * Fuzzy-clustered phrase groups: similar phrases merged under a canonical form.
 *
 * build(result) → { data, sections }
 * result = output of groupPhrases()
 */

var { formatNumber } = require('../lib/reporters/base-reporter');

function build(result) {
  if (!result || typeof result !== 'object') result = { clusters: [] };

  var data     = result;
  var sections = [];

  sections.push({ type: 'heading', level: 2, text: 'Phrase Grouping (Fuzzy Clusters)' });
  sections.push({
    type:  'callout',
    label: 'Note',
    text:  'Phrases that are worded slightly differently but likely mean the same thing are grouped under a canonical form.',
  });
  sections.push({ type: 'blank' });

  var clusters = (result.clusters || []).slice(0, 50);
  if (clusters.length === 0) {
    sections.push({ type: 'text', text: 'No phrase clusters found. Try lowering minCount or threshold.' });
    return { data, sections };
  }

  sections.push({ type: 'heading', level: 3, text: 'Top Clusters' });

  var rows = clusters.map(function(cl) {
    var variants = (cl.variants || [])
      .filter(function(v) { return v.phrase !== cl.canonical; })
      .map(function(v) { return v.phrase + ' (' + v.count + ')'; })
      .join('; ');
    return [
      String(cl.rank),
      cl.canonical,
      formatNumber(cl.totalCount),
      variants || '—',
    ];
  });

  sections.push({
    type:    'table',
    headers: ['Rank', 'Canonical Phrase', 'Total Count', 'Variants'],
    aligns:  ['right', 'left', 'right', 'left'],
    rows:    rows,
  });

  if (clusters.length > 0) {
    var multiVariant = clusters.filter(function(cl) { return (cl.variants || []).length > 1; });
    sections.push({ type: 'blank' });
    sections.push({
      type:  'callout',
      label: 'Insight',
      text:  multiVariant.length + ' of ' + clusters.length + ' clusters have variant phrasings.',
    });
  }

  return { data, sections };
}

module.exports = { build };
