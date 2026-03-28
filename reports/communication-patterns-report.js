/**
 * reports/communication-patterns-report.js
 *
 * Combined communication patterns: response times, time-of-day, day-of-week.
 *
 * build(responseTimeResult, timeOfDayResult, dayOfWeekResult) → { data, sections }
 */

var { formatNumber, formatFloat, formatDuration, asciiBar } = require('../lib/reporters/base-reporter');

function build(responseTimeResult, timeOfDayResult, dayOfWeekResult) {
  responseTimeResult = responseTimeResult || { overall: null, bySender: {} };
  timeOfDayResult    = timeOfDayResult    || { byHour: [], peakHour: null, quietHour: null, periods: {} };
  dayOfWeekResult    = dayOfWeekResult    || { byDay: [], mostActive: null, leastActive: null, weekendVsWeekday: {} };

  var data = {
    responseTime: responseTimeResult,
    timeOfDay:    timeOfDayResult,
    dayOfWeek:    dayOfWeekResult,
  };
  var sections = [];

  sections.push({ type: 'heading', level: 2, text: 'Communication Patterns' });

  // ── Response Time ─────────────────────────────────────────────────────────
  sections.push({ type: 'heading', level: 3, text: 'Response Times' });
  sections.push({
    type:  'callout',
    label: 'Note',
    text:  'Response time = gap between consecutive messages from different senders (≤4h gap only).',
  });
  sections.push({ type: 'blank' });

  var overall = responseTimeResult.overall;
  sections.push({
    type: 'kv',
    pairs: [
      ['Overall mean response time',   overall ? formatDuration(overall.mean)   : '—'],
      ['Overall median response time', overall ? formatDuration(overall.median) : '—'],
      ['Response events counted',      overall ? formatNumber(overall.count)    : '—'],
    ],
  });
  sections.push({ type: 'blank' });

  var rtRows = Object.keys(responseTimeResult.bySender || {}).map(function(s) {
    var rt = responseTimeResult.bySender[s];
    return [s, formatDuration(rt.mean), formatDuration(rt.median), formatNumber(rt.count)];
  }).sort(function(a, b) {
    // Sort by mean ascending (fastest responder first)
    return parseFloat(a[1]) - parseFloat(b[1]);
  });

  if (rtRows.length > 0) {
    sections.push({
      type:    'table',
      headers: ['Sender', 'Mean Response', 'Median Response', 'Events'],
      aligns:  ['left', 'right', 'right', 'right'],
      rows:    rtRows,
    });
    sections.push({ type: 'blank' });
  }

  // ── Time of Day ───────────────────────────────────────────────────────────
  sections.push({ type: 'heading', level: 3, text: 'Time of Day' });

  if (timeOfDayResult.peakHour) {
    sections.push({
      type: 'kv',
      pairs: [
        ['Peak hour',  timeOfDayResult.peakHour.label  + ' (' + formatNumber(timeOfDayResult.peakHour.count)  + ' messages)'],
        ['Quiet hour', timeOfDayResult.quietHour ? timeOfDayResult.quietHour.label + ' (' + formatNumber(timeOfDayResult.quietHour.count) + ' messages)' : '—'],
      ],
    });
    sections.push({ type: 'blank' });
  }

  // Period breakdown
  var periods = timeOfDayResult.periods || {};
  var periodRows = ['morning', 'afternoon', 'evening', 'night'].map(function(p) {
    var pd = periods[p] || { range: '', count: 0 };
    return [p.charAt(0).toUpperCase() + p.slice(1), pd.range || '—', formatNumber(pd.count)];
  });
  sections.push({
    type:    'table',
    headers: ['Period', 'Hours', 'Messages'],
    aligns:  ['left', 'left', 'right'],
    rows:    periodRows,
  });
  sections.push({ type: 'blank' });

  // Hourly heatmap (compact — 24 rows)
  var maxHourCount = Math.max.apply(null, (timeOfDayResult.byHour || []).map(function(h) { return h.count; }).concat([1]));
  var hourRows = (timeOfDayResult.byHour || []).map(function(h) {
    return [h.label, formatNumber(h.count), h.pct + '%', asciiBar(h.count, maxHourCount, 14)];
  });
  if (hourRows.length > 0) {
    sections.push({ type: 'heading', level: 3, text: 'Hourly Heatmap' });
    sections.push({
      type:    'table',
      headers: ['Hour', 'Messages', '%', 'Bar'],
      aligns:  ['left', 'right', 'right', 'left'],
      rows:    hourRows,
    });
    sections.push({ type: 'blank' });
  }

  // ── Day of Week ───────────────────────────────────────────────────────────
  sections.push({ type: 'heading', level: 3, text: 'Day of Week' });

  var wvw = dayOfWeekResult.weekendVsWeekday || {};
  sections.push({
    type: 'kv',
    pairs: [
      ['Most active day',    dayOfWeekResult.mostActive  ? dayOfWeekResult.mostActive.day  + ' (' + formatNumber(dayOfWeekResult.mostActive.count)  + ')' : '—'],
      ['Least active day',   dayOfWeekResult.leastActive ? dayOfWeekResult.leastActive.day + ' (' + formatNumber(dayOfWeekResult.leastActive.count) + ')' : '—'],
      ['Weekend vs weekday', wvw.weekendPct != null ? wvw.weekendPct + '% weekend / ' + wvw.weekdayPct + '% weekday' : '—'],
    ],
  });
  sections.push({ type: 'blank' });

  var maxDayCount = Math.max.apply(null, (dayOfWeekResult.byDay || []).map(function(d) { return d.count; }).concat([1]));
  var dayRows = (dayOfWeekResult.byDay || []).map(function(d) {
    return [d.day, formatNumber(d.count), d.pct + '%', asciiBar(d.count, maxDayCount, 14)];
  });
  if (dayRows.length > 0) {
    sections.push({
      type:    'table',
      headers: ['Day', 'Messages', '%', 'Bar'],
      aligns:  ['left', 'right', 'right', 'left'],
      rows:    dayRows,
    });
  }

  return { data, sections };
}

module.exports = { build };
