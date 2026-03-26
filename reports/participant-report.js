/**
 * reports/participant-report.js
 *
 * Per-participant breakdown: volume, send ratio, response time.
 *
 * build(messages) → { data, sections }
 */

var { participantStats } = require('../modules/stats/participantStats');
var { responseTime }     = require('../modules/stats/responseTime');
var { formatNumber, formatDate, formatFloat, formatDuration } = require('../lib/reporters/base-reporter');

function build(messages) {
  if (!Array.isArray(messages)) messages = [];

  var pStats  = participantStats(messages);
  var rTime   = responseTime(messages);

  var data = {
    participants: pStats.participants,
    responseTime: rTime,
  };

  // Volume table
  var volRows = pStats.participants.map(function(p) {
    var rt = rTime.bySender[p.address];
    return [
      p.address,
      formatNumber(p.messageCount),
      formatNumber(p.sentCount),
      formatNumber(p.receivedCount),
      (p.sendRatio * 100).toFixed(1) + '%',
      String(p.avgLength) + ' chars',
      rt ? formatDuration(rt.median) : '—',
      rt ? String(rt.count)          : '—',
    ];
  });

  var sections = [
    { type: 'heading', level: 2, text: 'Per-Participant Breakdown' },
    {
      type: 'table',
      headers: ['Participant', 'Total', 'Sent', 'Received', 'Send %', 'Avg Len', 'Median Response', 'Responses'],
      aligns:  ['left', 'right', 'right', 'right', 'right', 'right', 'right', 'right'],
      rows: volRows,
    },
    { type: 'blank' },
    { type: 'heading', level: 2, text: 'Response Times' },
    {
      type: 'kv',
      pairs: [
        ['Overall mean response',   rTime.overall ? formatDuration(rTime.overall.mean)   : '—'],
        ['Overall median response', rTime.overall ? formatDuration(rTime.overall.median) : '—'],
        ['Response samples',        rTime.overall ? formatNumber(rTime.overall.count)    : '—'],
      ],
    },
  ];

  // Per-sender response breakdown
  var rtSenders = Object.keys(rTime.bySender);
  if (rtSenders.length > 0) {
    sections.push({ type: 'blank' });
    sections.push({ type: 'heading', level: 3, text: 'Response Time by Participant' });
    sections.push({
      type: 'table',
      headers: ['Participant', 'Mean', 'Median', 'Samples'],
      aligns:  ['left', 'right', 'right', 'right'],
      rows: rtSenders.map(function(s) {
        var rt = rTime.bySender[s];
        return [s, formatDuration(rt.mean), formatDuration(rt.median), formatNumber(rt.count)];
      }),
    });
  }

  // Insight callout — most active participant
  if (pStats.participants.length > 0) {
    var top = pStats.participants[0];
    sections.push({ type: 'blank' });
    sections.push({
      type: 'callout',
      label: 'Insight',
      text: 'Most active participant: **' + top.address + '** with **' + formatNumber(top.messageCount) + '** messages (' + (top.sendRatio * 100).toFixed(1) + '% sent).',
    });
  }

  return { data, sections };
}

module.exports = { build };
