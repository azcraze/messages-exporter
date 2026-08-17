/**
 * modules/nlp/unansweredQuestions.js
 *
 * Filters modules/nlp/questionAnswerPairing.js's output down to questions
 * that never got a paired answer — dropped, ignored, or the conversation
 * simply ended first.
 *
 * findUnansweredQuestions(simplified, conversations, opts?) → {
 *   total:            number,   // total questions considered
 *   unansweredCount:  number,
 *   bySender:         { [sender]: Array<UnansweredEntry> },
 * }
 *
 * UnansweredEntry: {
 *   _id, date, time, conversationId, participants, message_text
 * }
 *
 * Options: same as questionAnswerPairing.js (windowSize, maxGapMinutes).
 */

var { pairQuestionsWithAnswers } = require('./questionAnswerPairing');

/**
 * @param {Array<Object>} simplified
 * @param {Array<Object>} conversations
 * @param {Object}        [opts]
 * @returns {Object}
 */
function findUnansweredQuestions(simplified, conversations, opts) {
  var pairing = pairQuestionsWithAnswers(simplified, conversations, opts);

  var bySender = {};

  pairing.pairs.forEach(function(pair) {
    if (pair.answer) return;

    var q      = pair.question;
    var sender = q.sender || 'unknown';

    var entry = {
      _id:            q._id,
      date:           q.date,
      time:           q.time,
      conversationId: q.conversationId,
      participants:   q.participants,
      message_text:   q.message_text,
    };

    if (!bySender[sender]) bySender[sender] = [];
    bySender[sender].push(entry);
  });

  return {
    total:           pairing.total,
    unansweredCount: pairing.unpairedCount,
    bySender:        bySender,
  };
}

module.exports = { findUnansweredQuestions };
