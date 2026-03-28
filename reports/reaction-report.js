/**
 * reports/reaction-report.js
 *
 * Reaction mapping: who reacted to what, with what type.
 *
 * build(result) → { data, sections }
 * result = output of mapReactions()
 */

var { formatNumber } = require('../lib/reporters/base-reporter');

function trunc(str, n) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

function build(result) {
  if (!result || typeof result !== 'object') {
    result = { total: 0, resolved: 0, unresolved: 0, reactions: [], byType: {}, bySender: {} };
  }

  var data     = result;
  var sections = [];

  sections.push({ type: 'heading', level: 2, text: 'Reaction Mapping' });
  sections.push({
    type: 'kv',
    pairs: [
      ['Total reactions',       formatNumber(result.total || 0)],
      ['Resolved (found original)', formatNumber(result.resolved || 0)],
      ['Unresolved',            formatNumber(result.unresolved || 0)],
    ],
  });
  sections.push({ type: 'blank' });

  // By reaction type
  var byType = result.byType || {};
  var typeRows = Object.keys(byType)
    .map(function(t) { return [t, formatNumber((byType[t] || []).length)]; })
    .sort(function(a, b) { return parseInt(b[1].replace(/,/g, '')) - parseInt(a[1].replace(/,/g, '')); });

  if (typeRows.length > 0) {
    sections.push({ type: 'heading', level: 3, text: 'Reactions by Type' });
    sections.push({
      type:    'table',
      headers: ['Reaction Type', 'Count'],
      aligns:  ['left', 'right'],
      rows:    typeRows,
    });
    sections.push({ type: 'blank' });
  }

  // By sender
  var bySender = result.bySender || {};
  var senderRows = Object.keys(bySender)
    .map(function(s) { return [s, formatNumber((bySender[s] || []).length)]; })
    .sort(function(a, b) { return parseInt(b[1].replace(/,/g, '')) - parseInt(a[1].replace(/,/g, '')); });

  if (senderRows.length > 0) {
    sections.push({ type: 'heading', level: 3, text: 'Reactions by Sender' });
    sections.push({
      type:    'table',
      headers: ['Sender', 'Reactions Given'],
      aligns:  ['left', 'right'],
      rows:    senderRows,
    });
    sections.push({ type: 'blank' });
  }

  // Resolved reactions detail (up to 30)
  var resolved = (result.reactions || []).filter(function(r) { return r.originalMsg; }).slice(0, 30);
  if (resolved.length > 0) {
    sections.push({ type: 'heading', level: 3, text: 'Sample Resolved Reactions' });
    var rows = resolved.map(function(r) {
      var origText = r.originalMsg ? trunc(r.originalMsg.message_text, 70) : '—';
      var origSender = r.originalMsg
        ? (r.originalMsg.sender || (r.originalMsg.is_from_me === 1 ? 'me' : 'other'))
        : '—';
      return [
        r.date ? r.date.slice(0, 10) : '—',
        r.sender || '—',
        r.reactionType || '—',
        origSender,
        origText,
      ];
    });
    sections.push({
      type:    'table',
      headers: ['Date', 'Reactor', 'Type', 'Original Sender', 'Original Message'],
      aligns:  ['left', 'left', 'left', 'left', 'left'],
      rows:    rows,
    });
  }

  return { data, sections };
}

module.exports = { build };
