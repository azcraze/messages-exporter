/**
 * reports/summary-report.js
 *
 * Generates the top-level summary report: total messages, date span,
 * participant list, service breakdown, and top day.
 *
 * build(messages) → { data, sections }
 *   data     — raw numbers (machine-readable)
 *   sections — section descriptors for text/markdown reporters
 */

var { messageVolume } = require('../modules/stats/messageVolume');
var { participantStats } = require('../modules/stats/participantStats');
var { formatNumber, formatDate, formatDuration } = require('../lib/reporters/base-reporter');

function build(messages) {
  if (!Array.isArray(messages)) messages = [];

  var vol  = messageVolume(messages);
  var part = participantStats(messages);

  // Service breakdown
  var serviceCounts = { iMessage: 0, SMS: 0, other: 0 };
  messages.forEach(function(msg) {
    var s = msg.service || 'other';
    if (s === 'iMessage') serviceCounts.iMessage++;
    else if (s === 'SMS') serviceCounts.SMS++;
    else serviceCounts.other++;
  });

  // Top day
  var topDay = vol.byDay.length
    ? vol.byDay.slice().sort(function(a, b) { return b.count - a.count; })[0]
    : null;

  var data = {
    total:        vol.total,
    dateRange:    vol.dateRange,
    averages:     vol.averages,
    participants: part.participants,
    services:     serviceCounts,
    topDay:       topDay,
  };

  var sections = [
    { type: 'heading', level: 2, text: 'Overview' },
    {
      type: 'kv',
      pairs: [
        ['Total messages',    formatNumber(vol.total)],
        ['Date range',        vol.dateRange ? formatDate(vol.dateRange.first) + ' – ' + formatDate(vol.dateRange.last) : '—'],
        ['Span',              vol.dateRange ? vol.dateRange.spanDays + ' days' : '—'],
        ['Avg / day',         vol.averages.perDay],
        ['Avg / week',        vol.averages.perWeek],
        ['iMessage',          formatNumber(serviceCounts.iMessage)],
        ['SMS',               formatNumber(serviceCounts.SMS)],
        ['Top day',           topDay ? topDay.date + ' (' + formatNumber(topDay.count) + ' msgs)' : '—'],
      ],
    },
    { type: 'blank' },
    { type: 'heading', level: 2, text: 'Participants' },
    {
      type: 'table',
      headers: ['Address', 'Messages', 'Sent', 'Received', 'Send %', 'Avg Len', 'First Seen', 'Last Seen'],
      aligns:  ['left', 'right', 'right', 'right', 'right', 'right', 'left', 'left'],
      rows: part.participants.map(function(p) {
        return [
          p.address,
          formatNumber(p.messageCount),
          formatNumber(p.sentCount),
          formatNumber(p.receivedCount),
          (p.sendRatio * 100).toFixed(1) + '%',
          String(p.avgLength),
          formatDate(p.firstSeen),
          formatDate(p.lastSeen),
        ];
      }),
    },
  ];

  if (topDay) {
    sections.push({ type: 'blank' });
    sections.push({
      type: 'callout',
      label: 'Insight',
      text: 'Busiest day was **' + topDay.date + '** with **' + formatNumber(topDay.count) + '** messages.',
    });
  }

  return { data, sections };
}

module.exports = { build };
