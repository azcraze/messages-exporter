/**
 * reports/thread-report.js
 *
 * Reconstructed reply threads: top threads by reply count, summary stats.
 *
 * build(result) → { data, sections }
 * result = output of reconstructThreads()
 */

var { formatNumber } = require('../lib/reporters/base-reporter');

function trunc(str, n) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

function build(result) {
  if (!result || typeof result !== 'object') {
    result = { threadCount: 0, totalThreadedMessages: 0, threads: [] };
  }

  var data     = result;
  var sections = [];

  sections.push({ type: 'heading', level: 2, text: 'Thread Reconstruction' });
  sections.push({
    type: 'kv',
    pairs: [
      ['Total threads',             formatNumber(result.threadCount || 0)],
      ['Total threaded messages',   formatNumber(result.totalThreadedMessages || 0)],
    ],
  });
  sections.push({ type: 'blank' });

  var threads = (result.threads || []).slice(0, 50);
  if (threads.length === 0) {
    sections.push({ type: 'text', text: 'No threads found. Threads require iOS 16+ reply_to_guid data.' });
    return { data, sections };
  }

  // Top threads table
  sections.push({ type: 'heading', level: 3, text: 'Top Threads by Reply Count' });
  var rows = threads.map(function(t) {
    var rootText   = t.rootMessage ? trunc(t.rootMessage.message_text, 70) : '—';
    var rootSender = t.rootMessage
      ? (t.rootMessage.sender || (t.rootMessage.is_from_me === 1 ? 'me' : 'other'))
      : '—';
    return [
      String(t.threadId),
      t.startDate ? t.startDate.slice(0, 10) : '—',
      rootSender,
      formatNumber(t.replyCount),
      (t.participants || []).join(', ') || '—',
      rootText,
    ];
  });

  sections.push({
    type:    'table',
    headers: ['Thread ID', 'Start Date', 'Root Sender', 'Replies', 'Participants', 'Root Message'],
    aligns:  ['right', 'left', 'left', 'right', 'left', 'left'],
    rows:    rows,
  });

  // Depth distribution
  var depthDist = {};
  (result.threads || []).forEach(function(t) {
    var bucket = t.replyCount === 0 ? '0' : t.replyCount <= 2 ? '1-2' : t.replyCount <= 5 ? '3-5' : '6+';
    depthDist[bucket] = (depthDist[bucket] || 0) + 1;
  });

  var distRows = ['0', '1-2', '3-5', '6+'].filter(function(k) { return depthDist[k]; }).map(function(k) {
    return [k + ' replies', formatNumber(depthDist[k] || 0)];
  });

  if (distRows.length > 0) {
    sections.push({ type: 'blank' });
    sections.push({ type: 'heading', level: 3, text: 'Thread Depth Distribution' });
    sections.push({
      type:    'table',
      headers: ['Depth', 'Thread Count'],
      aligns:  ['left', 'right'],
      rows:    distRows,
    });
  }

  return { data, sections };
}

module.exports = { build };
