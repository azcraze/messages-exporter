/**
 * modules/stats/dayOfWeek.js
 *
 * Counts messages by day of week and identifies the most / least active days.
 *
 * dayOfWeek(messages) → {
 *   byDay:      Array<{ dayIndex, day, count, pct }>,  // Mon-first order
 *   mostActive: { day, count },
 *   leastActive:{ day, count },
 *   weekendVsWeekday: { weekend, weekday, weekendPct, weekdayPct },
 * }
 */

var { parseISO, isValid, getDay } = require('../../utils/dateHelpers');

// getDay() returns 0=Sun … 6=Sat; we display Mon-first
var DAY_NAMES   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
var MON_FIRST   = [1,2,3,4,5,6,0]; // Mon=0 in display order

function dayOfWeek(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { byDay: [], mostActive: null, leastActive: null, weekendVsWeekday: {} };
  }

  var counts = new Array(7).fill(0); // index = getDay() value (0=Sun)
  var total  = 0;

  messages.forEach(function(msg) {
    if (!msg || !msg.date) return;
    var d = parseISO(msg.date);
    if (!isValid(d)) return;
    counts[getDay(d)]++;
    total++;
  });

  // Return in Mon–Sun display order
  var byDay = MON_FIRST.map(function(jsDay) {
    return {
      dayIndex: jsDay,
      day:      DAY_NAMES[jsDay],
      count:    counts[jsDay],
      pct:      total > 0 ? parseFloat((counts[jsDay] / total * 100).toFixed(1)) : 0,
    };
  });

  var sorted      = byDay.slice().sort(function(a, b) { return b.count - a.count; });
  var mostActive  = sorted[0];
  var leastActive = sorted[sorted.length - 1];

  var weekendCount  = counts[0] + counts[6]; // Sun + Sat
  var weekdayCount  = total - weekendCount;

  return {
    byDay:      byDay,
    mostActive: mostActive,
    leastActive:leastActive,
    weekendVsWeekday: {
      weekend:    weekendCount,
      weekday:    weekdayCount,
      weekendPct: total > 0 ? parseFloat((weekendCount / total * 100).toFixed(1)) : 0,
      weekdayPct: total > 0 ? parseFloat((weekdayCount / total * 100).toFixed(1)) : 0,
    },
  };
}

module.exports = { dayOfWeek };
