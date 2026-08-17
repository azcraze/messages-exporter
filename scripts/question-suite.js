/**
 * scripts/question-suite.js
 *
 * Runs the full question-detection analysis family (8 features) against an
 * already-loaded analysis context and writes JSON + Markdown + CSV output
 * for each, using the same saveReport/makeMeta helpers as scripts/analyze.js.
 *
 * Called from scripts/analyze.js (as part of the full run) and from
 * scripts/analyze-questions.js (standalone — just this family). Mirrors
 * scripts/tfidf-suite.js's structure.
 *
 * runQuestionSuite(ctx, opts?) → Array<string>  names of features written
 *
 * ctx = { simplified, conversations, msgCount, dateRange }
 *       (the shape returned by lib/analyze-shared.js's loadContext())
 */

'use strict';

var { saveReport, makeMeta } = require('../lib/analyze-shared');

var { detectQuestions }             = require('../modules/nlp/questionDetector');
var { classifyQuestionTypes }        = require('../modules/nlp/questionTypeClassifier');
var { pairQuestionsWithAnswers }     = require('../modules/nlp/questionAnswerPairing');
var { findUnansweredQuestions }      = require('../modules/nlp/unansweredQuestions');
var { computeQuestionResponseTime }  = require('../modules/nlp/questionResponseTime');
var { detectRhetoricalQuestions }    = require('../modules/nlp/rhetoricalQuestionDetector');
var { computeQuestionInitiationStats } = require('../modules/nlp/questionInitiationStats');
var { tagQuestionTopics }             = require('../modules/nlp/questionTopics');

var questionReport           = require('../reports/question-report');
var questionTypeReport        = require('../reports/question-type-report');
var questionPairingReport     = require('../reports/question-pairing-report');
var unansweredQuestionsReport = require('../reports/unanswered-questions-report');
var questionResponseTimeReport = require('../reports/question-response-time-report');
var rhetoricalQuestionsReport = require('../reports/rhetorical-questions-report');
var questionInitiationReport  = require('../reports/question-initiation-report');
var questionTopicsReport      = require('../reports/question-topics-report');

/**
 * @param {Object} ctx  { simplified, conversations, msgCount, dateRange }
 * @param {Object} [opts]  reserved for future options (e.g. windowSize, maxGapMinutes)
 * @returns {Array<string>}  names of features written
 */
function runQuestionSuite(ctx, opts) {
  opts = opts || {};
  var simplified    = ctx.simplified;
  var conversations = ctx.conversations;
  var msgCount       = ctx.msgCount;
  var dateRange      = ctx.dateRange;

  var written = [];

  // 1. Question detection (original module, unchanged behavior)
  console.log('Running: question detection...');
  var qResult = detectQuestions(simplified, conversations);
  var qReport = questionReport.build(qResult);
  var allQuestions = [];
  Object.keys(qResult.bySender || {}).forEach(function(sender) {
    (qResult.bySender[sender] || []).forEach(function(q) {
      allQuestions.push({
        sender:         sender,
        date:           q.date ? q.date.slice(0, 10) : '',
        time:           q.time || '',
        conversationId: q.conversationId != null ? q.conversationId : '',
        participants:   (q.participants || []).join('; '),
        question:       q.message_text || '',
        following_1:    q.followingMessages[0] ? (q.followingMessages[0].sender + ': ' + q.followingMessages[0].message_text) : '',
        following_2:    q.followingMessages[1] ? (q.followingMessages[1].sender + ': ' + q.followingMessages[1].message_text) : '',
        following_3:    q.followingMessages[2] ? (q.followingMessages[2].sender + ': ' + q.followingMessages[2].message_text) : '',
      });
    });
  });
  saveReport('question-detection', qResult, qReport.sections, makeMeta('Question Detection', msgCount, dateRange), function() {
    return [{ filename: 'question-detection', rows: allQuestions,
      headers: ['sender','date','time','conversationId','participants','question','following_1','following_2','following_3'] }];
  });
  written.push('question-detection');

  // 2. Question type classification
  console.log('Running: question type classification...');
  var typeResult = classifyQuestionTypes(simplified);
  var typeRpt    = questionTypeReport.build(typeResult);
  saveReport('question-types', typeResult, typeRpt.sections, makeMeta('Question Type Classification', msgCount, dateRange), function(d) {
    var rows = (d.questions || []).map(function(q) {
      return { id: q._id, sender: q.sender, date: q.date, type: q.type, confidence: q.confidence, question: q.message_text };
    });
    return [{ filename: 'question-types', rows: rows, headers: ['id','sender','date','type','confidence','question'] }];
  });
  written.push('question-types');

  // 3. Question → answer pairing
  console.log('Running: question-answer pairing...');
  var pairingResult = pairQuestionsWithAnswers(simplified, conversations, opts);
  var pairingRpt     = questionPairingReport.build(pairingResult);
  saveReport('question-pairing', pairingResult, pairingRpt.sections, makeMeta('Question-Answer Pairing', msgCount, dateRange), function(d) {
    var rows = (d.pairs || []).map(function(p) {
      return {
        questionId: p.question._id, asker: p.question.sender, date: p.question.date, question: p.question.message_text,
        answerer: p.answer ? p.answer.sender : '', answer: p.answer ? p.answer.message_text : '',
        method: p.method || '', latencyMinutes: p.latencyMinutes != null ? p.latencyMinutes : '',
      };
    });
    return [{ filename: 'question-pairing', rows: rows, headers: ['questionId','asker','date','question','answerer','answer','method','latencyMinutes'] }];
  });
  written.push('question-pairing');

  // 4. Unanswered questions
  console.log('Running: unanswered question detection...');
  var unansweredResult = findUnansweredQuestions(simplified, conversations, opts);
  var unansweredRpt     = unansweredQuestionsReport.build(unansweredResult);
  saveReport('unanswered-questions', unansweredResult, unansweredRpt.sections, makeMeta('Unanswered Questions', msgCount, dateRange), function(d) {
    var rows = [];
    Object.keys(d.bySender || {}).forEach(function(sender) {
      (d.bySender[sender] || []).forEach(function(q) {
        rows.push({ sender: sender, date: q.date, time: q.time, conversationId: q.conversationId != null ? q.conversationId : '', question: q.message_text });
      });
    });
    return [{ filename: 'unanswered-questions', rows: rows, headers: ['sender','date','time','conversationId','question'] }];
  });
  written.push('unanswered-questions');

  // 5. Question response time
  console.log('Running: question response time...');
  var latencyResult = computeQuestionResponseTime(simplified, conversations, opts);
  var latencyRpt      = questionResponseTimeReport.build(latencyResult);
  saveReport('question-response-time', latencyResult, latencyRpt.sections, makeMeta('Question Response Time', msgCount, dateRange), function(d) {
    var rows = [];
    Object.keys(d.byPair || {}).forEach(function(pairKey) {
      var s = d.byPair[pairKey];
      rows.push({ pair: pairKey, mean: s.mean, median: s.median, count: s.count });
    });
    return [{ filename: 'question-response-time', rows: rows, headers: ['pair','mean','median','count'] }];
  });
  written.push('question-response-time');

  // 6. Rhetorical question detection
  console.log('Running: rhetorical question detection...');
  var rhetoricalResult = detectRhetoricalQuestions(simplified, conversations, opts);
  var rhetoricalRpt     = rhetoricalQuestionsReport.build(rhetoricalResult);
  saveReport('rhetorical-questions', rhetoricalResult, rhetoricalRpt.sections, makeMeta('Rhetorical Question Detection', msgCount, dateRange), function(d) {
    var rows = [];
    Object.keys(d.bySender || {}).forEach(function(sender) {
      (d.bySender[sender] || []).forEach(function(q) {
        rows.push({ sender: sender, date: q.date, question: q.message_text, reasons: (q.reasons || []).join('; ') });
      });
    });
    return [{ filename: 'rhetorical-questions', rows: rows, headers: ['sender','date','question','reasons'] }];
  });
  written.push('rhetorical-questions');

  // 7. Question initiation stats
  console.log('Running: question initiation stats...');
  var initiationResult = computeQuestionInitiationStats(simplified, conversations, opts);
  var initiationRpt     = questionInitiationReport.build(initiationResult);
  saveReport('question-initiation', initiationResult, initiationRpt.sections, makeMeta('Question Initiation Stats', msgCount, dateRange), function(d) {
    var rows = Object.keys(d.bySender || {}).map(function(sender) {
      var s = d.bySender[sender];
      return {
        sender: sender, messagesSent: s.messagesSent, questionsAsked: s.questionsAsked,
        curiosityIndex: s.curiosityIndex, questionsAnsweredByThem: s.questionsAnsweredByThem,
        askAnswerRatio: s.askAnswerRatio != null ? s.askAnswerRatio : '',
      };
    });
    return [{ filename: 'question-initiation', rows: rows, headers: ['sender','messagesSent','questionsAsked','curiosityIndex','questionsAnsweredByThem','askAnswerRatio'] }];
  });
  written.push('question-initiation');

  // 8. Question topics
  console.log('Running: question topic tagging...');
  var topicsResult = tagQuestionTopics(simplified, opts);
  var topicsRpt      = questionTopicsReport.build(topicsResult);
  saveReport('question-topics', topicsResult, topicsRpt.sections, makeMeta('Question Topics', msgCount, dateRange), function(d) {
    var rows = (d.tagged || []).map(function(q) {
      return { id: q._id, sender: q.sender, date: q.date, question: q.message_text, keywords: (q.keywords || []).map(function(k) { return k.term; }).join('; ') };
    });
    return [{ filename: 'question-topics', rows: rows, headers: ['id','sender','date','question','keywords'] }];
  });
  written.push('question-topics');

  return written;
}

module.exports = { runQuestionSuite };
