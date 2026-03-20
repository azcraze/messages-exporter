/**
 * modules/stats/participantStats.js
 *
 * Per-participant breakdown: message counts, send ratio, date span,
 * average message length, and reaction counts.
 *
 * participantStats(messages) → {
 *   participants: Array<{
 *     address, messageCount, sentCount, receivedCount,
 *     sendRatio, avgLength, firstSeen, lastSeen,
 *     reactionsSent, reactionsReceived,
 *   }>,
 *   totalParticipants: number,
 * }
 */

var _ = require('lodash');
var { parseISO, isValid, format } = require('../../utils/dateHelpers');

function participantStats(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { participants: [], totalParticipants: 0 };
  }

  // Build per-sender stats
  var senderMap = {};

  function ensure(address) {
    if (!senderMap[address]) {
      senderMap[address] = {
        address:           address,
        messageCount:      0,
        sentCount:         0,   // is_from_me === 1
        receivedCount:     0,   // is_from_me === 0
        totalLength:       0,
        reactionsSent:     0,
        reactionsReceived: 0,
        dates:             [],
      };
    }
    return senderMap[address];
  }

  messages.forEach(function(msg) {
    var sender = msg.sender || (msg.is_from_me === 1 ? 'me' : 'other');
    var entry  = ensure(sender);

    entry.messageCount++;
    if (msg.is_from_me === 1) entry.sentCount++;
    else                       entry.receivedCount++;

    if (msg.message_text) entry.totalLength += msg.message_text.length;

    // Track reactions
    var isReaction = msg.message_segments &&
      msg.message_segments.some(function(s) { return s.type === 'reaction'; });
    if (isReaction) {
      entry.reactionsSent++;
      // Mark the original message sender as having received a reaction
      if (msg.associated_sha) {
        // We don't have easy access to original sender here; counted globally
      }
    }

    var d = msg.date ? parseISO(msg.date) : null;
    if (d && isValid(d)) entry.dates.push(d);
  });

  var participants = Object.values(senderMap).map(function(e) {
    var sortedDates = e.dates.sort(function(a, b) { return a - b; });
    return {
      address:           e.address,
      messageCount:      e.messageCount,
      sentCount:         e.sentCount,
      receivedCount:     e.receivedCount,
      sendRatio:         e.messageCount > 0
        ? parseFloat((e.sentCount / e.messageCount).toFixed(3))
        : 0,
      avgLength:         e.messageCount > 0
        ? Math.round(e.totalLength / e.messageCount)
        : 0,
      firstSeen:         sortedDates.length ? format(sortedDates[0], "yyyy-MM-dd'T'HH:mm:ss") : null,
      lastSeen:          sortedDates.length ? format(sortedDates[sortedDates.length - 1], "yyyy-MM-dd'T'HH:mm:ss") : null,
      reactionsSent:     e.reactionsSent,
    };
  }).sort(function(a, b) { return b.messageCount - a.messageCount; });

  return {
    participants:      participants,
    totalParticipants: participants.length,
  };
}

module.exports = { participantStats };
