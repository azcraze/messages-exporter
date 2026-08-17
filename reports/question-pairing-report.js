/**
 * reports/question-pairing-report.js
 *
 * Question-to-answer pairing results: how many questions got a paired
 * answer, via which method (thread vs. window), with a sample of pairs.
 *
 * build(result) → { data, sections }
 * result = output of pairQuestionsWithAnswers()
 */

var { formatNumber } = require('../lib/reporters/base-reporter');

function trunc(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

function build(result) {
  if (!result || typeof result !== 'object') {
    result = { total: 0, pairedCount: 0, unpairedCount: 0, pairs: [] };
  }

  var data     = result;
  var sections = [];

  sections.push({ type: 'heading', level: 2, text: 'Question → Answer Pairing' });
  sections.push({
    type: 'kv',
    pairs: [
      ['Total questions',   formatNumber(result.total || 0)],
      ['Paired with an answer', formatNumber(result.pairedCount || 0)],
      ['Unpaired',           formatNumber(result.unpairedCount || 0)],
    ],
  });
  sections.push({ type: 'blank' });
  sections.push({
    type:  'callout',
    label: 'Note',
    text:  '"thread" pairs use an explicit iOS reply thread; "window" pairs use the first reply from a different sender within the configured window.',
  });
  sections.push({ type: 'blank' });

  var methodCounts = { thread: 0, window: 0 };
  (result.pairs || []).forEach(function(p) {
    if (p.method === 'thread') methodCounts.thread++;
    else if (p.method === 'window') methodCounts.window++;
  });

  sections.push({ type: 'heading', level: 3, text: 'Pairing Method Breakdown' });
  sections.push({
    type:    'table',
    headers: ['Method', 'Count'],
    aligns:  ['left', 'right'],
    rows:    [
      ['thread', formatNumber(methodCounts.thread)],
      ['window', formatNumber(methodCounts.window)],
      ['unpaired', formatNumber(result.unpairedCount || 0)],
    ],
  });
  sections.push({ type: 'blank' });

  var sample = (result.pairs || []).filter(function(p) { return p.answer; }).slice(0, 30);
  if (sample.length > 0) {
    sections.push({ type: 'heading', level: 3, text: 'Sample Paired Questions' });
    var rows = sample.map(function(p) {
      return [
        p.question.date ? p.question.date.slice(0, 10) : '—',
        p.question.sender || '—',
        trunc(p.question.message_text, 60),
        p.answer.sender || '—',
        trunc(p.answer.message_text, 60),
        p.method || '—',
        p.latencyMinutes != null ? String(p.latencyMinutes) : '—',
      ];
    });
    sections.push({
      type:    'table',
      headers: ['Date', 'Asker', 'Question', 'Answerer', 'Answer', 'Method', 'Latency (min)'],
      aligns:  ['left', 'left', 'left', 'left', 'left', 'left', 'right'],
      rows:    rows,
    });
  }

  return { data, sections };
}

module.exports = { build };
