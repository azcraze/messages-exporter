/**
 * reports/rhetorical-questions-report.js
 *
 * Questions flagged as likely rhetorical (phrase cue, self-answered, or
 * habitually unanswered at the end of a conversation).
 *
 * build(result) → { data, sections }
 * result = output of detectRhetoricalQuestions()
 */

var { formatNumber } = require('../lib/reporters/base-reporter');

function trunc(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

function build(result) {
  if (!result || typeof result !== 'object') {
    result = { total: 0, rhetoricalCount: 0, bySender: {} };
  }

  var data     = result;
  var sections = [];

  sections.push({ type: 'heading', level: 2, text: 'Rhetorical Question Detection' });
  sections.push({
    type: 'kv',
    pairs: [
      ['Total questions',        formatNumber(result.total || 0)],
      ['Flagged as rhetorical',  formatNumber(result.rhetoricalCount || 0)],
    ],
  });
  sections.push({ type: 'blank' });
  sections.push({
    type:  'callout',
    label: 'Note',
    text:  'Reasons: phrase-cue (matched a known rhetorical phrase), self-answered (the message answers itself), unanswered-at-end (wh-question, no reply, last message in the conversation).',
  });
  sections.push({ type: 'blank' });

  var bySender = result.bySender || {};
  var senders  = Object.keys(bySender);

  var summaryRows = senders
    .map(function(s) { return [s, formatNumber((bySender[s] || []).length)]; })
    .sort(function(a, b) { return parseInt(b[1].replace(/,/g, '')) - parseInt(a[1].replace(/,/g, '')); });

  if (summaryRows.length > 0) {
    sections.push({ type: 'heading', level: 3, text: 'Rhetorical Questions per Sender' });
    sections.push({
      type:    'table',
      headers: ['Sender', 'Rhetorical Questions'],
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
        trunc(q.message_text, 70),
        (q.reasons || []).join(', '),
      ];
    });
    sections.push({
      type:    'table',
      headers: ['Date', 'Question', 'Reasons'],
      aligns:  ['left', 'left', 'left'],
      rows:    rows,
    });
    sections.push({ type: 'blank' });
  });

  return { data, sections };
}

module.exports = { build };
