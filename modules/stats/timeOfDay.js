/**
 * modules/stats/timeOfDay.js
 *
 * Counts messages by hour of day (0–23) and identifies peak hours.
 *
 * timeOfDay(messages) → {
 *   byHour:    Array<{ hour, label, count, pct }>,   // all 24 hours
 *   peakHour:  { hour, label, count },
 *   quietHour: { hour, label, count },
 *   periods:   { morning, afternoon, evening, night },  // bucketed counts
 * }
 */

var { parseISO, isValid, getHours } = require('../../utils/dateHelpers');

var HOUR_LABELS = [
  '12 AM','1 AM','2 AM','3 AM','4 AM','5 AM',
  '6 AM','7 AM','8 AM','9 AM','10 AM','11 AM',
  '12 PM','1 PM','2 PM','3 PM','4 PM','5 PM',
  '6 PM','7 PM','8 PM','9 PM','10 PM','11 PM',
];

function timeOfDay(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { byHour: [], peakHour: null, quietHour: null, periods: {} };
  }

  var counts = new Array(24).fill(0);
  var total  = 0;

  messages.forEach(function(msg) {
    if (!msg || !msg.date) return;
    var d = parseISO(msg.date);
    if (!isValid(d)) return;
    counts[getHours(d)]++;
    total++;
  });

  var byHour = counts.map(function(count, hour) {
    return {
      hour:  hour,
      label: HOUR_LABELS[hour],
      count: count,
      pct:   total > 0 ? parseFloat((count / total * 100).toFixed(1)) : 0,
    };
  });

  var sorted  = byHour.slice().sort(function(a, b) { return b.count - a.count; });
  var peakHour  = sorted[0];
  var quietHour = sorted[sorted.length - 1];

  // Morning 6–11, Afternoon 12–17, Evening 18–21, Night 22–5
  function sumRange(start, end) {
    var s = 0;
    for (var h = start; h <= end; h++) s += counts[h];
    return s;
  }

  var periods = {
    morning:   { range: '6 AM–11 AM',  count: sumRange(6,  11) },
    afternoon: { range: '12 PM–5 PM',  count: sumRange(12, 17) },
    evening:   { range: '6 PM–9 PM',   count: sumRange(18, 21) },
    night:     { range: '10 PM–5 AM',  count: sumRange(22, 23) + sumRange(0, 5) },
  };

  return { byHour, peakHour, quietHour, periods };
}

module.exports = { timeOfDay };
