/**
 * modules/stats/conversationStats.js
 *
 * Analyses conversation lengths from the grouped conversations produced by
 * lib/pipeline.js (array of { date, conversation_msgs }).
 *
 * conversationStats(conversations) → {
 *   total:       number,
 *   totalMessages: number,
 *   average:     number,
 *   median:      number,
 *   longest:     { date, messageCount },
 *   shortest:    { date, messageCount },
 *   distribution: { '1-5': n, '6-15': n, '16-30': n, '31-60': n, '60+': n },
 * }
 */

function median(arr) {
  if (arr.length === 0) return 0;
  var sorted = arr.slice().sort(function(a, b) { return a - b; });
  var mid    = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function bucket(n) {
  if (n <= 5)   return '1-5';
  if (n <= 15)  return '6-15';
  if (n <= 30)  return '16-30';
  if (n <= 60)  return '31-60';
  return '60+';
}

function conversationStats(conversations) {
  if (!Array.isArray(conversations) || conversations.length === 0) {
    return { total: 0, totalMessages: 0, average: 0, median: 0, longest: null, shortest: null, distribution: {} };
  }

  var dist = { '1-5': 0, '6-15': 0, '16-30': 0, '31-60': 0, '60+': 0 };
  var lengths = [];
  var totalMessages = 0;
  var longestIdx = 0;
  var shortestIdx = 0;

  conversations.forEach(function(convo, i) {
    var n = Array.isArray(convo.conversation_msgs) ? convo.conversation_msgs.length : 0;
    lengths.push(n);
    totalMessages += n;
    dist[bucket(n)]++;
    if (n > lengths[longestIdx])  longestIdx  = i;
    if (n < lengths[shortestIdx]) shortestIdx = i;
  });

  var avg = parseFloat((totalMessages / conversations.length).toFixed(1));

  return {
    total:         conversations.length,
    totalMessages: totalMessages,
    average:       avg,
    median:        parseFloat(median(lengths).toFixed(1)),
    longest:  {
      date:         conversations[longestIdx].date  || null,
      messageCount: lengths[longestIdx],
    },
    shortest: {
      date:         conversations[shortestIdx].date || null,
      messageCount: lengths[shortestIdx],
    },
    distribution: dist,
  };
}

module.exports = { conversationStats };
