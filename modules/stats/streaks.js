/**
 * modules/stats/streaks.js
 *
 * Finds consecutive active-day streaks and longest quiet gaps in a message set.
 *
 * streaks(messages) → {
 *   longestStreak:  { startDate, endDate, days },
 *   currentStreak:  { startDate, endDate, days },
 *   longestGap:     { startDate, endDate, days },
 *   totalActiveDays: number,
 * }
 */

var {
  parseISO, isValid, format,
  startOfDay, differenceInDays, addDays,
} = require('../../utils/dateHelpers');

function streaks(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { longestStreak: null, currentStreak: null, longestGap: null, totalActiveDays: 0 };
  }

  // Collect unique active day strings (yyyy-MM-dd)
  var daySet = {};
  messages.forEach(function(msg) {
    if (!msg || !msg.date) return;
    var d = parseISO(msg.date);
    if (!isValid(d)) return;
    daySet[format(startOfDay(d), 'yyyy-MM-dd')] = true;
  });

  var days = Object.keys(daySet).sort(); // ascending ISO strings sort correctly
  if (days.length === 0) {
    return { longestStreak: null, currentStreak: null, longestGap: null, totalActiveDays: 0 };
  }

  var longestStreak = { startDate: days[0], endDate: days[0], days: 1 };
  var currentRun    = { startDate: days[0], endDate: days[0], days: 1 };
  var longestGap    = null;

  for (var i = 1; i < days.length; i++) {
    var prev = parseISO(days[i - 1]);
    var curr = parseISO(days[i]);
    var gap  = differenceInDays(curr, prev); // should always be >= 1

    if (gap === 1) {
      // Consecutive
      currentRun.endDate = days[i];
      currentRun.days++;
      if (currentRun.days > longestStreak.days) {
        longestStreak = { startDate: currentRun.startDate, endDate: currentRun.endDate, days: currentRun.days };
      }
    } else {
      // Gap found
      var gapObj = {
        startDate: format(addDays(prev, 1), 'yyyy-MM-dd'),
        endDate:   format(addDays(curr, -1), 'yyyy-MM-dd'),
        days:      gap - 1,
      };
      if (!longestGap || gapObj.days > longestGap.days) {
        longestGap = gapObj;
      }
      // Reset streak
      currentRun = { startDate: days[i], endDate: days[i], days: 1 };
    }
  }

  // currentStreak = the run that includes the last known active day
  var currentStreak = currentRun;

  return {
    longestStreak:   longestStreak,
    currentStreak:   currentStreak,
    longestGap:      longestGap,
    totalActiveDays: days.length,
  };
}

module.exports = { streaks };
