/**
 * modules/nlp/reactionMapper.js
 *
 * Maps reaction messages back to the original messages they react to.
 * Reactions are identified by message_segments with type === 'reaction'
 * and linked via the associated_sha field.
 *
 * mapReactions(messages) → {
 *   total:      number,   // total reaction messages found
 *   resolved:   number,   // reactions where original message was found
 *   unresolved: number,   // reactions where original message was not found
 *   reactions:  Array<ReactionEntry>,
 *   byType:     { [reactionType]: Array<ReactionEntry> },
 *   bySender:   { [sender]: Array<ReactionEntry> },
 * }
 *
 * ReactionEntry: {
 *   reactionMsg:    Object,   // the reaction message itself
 *   originalMsg:    Object|null,
 *   reactionType:   string,
 *   sender:         string,
 *   date:           string,
 * }
 */

/**
 * Extract the reaction type from a message's segments.
 * Returns null if no reaction segment is found.
 * @param {Object} msg
 * @returns {string|null}
 */
function extractReactionType(msg) {
  if (!Array.isArray(msg.message_segments)) return null;
  for (var i = 0; i < msg.message_segments.length; i++) {
    var seg = msg.message_segments[i];
    if (seg && seg.type === 'reaction') {
      return seg.reaction_type || 'unknown';
    }
  }
  return null;
}

/**
 * @param {Array<Object>} messages - simplified message array
 * @returns {Object}
 */
function mapReactions(messages) {
  if (!Array.isArray(messages)) {
    return { total: 0, resolved: 0, unresolved: 0, reactions: [], byType: {}, bySender: {} };
  }

  // Build SHA → message lookup
  var shaMap = {};
  messages.forEach(function(msg) {
    if (msg.sha) shaMap[msg.sha] = msg;
  });

  var reactions  = [];
  var byType     = {};
  var bySender   = {};
  var resolved   = 0;
  var unresolved = 0;

  messages.forEach(function(msg) {
    var reactionType = extractReactionType(msg);

    // A message is a reaction if it has a reaction segment OR an associated_sha
    // (but no reaction segment — could be a reply-reaction variant)
    var isReaction = (reactionType !== null) || (msg.associated_sha && !msg.message_text);
    if (!isReaction) return;

    if (!reactionType) reactionType = 'unknown';

    var originalMsg = msg.associated_sha ? (shaMap[msg.associated_sha] || null) : null;
    var sender      = msg.sender || (msg.is_from_me === 1 ? 'me' : 'other');

    var entry = {
      reactionMsg:  msg,
      originalMsg:  originalMsg,
      reactionType: reactionType,
      sender:       sender,
      date:         msg.date || '',
    };

    if (originalMsg) resolved++; else unresolved++;

    reactions.push(entry);

    if (!byType[reactionType])  byType[reactionType] = [];
    byType[reactionType].push(entry);

    if (!bySender[sender]) bySender[sender] = [];
    bySender[sender].push(entry);
  });

  return {
    total:      reactions.length,
    resolved:   resolved,
    unresolved: unresolved,
    reactions:  reactions,
    byType:     byType,
    bySender:   bySender,
  };
}

module.exports = { mapReactions };
