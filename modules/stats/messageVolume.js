/**
 * modules/stats/messageVolume.js
 *
 * Groups message counts by day, week, month, and year.
 *
 * messageVolume(messages) → {
 *   total:       number,
 *   dateRange:   { first, last, spanDays },
 *   byDay:       Array<{ date, count }>,
 *   byWeek:      Array<{ weekStart, count }>,
 *   byMonth:     Array<{ month, count }>,
 *   byYear:      Array<{ year, count }>,
 *   averages:    { perDay, perWeek, perMonth },
 * }
 */

var _ = require('lodash');
var {
  parseISO, isValid, format,
  startOfDay, startOfWeek, startOfMonth, startOfYear,
  differenceInDays,
} = require('../../utils/dateHelpers');

function parseMsgDate(msg) {
  if (!msg || !msg.date) return null;
  var d = parseISO(msg.date);
  return isValid(d) ? d : null;
}

function groupAndCount(messages, keyFn, labelFn) {
  var groups = {};
  messages.forEach(function(msg) {
    var d = parseMsgDate(msg);
    if (!d) return;
    var key = keyFn(d);
    groups[key] = (groups[key] || { key: key, label: labelFn(d), count: 0 });
    groups[key].count++;
  });
  return Object.values(groups).sort(function(a, b) {
    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });
}

function messageVolume(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { total: 0, dateRange: null, byDay: [], byWeek: [], byMonth: [], byYear: [], averages: {} };
  }

  var dates = messages.map(parseMsgDate).filter(Boolean).sort(function(a, b) { return a - b; });
  var first  = dates[0];
  var last   = dates[dates.length - 1];
  var spanDays = differenceInDays(last, first) + 1;

  var byDay = groupAndCount(
    messages,
    function(d) { return format(startOfDay(d),   'yyyy-MM-dd'); },
    function(d) { return format(startOfDay(d),   'yyyy-MM-dd'); }
  ).map(function(g) { return { date: g.label, count: g.count }; });

  var byWeek = groupAndCount(
    messages,
    function(d) { return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd'); },
    function(d) { return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd'); }
  ).map(function(g) { return { weekStart: g.label, count: g.count }; });

  var byMonth = groupAndCount(
    messages,
    function(d) { return format(startOfMonth(d), 'yyyy-MM'); },
    function(d) { return format(startOfMonth(d), 'MMM yyyy'); }
  ).map(function(g) { return { month: g.label, count: g.count }; });

  var byYear = groupAndCount(
    messages,
    function(d) { return format(startOfYear(d),  'yyyy'); },
    function(d) { return format(startOfYear(d),  'yyyy'); }
  ).map(function(g) { return { year: g.label, count: g.count }; });

  var totalDays   = byDay.length   || 1;
  var totalWeeks  = byWeek.length  || 1;
  var totalMonths = byMonth.length || 1;

  return {
    total:     messages.length,
    dateRange: {
      first:    format(first, "yyyy-MM-dd'T'HH:mm:ss"),
      last:     format(last,  "yyyy-MM-dd'T'HH:mm:ss"),
      spanDays: spanDays,
    },
    byDay:    byDay,
    byWeek:   byWeek,
    byMonth:  byMonth,
    byYear:   byYear,
    averages: {
      perDay:   parseFloat((messages.length / totalDays).toFixed(1)),
      perWeek:  parseFloat((messages.length / totalWeeks).toFixed(1)),
      perMonth: parseFloat((messages.length / totalMonths).toFixed(1)),
    },
  };
}

module.exports = { messageVolume };
