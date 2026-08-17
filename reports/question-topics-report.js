/**
 * reports/question-topics-report.js
 *
 * Per-question TF-IDF keyword tags and clusters of topically similar
 * questions.
 *
 * build(result) → { data, sections }
 * result = output of tagQuestionTopics()
 */

var { formatNumber, formatFloat } = require('../lib/reporters/base-reporter');

function trunc(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

function build(result) {
  if (!result || typeof result !== 'object') {
    result = { total: 0, tagged: [], clusters: [] };
  }

  var data     = result;
  var sections = [];

  sections.push({ type: 'heading', level: 2, text: 'Question Topics' });
  sections.push({
    type: 'kv',
    pairs: [
      ['Questions tagged',  formatNumber(result.total || 0)],
      ['Topic clusters',    formatNumber((result.clusters || []).length)],
    ],
  });
  sections.push({ type: 'blank' });

  var clusters = result.clusters || [];
  if (clusters.length > 0) {
    sections.push({ type: 'heading', level: 3, text: 'Topic Clusters' });
    var clusterRows = clusters
      .map(function(c) { return [c.topTerms.join(', '), formatNumber(c.members.length)]; })
      .sort(function(a, b) { return parseInt(b[1].replace(/,/g, '')) - parseInt(a[1].replace(/,/g, '')); });
    sections.push({
      type:    'table',
      headers: ['Shared Terms', 'Questions in Cluster'],
      aligns:  ['left', 'right'],
      rows:    clusterRows,
    });
    sections.push({ type: 'blank' });
  }

  var sample = (result.tagged || []).slice(0, 30);
  if (sample.length > 0) {
    sections.push({ type: 'heading', level: 3, text: 'Sample Tagged Questions' });
    var rows = sample.map(function(q) {
      var kw = (q.keywords || []).map(function(k) { return k.term + ' (' + formatFloat(k.tfidf, 2) + ')'; }).join(', ');
      return [q.date ? q.date.slice(0, 10) : '—', q.sender || '—', trunc(q.message_text, 60), kw];
    });
    sections.push({
      type:    'table',
      headers: ['Date', 'Sender', 'Question', 'Keywords'],
      aligns:  ['left', 'left', 'left', 'left'],
      rows:    rows,
    });
  }

  return { data, sections };
}

module.exports = { build };
