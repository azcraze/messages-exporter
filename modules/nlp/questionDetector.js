/**
 * modules/nlp/questionDetector.js
 *
 * Detects question messages and groups them by sender.
 * Each detected question is enriched with conversation context:
 * conversationId, participants, and the 3 messages that follow it
 * within the same conversation.
 *
 * Classification and conversation-linking logic live in
 * lib/question-analysis.js and are shared with the rest of the
 * modules/nlp/question*.js family (questionTypeClassifier, questionAnswerPairing,
 * unansweredQuestions, questionResponseTime, rhetoricalQuestionDetector,
 * questionInitiationStats, questionTopics).
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

var {
  classifyQuestion,
  linkConversationContext,
  resolveSender,
  followingMessages,
  formatTime,
} = require('../../lib/question-analysis');

/**
 * Returns true if the message text looks like a question.
 * @param {string} text
 * @returns {boolean}
 */
function isQuestion(text) {
  return classifyQuestion(text).isQuestion;
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

  var msgMeta = linkConversationContext(simplified, conversations);

  var bySender = {};
  var total    = 0;

  simplified.forEach(function(msg) {
    if (!isQuestion(msg.message_text)) return;

    var sender = resolveSender(msg);
    var meta   = msgMeta[msg._id] || {};

    var entry = {
      _id:               msg._id,
      date:              msg.date || '',
      time:              formatTime(msg.date),
      conversationId:    meta.conversationId != null ? meta.conversationId : null,
      participants:      meta.participants   || [],
      message_text:      msg.message_text,
      followingMessages: followingMessages(meta, 3),
    };

    total++;
    if (!bySender[sender]) bySender[sender] = [];
    bySender[sender].push(entry);
  });

  return { total: total, bySender: bySender };
}

module.exports = { detectQuestions, isQuestion };
