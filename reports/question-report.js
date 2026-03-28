/**
 * reports/question-report.js
 *
 * Detected questions grouped by sender, with date, time, conversationId,
 * participants, and the 3 messages that follow each question.
 *
 * build(result) → { data, sections }
 * result = output of detectQuestions()
 */

var { formatNumber } = require('../lib/reporters/base-reporter');

/**
 * Truncate a string to maxLen characters with ellipsis.
 */
function trunc(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

function build(result) {
  if (!result || typeof result !== 'object') {
    result = { total: 0, bySender: {} };
  }

  var data     = result;
  var sections = [];

  sections.push({ type: 'heading', level: 2, text: 'Question Detection' });
  sections.push({
    type: 'kv',
    pairs: [
      ['Total questions detected', formatNumber(result.total || 0)],
      ['Senders with questions',   formatNumber(Object.keys(result.bySender || {}).length)],
    ],
  });
  sections.push({ type: 'blank' });

  // Summary table: questions per sender
  var senders    = Object.keys(result.bySender || {});
  var summaryRows = senders
    .map(function(s) {
      return [s, formatNumber((result.bySender[s] || []).length)];
    })
    .sort(function(a, b) { return parseInt(b[1].replace(/,/g, '')) - parseInt(a[1].replace(/,/g, '')); });

  if (summaryRows.length > 0) {
    sections.push({ type: 'heading', level: 3, text: 'Questions per Sender' });
    sections.push({
      type:    'table',
      headers: ['Sender', 'Questions'],
      aligns:  ['left', 'right'],
      rows:    summaryRows,
    });
    sections.push({ type: 'blank' });
  }

  // Per-sender detail tables (up to 50 questions each)
  senders.forEach(function(sender) {
    var questions = (result.bySender[sender] || []).slice(0, 50);
    if (questions.length === 0) return;

    sections.push({ type: 'heading', level: 3, text: 'Questions from: ' + sender });

    var rows = questions.map(function(q) {
      var following = (q.followingMessages || [])
        .map(function(m) { return (m.sender || '') + ': ' + trunc(m.message_text, 60); })
        .join(' | ');

      return [
        q.date ? q.date.slice(0, 10) : '—',
        q.time || '—',
        q.conversationId != null ? String(q.conversationId) : '—',
        (q.participants || []).join(', ') || '—',
        trunc(q.message_text, 80),
        following || '—',
      ];
    });

    sections.push({
      type:    'table',
      headers: ['Date', 'Time', 'Conv ID', 'Participants', 'Question', 'Next 3 Messages'],
      aligns:  ['left', 'left', 'right', 'left', 'left', 'left'],
      rows:    rows,
    });
    sections.push({ type: 'blank' });
  });

  return { data, sections };
}

module.exports = { build };
