/**
 * modules/nlp/questionDetector.js
 *
 * Detects question messages and groups them by sender.
 * Each detected question is enriched with conversation context:
 * conversationId, participants, and the 3 messages that follow it
 * within the same conversation.
 *
 * detectQuestions(simplified, conversations) → {
 *   total:     number,
 *   bySender:  { [sender]: Array<QuestionEntry> },
 * }
 *
 * QuestionEntry: {
 *   _id, date, time, conversationId, participants,
 *   message_text, followingMessages: Array (up to 3)
 * }
 */

var { format } = require('../../utils/dateHelpers');

// Wh-words that, when a message starts with them, signal a question
var WH_WORDS = new Set([
  'what', 'why', 'when', 'where', 'who', 'whom', 'whose', 'which', 'how',
]);

// Auxiliary verbs at sentence start that signal a yes/no question
var AUX_VERBS = new Set([
  'do', 'does', 'did',
  'is', 'are', 'was', 'were',
  'will', 'would', 'shall', 'should',
  'can', 'could', 'may', 'might', 'must',
  'have', 'has', 'had',
]);

/**
 * Returns true if the message text looks like a question.
 * @param {string} text
 * @returns {boolean}
 */
function isQuestion(text) {
  if (!text || typeof text !== 'string') return false;
  var trimmed = text.trim();
  if (!trimmed) return false;

  // Ends with a question mark
  if (trimmed.endsWith('?')) return true;

  // First word is a wh-word or auxiliary verb (case-insensitive)
  var firstWord = trimmed.split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, '');
  if (WH_WORDS.has(firstWord)) return true;
  if (AUX_VERBS.has(firstWord)) return true;

  return false;
}

/**
 * Format time as HH:mm from an ISO date string.
 * @param {string} isoDate
 * @returns {string}
 */
function formatTime(isoDate) {
  if (!isoDate) return '';
  try {
    return format(new Date(isoDate), 'HH:mm');
  } catch (e) {
    return '';
  }
}

/**
 * Detect questions across all messages, enriching each with
 * conversationId, participants, and following 3 messages.
 *
 * @param {Array<Object>} simplified   - cleaned message array from getSimplifiedMessages
 * @param {Array<Object>} conversations - array of { conversationId, date, conversationMsgs, ... }
 * @returns {{ total: number, bySender: Object }}
 */
function detectQuestions(simplified, conversations) {
  if (!Array.isArray(simplified)) return { total: 0, bySender: {} };

  // Build a lookup: message _id → { conversationId, participants, indexInConvo, convoMsgs }
  var msgMeta = {};
  var convos  = Array.isArray(conversations) ? conversations : [];

  convos.forEach(function(convo) {
    var msgs = convo.conversationMsgs || convo.conversation_msgs || [];
    var cid  = convo.conversationId != null ? convo.conversationId : convo.conversationID;
    var participants = [];

    // Derive participants from message senders in this conversation
    var senderSet = {};
    msgs.forEach(function(m) { if (m.from || m.sender) senderSet[m.from || m.sender] = true; });
    participants = Object.keys(senderSet);

    msgs.forEach(function(msg, idx) {
      var id = msg._id;
      if (id) {
        msgMeta[id] = {
          conversationId:  cid,
          participants:    participants,
          indexInConvo:    idx,
          convoMsgs:       msgs,
        };
      }
    });
  });

  var bySender = {};
  var total    = 0;

  simplified.forEach(function(msg) {
    if (!isQuestion(msg.message_text)) return;

    var sender = msg.sender || (msg.is_from_me === 1 ? 'me' : 'other');
    var meta   = msgMeta[msg._id] || {};
    var followingMessages = [];

    if (meta.convoMsgs) {
      var start = meta.indexInConvo + 1;
      followingMessages = meta.convoMsgs
        .slice(start, start + 3)
        .map(function(m) {
          return {
            sender:       m.from || m.sender || '',
            date:         m.date || m.dateTime || '',
            message_text: m.message_text || '',
          };
        });
    }

    var entry = {
      _id:               msg._id,
      date:              msg.date || '',
      time:              formatTime(msg.date),
      conversationId:    meta.conversationId != null ? meta.conversationId : null,
      participants:      meta.participants   || [],
      message_text:      msg.message_text,
      followingMessages: followingMessages,
    };

    total++;
    if (!bySender[sender]) bySender[sender] = [];
    bySender[sender].push(entry);
  });

  return { total: total, bySender: bySender };
}

module.exports = { detectQuestions, isQuestion };
