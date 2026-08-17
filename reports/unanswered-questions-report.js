/**
 * reports/unanswered-questions-report.js
 *
 * Questions that never got a paired answer, grouped by sender.
 *
 * build(result) → { data, sections }
 * result = output of findUnansweredQuestions()
 */

var { formatNumber } = require('../lib/reporters/base-reporter');

function trunc(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

function build(result) {
  if (!result || typeof result !== 'object') {
    result = { total: 0, unansweredCount: 0, bySender: {} };
  }

  var data     = result;
  var sections = [];

  sections.push({ type: 'heading', level: 2, text: 'Unanswered Questions' });
  sections.push({
    type: 'kv',
    pairs: [
      ['Total questions',    formatNumber(result.total || 0)],
      ['Unanswered',         formatNumber(result.unansweredCount || 0)],
      ['Answer rate',        result.total ? (100 - (result.unansweredCount / result.total * 100)).toFixed(1) + '%' : '—'],
    ],
  });
  sections.push({ type: 'blank' });

  var bySender = result.bySender || {};
  var senders  = Object.keys(bySender);

  var summaryRows = senders
    .map(function(s) { return [s, formatNumber((bySender[s] || []).length)]; })
    .sort(function(a, b) { return parseInt(b[1].replace(/,/g, '')) - parseInt(a[1].replace(/,/g, '')); });

  if (summaryRows.length > 0) {
    sections.push({ type: 'heading', level: 3, text: 'Unanswered Questions per Sender' });
    sections.push({
      type:    'table',
      headers: ['Sender', 'Unanswered'],
      aligns:  ['left', 'right'],
      rows:    summaryRows,
    });
    sections.push({ type: 'blank' });
  }

  senders.forEach(function(sender) {
    var questions = (bySender[sender] || []).slice(0, 30);
    if (questions.length === 0) return;

    sections.push({ type: 'heading', level: 3, text: 'Sender: ' + sender });
    var rows = questions.map(function(q) {
      return [
        q.date ? q.date.slice(0, 10) : '—',
        q.time || '—',
        trunc(q.message_text, 80),
      ];
    });
    sections.push({
      type:    'table',
      headers: ['Date', 'Time', 'Question'],
      aligns:  ['left', 'left', 'left'],
      rows:    rows,
    });
    sections.push({ type: 'blank' });
  });

  return { data, sections };
}

module.exports = { build };
