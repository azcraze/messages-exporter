/**
 * modules/nlp/questionTypeClassifier.js
 *
 * Applies lib/question-analysis.js's classifyQuestion() across every message
 * and aggregates the resulting question types (wh / yes-no / tag / choice /
 * rhetorical-cue / other) overall and per sender — "what kind of questions
 * does each person actually ask."
 *
 * classifyQuestionTypes(simplified) → {
 *   total:       number,
 *   overall:     { [type]: number },
 *   bySender:    { [sender]: { [type]: number, total: number } },
 *   questions:   Array<QuestionTypeEntry>,
 * }
 *
 * QuestionTypeEntry: {
 *   _id, sender, date, message_text, type, confidence
 * }
 */

var { classifyQuestion, resolveSender } = require('../../lib/question-analysis');

/**
 * @param {Array<Object>} simplified - cleaned message array
 * @returns {Object}
 */
function classifyQuestionTypes(simplified) {
  if (!Array.isArray(simplified)) {
    return { total: 0, overall: {}, bySender: {}, questions: [] };
  }

  var overall   = {};
  var bySender  = {};
  var questions = [];

  simplified.forEach(function(msg) {
    var result = classifyQuestion(msg.message_text);
    if (!result.isQuestion) return;

    var sender = resolveSender(msg);

    questions.push({
      _id:          msg._id,
      sender:       sender,
      date:         msg.date || '',
      message_text: msg.message_text,
      type:         result.type,
      confidence:   result.confidence,
    });

    overall[result.type] = (overall[result.type] || 0) + 1;

    if (!bySender[sender]) bySender[sender] = { total: 0 };
    bySender[sender][result.type] = (bySender[sender][result.type] || 0) + 1;
    bySender[sender].total++;
  });

  return {
    total:     questions.length,
    overall:   overall,
    bySender:  bySender,
    questions: questions,
  };
}

module.exports = { classifyQuestionTypes };
