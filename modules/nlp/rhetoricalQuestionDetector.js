/**
 * modules/nlp/rhetoricalQuestionDetector.js
 *
 * Flags questions that likely aren't genuine information requests — no
 * answer is expected — combining three independent signals so a single
 * weak heuristic doesn't decide alone:
 *
 *   'phrase-cue'        — lib/question-analysis.js's classifyQuestion()
 *                          already matched a known rhetorical phrase
 *                          ("why me", "who cares", "right?", ...).
 *   'self-answered'      — the message contains its own answer after the
 *                          question mark (e.g. "Why do I even try? Because I care.").
 *   'unanswered-at-end'  — the question is a wh-question, got no paired
 *                          answer (modules/nlp/questionAnswerPairing.js),
 *                          and was the last message in its conversation —
 *                          consistent with "no answer was ever expected"
 *                          rather than "got ignored mid-conversation".
 *
 * A question is reported as rhetorical if it has at least one reason.
 *
 * detectRhetoricalQuestions(simplified, conversations, opts?) → {
 *   total:            number,  // total questions considered
 *   rhetoricalCount:  number,
 *   bySender:         { [sender]: Array<RhetoricalEntry> },
 * }
 *
 * RhetoricalEntry: {
 *   _id, sender, date, time, conversationId, message_text, reasons: Array<string>
 * }
 *
 * Options: same as questionAnswerPairing.js (windowSize, maxGapMinutes).
 */

var {
  classifyQuestion,
  linkConversationContext,
  resolveSender,
  formatTime,
} = require('../../lib/question-analysis');
var { pairQuestionsWithAnswers } = require('./questionAnswerPairing');

/**
 * True if there's non-trivial content after the first '?' that doesn't
 * itself read as another question — i.e. the message answers itself.
 * @param {string} text
 * @returns {boolean}
 */
function isSelfAnswered(text) {
  var qIdx = text.indexOf('?');
  if (qIdx === -1 || qIdx === text.length - 1) return false;

  var rest = text.slice(qIdx + 1).trim();
  if (!rest) return false;
  if (rest.endsWith('?')) return false; // "Why? Because why?" — still a question

  return rest.replace(/[^a-zA-Z0-9]/g, '').length >= 3;
}

/**
 * @param {Array<Object>} simplified
 * @param {Array<Object>} conversations
 * @param {Object}        [opts]
 * @returns {Object}
 */
function detectRhetoricalQuestions(simplified, conversations, opts) {
  if (!Array.isArray(simplified)) {
    return { total: 0, rhetoricalCount: 0, bySender: {} };
  }

  var msgMeta = linkConversationContext(simplified, conversations);
  var pairing = pairQuestionsWithAnswers(simplified, conversations, opts);

  var unansweredIds = {};
  pairing.pairs.forEach(function(pair) {
    if (!pair.answer) unansweredIds[pair.question._id] = true;
  });

  var bySender = {};
  var total = 0;
  var rhetoricalCount = 0;

  simplified.forEach(function(msg) {
    var classification = classifyQuestion(msg.message_text);
    if (!classification.isQuestion) return;
    total++;

    var meta = msgMeta[msg._id] || {};
    var reasons = [];

    if (classification.type === 'rhetorical-cue') reasons.push('phrase-cue');
    if (isSelfAnswered(msg.message_text)) reasons.push('self-answered');

    var isLastInConvo = Array.isArray(meta.convoMsgs) && meta.indexInConvo === meta.convoMsgs.length - 1;
    if (classification.type === 'wh' && unansweredIds[msg._id] && isLastInConvo) {
      reasons.push('unanswered-at-end');
    }

    if (reasons.length === 0) return;

    rhetoricalCount++;
    var sender = resolveSender(msg);
    var entry = {
      _id:            msg._id,
      sender:         sender,
      date:           msg.date || '',
      time:           formatTime(msg.date),
      conversationId: meta.conversationId != null ? meta.conversationId : null,
      message_text:   msg.message_text,
      reasons:        reasons,
    };

    if (!bySender[sender]) bySender[sender] = [];
    bySender[sender].push(entry);
  });

  return { total: total, rhetoricalCount: rhetoricalCount, bySender: bySender };
}

module.exports = { detectRhetoricalQuestions };
