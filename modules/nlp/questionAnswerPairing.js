/**
 * modules/nlp/questionAnswerPairing.js
 *
 * Pairs each detected question with its best-guess answer. This replaces
 * questionDetector.js's fixed "next 3 messages" window with an actual
 * attempt at finding *the* reply:
 *
 *   1. 'thread'  — if the question is part of an iOS 16+ reply thread
 *                  (thread_originator_guid), the next message from a
 *                  different sender within that same thread group.
 *   2. 'window'  — otherwise, the first following message from a different
 *                  sender in the same conversation, within opts.windowSize
 *                  messages and opts.maxGapMinutes minutes.
 *
 * Downstream modules (unansweredQuestions, questionResponseTime,
 * questionInitiationStats) all consume this module's output rather than
 * re-deriving pairing logic.
 *
 * pairQuestionsWithAnswers(simplified, conversations, opts?) → {
 *   total:         number,   // questions considered
 *   pairedCount:   number,
 *   unpairedCount: number,
 *   pairs:         Array<PairEntry>,
 * }
 *
 * PairEntry: {
 *   question: { _id, sender, date, time, conversationId, participants, message_text },
 *   answer:   { _id, sender, date, message_text } | null,
 *   method:   'thread' | 'window' | null,
 *   latencyMinutes: number | null,
 * }
 *
 * Options:
 *   windowSize      {number}  messages to look ahead for the 'window' method (default 5)
 *   maxGapMinutes   {number}  max time gap allowed for the 'window' method (default 720 / 12h)
 */

var { differenceInMinutes, parseISO, isValid } = require('../../utils/dateHelpers');
var {
  classifyQuestion,
  linkConversationContext,
  resolveSender,
  formatTime,
} = require('../../lib/question-analysis');
var { reconstructThreads } = require('./threadReconstructor');

var DEFAULT_WINDOW_SIZE    = 5;
var DEFAULT_MAX_GAP_MINUTES = 720;

/**
 * Build a lookup: msgId → { threadMessages, indexInThread }
 * @param {Array<Object>} simplified
 * @returns {Object}
 */
function buildThreadIndex(simplified) {
  var threadResult = reconstructThreads(simplified);
  var index = {};
  threadResult.threads.forEach(function(t) {
    t.messages.forEach(function(m, idx) {
      if (m._id) index[m._id] = { threadMessages: t.messages, indexInThread: idx };
    });
  });
  return index;
}

/**
 * @param {string} questionDate
 * @param {string} answerDate
 * @returns {number|null}
 */
function computeLatencyMinutes(questionDate, answerDate) {
  if (!questionDate || !answerDate) return null;
  var qd = parseISO(questionDate);
  var ad = parseISO(answerDate);
  if (!isValid(qd) || !isValid(ad)) return null;
  var gap = differenceInMinutes(ad, qd);
  return gap >= 0 ? gap : null;
}

/**
 * Try the 'thread' pairing method for a single question message.
 * @returns {Object|null} answer entry or null
 */
function findThreadAnswer(threadIndex, msg) {
  var entry = threadIndex[msg._id];
  if (!entry) return null;

  var mySender = resolveSender(msg);
  for (var i = entry.indexInThread + 1; i < entry.threadMessages.length; i++) {
    var candidate = entry.threadMessages[i];
    var candidateSender = resolveSender(candidate);
    if (candidateSender && candidateSender !== mySender) {
      return {
        _id:          candidate._id,
        sender:       candidateSender,
        date:         candidate.date || '',
        message_text: candidate.message_text || '',
      };
    }
  }
  return null;
}

/**
 * Try the 'window' pairing method for a single question message.
 * @returns {Object|null} answer entry or null
 */
function findWindowAnswer(meta, msg, windowSize, maxGapMinutes) {
  if (!meta || !Array.isArray(meta.convoMsgs)) return null;

  var mySender = resolveSender(msg);
  var start    = meta.indexInConvo + 1;
  var slice    = meta.convoMsgs.slice(start, start + windowSize);

  for (var i = 0; i < slice.length; i++) {
    var candidate = slice[i];
    var candidateSender = resolveSender(candidate);
    if (!candidateSender || candidateSender === mySender) continue;

    var latency = computeLatencyMinutes(msg.date, candidate.date);
    if (latency !== null && latency > maxGapMinutes) return null; // too far — stop looking

    return {
      _id:          candidate._id,
      sender:       candidateSender,
      date:         candidate.date || '',
      message_text: candidate.message_text || '',
    };
  }
  return null;
}

/**
 * @param {Array<Object>} simplified
 * @param {Array<Object>} conversations
 * @param {Object}        [opts]
 * @returns {Object}
 */
function pairQuestionsWithAnswers(simplified, conversations, opts) {
  if (!Array.isArray(simplified)) {
    return { total: 0, pairedCount: 0, unpairedCount: 0, pairs: [] };
  }

  opts = opts || {};
  var windowSize    = opts.windowSize || DEFAULT_WINDOW_SIZE;
  var maxGapMinutes  = opts.maxGapMinutes || DEFAULT_MAX_GAP_MINUTES;

  var msgMeta     = linkConversationContext(simplified, conversations);
  var threadIndex = buildThreadIndex(simplified);

  var pairs   = [];
  var paired   = 0;
  var unpaired = 0;

  simplified.forEach(function(msg) {
    if (!classifyQuestion(msg.message_text).isQuestion) return;

    var meta = msgMeta[msg._id] || {};

    var answer = findThreadAnswer(threadIndex, msg);
    var method = answer ? 'thread' : null;

    if (!answer) {
      answer = findWindowAnswer(meta, msg, windowSize, maxGapMinutes);
      if (answer) method = 'window';
    }

    if (answer) paired++; else unpaired++;

    pairs.push({
      question: {
        _id:            msg._id,
        sender:         resolveSender(msg),
        date:           msg.date || '',
        time:           formatTime(msg.date),
        conversationId: meta.conversationId != null ? meta.conversationId : null,
        participants:   meta.participants || [],
        message_text:   msg.message_text,
      },
      answer:         answer,
      method:         method,
      latencyMinutes: answer ? computeLatencyMinutes(msg.date, answer.date) : null,
    });
  });

  return {
    total:         pairs.length,
    pairedCount:   paired,
    unpairedCount: unpaired,
    pairs:         pairs,
  };
}

module.exports = { pairQuestionsWithAnswers };
