/**
 * modules/nlp/questionInitiationStats.js
 *
 * Per-participant question-asking behavior: how many questions each person
 * asks relative to how much they talk (a "curiosity index"), and how often
 * they're the one who answers questions asked of them — built on
 * lib/question-analysis.js's classifyQuestion() and
 * modules/nlp/questionAnswerPairing.js's answer pairing.
 *
 * computeQuestionInitiationStats(simplified, conversations, opts?) → {
 *   totals: { messagesSent, questionsAsked, questionsAnswered },
 *   bySender: {
 *     [sender]: {
 *       messagesSent:        number,
 *       questionsAsked:      number,
 *       curiosityIndex:      number,       // questionsAsked / messagesSent
 *       questionsAnsweredByThem: number,   // times they were the paired answerer
 *       askAnswerRatio:      number|null,  // questionsAsked / questionsAnsweredByThem
 *     }
 *   },
 * }
 *
 * Options: same as questionAnswerPairing.js (windowSize, maxGapMinutes).
 */

var { classifyQuestion, resolveSender } = require('../../lib/question-analysis');
var { pairQuestionsWithAnswers }         = require('./questionAnswerPairing');

/**
 * @param {Array<Object>} simplified
 * @param {Array<Object>} conversations
 * @param {Object}        [opts]
 * @returns {Object}
 */
function computeQuestionInitiationStats(simplified, conversations, opts) {
  if (!Array.isArray(simplified)) {
    return { totals: { messagesSent: 0, questionsAsked: 0, questionsAnswered: 0 }, bySender: {} };
  }

  var stats = {}; // sender -> { messagesSent, questionsAsked, questionsAnsweredByThem }

  function ensure(sender) {
    if (!stats[sender]) stats[sender] = { messagesSent: 0, questionsAsked: 0, questionsAnsweredByThem: 0 };
    return stats[sender];
  }

  simplified.forEach(function(msg) {
    var sender = resolveSender(msg);
    var s = ensure(sender);
    s.messagesSent++;
    if (classifyQuestion(msg.message_text).isQuestion) s.questionsAsked++;
  });

  var pairing = pairQuestionsWithAnswers(simplified, conversations, opts);
  var questionsAnswered = 0;
  pairing.pairs.forEach(function(pair) {
    if (!pair.answer) return;
    questionsAnswered++;
    var s = ensure(pair.answer.sender || 'unknown');
    s.questionsAnsweredByThem++;
  });

  var bySender = {};
  var totalMessages = 0;
  var totalQuestions = 0;

  Object.keys(stats).forEach(function(sender) {
    var s = stats[sender];
    totalMessages  += s.messagesSent;
    totalQuestions += s.questionsAsked;

    bySender[sender] = {
      messagesSent:            s.messagesSent,
      questionsAsked:          s.questionsAsked,
      curiosityIndex:          s.messagesSent > 0 ? parseFloat((s.questionsAsked / s.messagesSent).toFixed(4)) : 0,
      questionsAnsweredByThem: s.questionsAnsweredByThem,
      askAnswerRatio:          s.questionsAnsweredByThem > 0 ? parseFloat((s.questionsAsked / s.questionsAnsweredByThem).toFixed(2)) : null,
    };
  });

  return {
    totals: {
      messagesSent:      totalMessages,
      questionsAsked:    totalQuestions,
      questionsAnswered: questionsAnswered,
    },
    bySender: bySender,
  };
}

module.exports = { computeQuestionInitiationStats };
