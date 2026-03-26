/**
 * modules/stats/emojiStats.js
 *
 * Extracts and ranks emoji usage across all message texts.
 * Uses Unicode property escapes (requires Node.js 10+).
 *
 * emojiStats(messages, opts?) → {
 *   total:        number,
 *   unique:       number,
 *   topN:         Array<{ emoji, count, rank }>,
 *   perSender:    { [address]: Array<{ emoji, count }> },  // if opts.perSender
 * }
 */

// Matches individual emoji presentations including ZWJ sequences and modifiers
var EMOJI_RE = /\p{Extended_Pictographic}(?:\u200D\p{Extended_Pictographic})*/gu;

function extractEmoji(text) {
  if (!text) return [];
  var matches = text.match(EMOJI_RE);
  return matches || [];
}

function buildFreqMap(messages) {
  var map = {};
  messages.forEach(function(msg) {
    if (!msg || !msg.message_text) return;
    extractEmoji(msg.message_text).forEach(function(e) {
      map[e] = (map[e] || 0) + 1;
    });
  });
  return map;
}

function toRankedList(map, topN) {
  return Object.keys(map)
    .map(function(e) { return { emoji: e, count: map[e] }; })
    .sort(function(a, b) { return b.count - a.count; })
    .slice(0, topN)
    .map(function(entry, i) { return Object.assign({ rank: i + 1 }, entry); });
}

function emojiStats(messages, opts) {
  if (!Array.isArray(messages)) {
    return { total: 0, unique: 0, topN: [], perSender: {} };
  }

  opts = opts || {};
  var topN = opts.topN || 30;

  var overallMap = buildFreqMap(messages);
  var total  = Object.values(overallMap).reduce(function(s, n) { return s + n; }, 0);
  var unique = Object.keys(overallMap).length;

  var result = {
    total:  total,
    unique: unique,
    topN:   toRankedList(overallMap, topN),
  };

  if (opts.perSender) {
    var bySender = {};
    messages.forEach(function(msg) {
      var sender = msg.sender || (msg.is_from_me === 1 ? 'me' : 'other');
      if (!bySender[sender]) bySender[sender] = [];
      bySender[sender].push(msg);
    });
    result.perSender = {};
    Object.keys(bySender).forEach(function(sender) {
      result.perSender[sender] = toRankedList(buildFreqMap(bySender[sender]), topN);
    });
  }

  return result;
}

module.exports = { emojiStats };
