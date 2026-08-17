/**
 * reports/question-initiation-report.js
 *
 * Per-participant question-asking behavior: curiosity index (questions
 * asked ÷ messages sent) and ask/answer ratio.
 *
 * build(result) → { data, sections }
 * result = output of computeQuestionInitiationStats()
 */

var { formatNumber, formatFloat } = require('../lib/reporters/base-reporter');

function build(result) {
  if (!result || typeof result !== 'object') {
    result = { totals: { messagesSent: 0, questionsAsked: 0, questionsAnswered: 0 }, bySender: {} };
  }

  var data     = result;
  var sections = [];

  sections.push({ type: 'heading', level: 2, text: 'Question Initiation Stats' });

  var totals = result.totals || {};
  sections.push({
    type: 'kv',
    pairs: [
      ['Total messages',   formatNumber(totals.messagesSent || 0)],
      ['Total questions asked', formatNumber(totals.questionsAsked || 0)],
      ['Total questions answered', formatNumber(totals.questionsAnswered || 0)],
    ],
  });
  sections.push({ type: 'blank' });
  sections.push({
    type:  'callout',
    label: 'Note',
    text:  'Curiosity index = questions asked ÷ messages sent. Ask/answer ratio = questions this person asked ÷ questions they answered for others (null when they never answered anyone).',
  });
  sections.push({ type: 'blank' });

  var bySender = result.bySender || {};
  var senders  = Object.keys(bySender);
  if (senders.length > 0) {
    var rows = senders
      .map(function(s) {
        var r = bySender[s];
        return [
          s,
          formatNumber(r.messagesSent),
          formatNumber(r.questionsAsked),
          formatFloat(r.curiosityIndex, 3),
          formatNumber(r.questionsAnsweredByThem),
          r.askAnswerRatio != null ? formatFloat(r.askAnswerRatio, 2) : '—',
        ];
      })
      .sort(function(a, b) { return parseFloat(b[3]) - parseFloat(a[3]); });

    sections.push({ type: 'heading', level: 3, text: 'Per Sender' });
    sections.push({
      type:    'table',
      headers: ['Sender', 'Messages Sent', 'Questions Asked', 'Curiosity Index', 'Answered for Others', 'Ask/Answer Ratio'],
      aligns:  ['left', 'right', 'right', 'right', 'right', 'right'],
      rows:    rows,
    });
    sections.push({ type: 'blank' });
  }

  return { data, sections };
}

module.exports = { build };
