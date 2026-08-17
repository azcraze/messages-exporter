/**
 * reports/question-type-report.js
 *
 * Question type distribution (wh / yes-no / tag / choice / rhetorical-cue /
 * other), overall and per sender.
 *
 * build(result) → { data, sections }
 * result = output of classifyQuestionTypes()
 */

var { formatNumber } = require('../lib/reporters/base-reporter');

var TYPE_LABELS = {
  'wh':              'Wh-question',
  'yes-no':          'Yes/No',
  'tag':             'Tag question',
  'choice':          'Choice (A or B)',
  'rhetorical-cue':   'Rhetorical cue',
  'other':           'Other',
};

function build(result) {
  if (!result || typeof result !== 'object') {
    result = { total: 0, overall: {}, bySender: {}, questions: [] };
  }

  var data     = result;
  var sections = [];

  sections.push({ type: 'heading', level: 2, text: 'Question Type Classification' });
  sections.push({
    type: 'kv',
    pairs: [
      ['Total questions classified', formatNumber(result.total || 0)],
      ['Senders',                    formatNumber(Object.keys(result.bySender || {}).length)],
    ],
  });
  sections.push({ type: 'blank' });

  var overall = result.overall || {};
  var overallRows = Object.keys(overall)
    .map(function(t) { return [TYPE_LABELS[t] || t, formatNumber(overall[t])]; })
    .sort(function(a, b) { return parseInt(b[1].replace(/,/g, '')) - parseInt(a[1].replace(/,/g, '')); });

  if (overallRows.length > 0) {
    sections.push({ type: 'heading', level: 3, text: 'Overall Type Distribution' });
    sections.push({
      type:    'table',
      headers: ['Type', 'Count'],
      aligns:  ['left', 'right'],
      rows:    overallRows,
    });
    sections.push({ type: 'blank' });
  }

  var bySender = result.bySender || {};
  var senders  = Object.keys(bySender);
  if (senders.length > 0) {
    sections.push({ type: 'heading', level: 3, text: 'Type Distribution per Sender' });
    var headers = ['Sender'].concat(Object.keys(TYPE_LABELS).map(function(t) { return TYPE_LABELS[t]; })).concat(['Total']);
    var rows = senders.map(function(s) {
      var row = [s];
      Object.keys(TYPE_LABELS).forEach(function(t) { row.push(formatNumber(bySender[s][t] || 0)); });
      row.push(formatNumber(bySender[s].total || 0));
      return row;
    });
    sections.push({
      type:    'table',
      headers: headers,
      aligns:  headers.map(function() { return 'right'; }),
      rows:    rows,
    });
    sections.push({ type: 'blank' });
  }

  return { data, sections };
}

module.exports = { build };
