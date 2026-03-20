/**
 * reports/timeline-report.js
 *
 * Monthly volume with ASCII sparkline, daily heatmap data, and streak info.
 *
 * build(messages) → { data, sections }
 */

var { messageVolume } = require('../modules/stats/messageVolume');
var { streaks }       = require('../modules/stats/streaks');
var { timeOfDay }     = require('../modules/stats/timeOfDay');
var { dayOfWeek }     = require('../modules/stats/dayOfWeek');
var { formatNumber, formatDate, sparkline, asciiBar } = require('../lib/reporters/base-reporter');

function build(messages) {
  if (!Array.isArray(messages)) messages = [];

  var vol  = messageVolume(messages);
  var str  = streaks(messages);
  var tod  = timeOfDay(messages);
  var dow  = dayOfWeek(messages);

  // Monthly sparkline values
  var monthCounts = vol.byMonth.map(function(m) { return m.count; });

  var data = {
    byMonth:  vol.byMonth,
    byDay:    vol.byDay,
    streaks:  str,
    timeOfDay: tod,
    dayOfWeek: dow,
  };

  // Monthly bar section items
  var maxMonth = Math.max.apply(null, monthCounts.concat([1]));
  var monthItems = vol.byMonth.map(function(m) {
    return { label: m.month, value: m.count, max: maxMonth };
  });

  // Hourly bar items
  var maxHour = Math.max.apply(null, tod.byHour.map(function(h) { return h.count; }).concat([1]));
  var hourItems = tod.byHour.map(function(h) {
    return { label: h.label, value: h.count, max: maxHour };
  });

  // Day-of-week bar items
  var maxDow = Math.max.apply(null, dow.byDay.map(function(d) { return d.count; }).concat([1]));
  var dowItems = dow.byDay.map(function(d) {
    return { label: d.day.slice(0, 3), value: d.count, max: maxDow };
  });

  var sections = [
    { type: 'heading', level: 2, text: 'Timeline' },
    {
      type: 'kv',
      pairs: [
        ['Total active days',  formatNumber(str.totalActiveDays)],
        ['Longest streak',     str.longestStreak ? str.longestStreak.days + ' days (' + formatDate(str.longestStreak.startDate) + ' – ' + formatDate(str.longestStreak.endDate) + ')' : '—'],
        ['Current streak',     str.currentStreak ? str.currentStreak.days + ' days' : '—'],
        ['Longest gap',        str.longestGap    ? str.longestGap.days    + ' days (' + formatDate(str.longestGap.startDate)    + ' – ' + formatDate(str.longestGap.endDate)    + ')' : '—'],
      ],
    },
    { type: 'blank' },
    { type: 'heading', level: 2, text: 'Monthly Volume' },
    monthCounts.length > 0 ? {
      type: 'sparkline',
      label: 'Monthly message counts (' + vol.byMonth[0].month + ' → ' + vol.byMonth[vol.byMonth.length - 1].month + ')',
      values: monthCounts,
    } : { type: 'text', text: 'No data.' },
    { type: 'blank' },
    { type: 'bar', items: monthItems, width: 30 },
    { type: 'blank' },
    { type: 'heading', level: 2, text: 'Messages by Hour of Day' },
    {
      type: 'kv',
      pairs: [
        ['Peak hour',  tod.peakHour  ? tod.peakHour.label  + ' (' + formatNumber(tod.peakHour.count)  + ' msgs)' : '—'],
        ['Quiet hour', tod.quietHour ? tod.quietHour.label + ' (' + formatNumber(tod.quietHour.count) + ' msgs)' : '—'],
        ['Morning (6–11)',   formatNumber(tod.periods.morning.count)],
        ['Afternoon (12–5)', formatNumber(tod.periods.afternoon.count)],
        ['Evening (6–9)',    formatNumber(tod.periods.evening.count)],
        ['Night (10–5)',     formatNumber(tod.periods.night.count)],
      ],
    },
    { type: 'blank' },
    { type: 'bar', items: hourItems, width: 20 },
    { type: 'blank' },
    { type: 'heading', level: 2, text: 'Messages by Day of Week' },
    {
      type: 'kv',
      pairs: [
        ['Most active',  dow.mostActive  ? dow.mostActive.day  + ' (' + formatNumber(dow.mostActive.count)  + ')' : '—'],
        ['Least active', dow.leastActive ? dow.leastActive.day + ' (' + formatNumber(dow.leastActive.count) + ')' : '—'],
        ['Weekend %',    dow.weekendVsWeekday.weekendPct + '%'],
        ['Weekday %',    dow.weekendVsWeekday.weekdayPct + '%'],
      ],
    },
    { type: 'blank' },
    { type: 'bar', items: dowItems, width: 25 },
  ];

  return { data, sections };
}

module.exports = { build };
