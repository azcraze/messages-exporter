/**
 * modules/stats/responseTime.js
 *
 * Calculates response times between consecutive messages from different senders.
 * Only gaps <= maxGapMinutes are counted (larger gaps indicate separate conversations).
 *
 * responseTime(messages, opts?) → {
 *   overall:  { mean, median, count },
 *   bySender: { [senderAddress]: { mean, median, count } },
 * }
 *
 * Times are in minutes, rounded to 1 decimal place.
 */

var { parseISO, isValid, differenceInMinutes } = require('../../utils/dateHelpers');

var DEFAULT_MAX_GAP = 240; // 4 hours — beyond this it's a new conversation, not a response

function median(arr) {
  if (arr.length === 0) return null;
  var sorted = arr.slice().sort(function(a, b) { return a - b; });
  var mid    = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? parseFloat(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1))
    : parseFloat(sorted[mid].toFixed(1));
}

function mean(arr) {
  if (arr.length === 0) return null;
  return parseFloat((arr.reduce(function(s, v) { return s + v; }, 0) / arr.length).toFixed(1));
}

function responseTime(messages, opts) {
  if (!Array.isArray(messages) || messages.length < 2) {
    return { overall: null, bySender: {} };
  }

  opts = opts || {};
  var maxGap = opts.maxGapMinutes || DEFAULT_MAX_GAP;

  // Sort chronologically and filter to valid dates
  var sorted = messages
    .map(function(msg) {
      var d = msg.date ? parseISO(msg.date) : null;
      return (d && isValid(d)) ? { msg: msg, date: d } : null;
    })
    .filter(Boolean)
    .sort(function(a, b) { return a.date - b.date; });

  var bySender = {}; // { address: [minutes, ...] }
  var overall  = [];

  for (var i = 1; i < sorted.length; i++) {
    var prev = sorted[i - 1];
    var curr = sorted[i];

    var prevSender = prev.msg.sender || (prev.msg.is_from_me === 1 ? 'me' : 'other');
    var currSender = curr.msg.sender || (curr.msg.is_from_me === 1 ? 'me' : 'other');

    // Only count as a response when the sender changes
    if (prevSender === currSender) continue;

    var gap = differenceInMinutes(curr.date, prev.date);
    if (gap < 0 || gap > maxGap) continue;

    overall.push(gap);
    if (!bySender[currSender]) bySender[currSender] = [];
    bySender[currSender].push(gap);
  }

  var bySenderResult = {};
  Object.keys(bySender).forEach(function(sender) {
    var times = bySender[sender];
    bySenderResult[sender] = {
      mean:   mean(times),
      median: median(times),
      count:  times.length,
    };
  });

  return {
    overall: {
      mean:   mean(overall),
      median: median(overall),
      count:  overall.length,
    },
    bySender: bySenderResult,
  };
}

module.exports = { responseTime };
