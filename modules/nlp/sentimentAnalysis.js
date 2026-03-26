/**
 * modules/nlp/sentimentAnalysis.js
 *
 * AFINN-based sentiment scoring via the natural library.
 * Each message is scored; results are aggregated overall, per participant,
 * and per calendar day.
 *
 * sentimentAnalysis(messages) → {
 *   overall:        number,  // mean score across all messages
 *   label:          'positive' | 'negative' | 'neutral',
 *   totalMessages:  number,
 *   perParticipant: { [sender]: { averageScore, messageCount, label } },
 *   perDay:         Array<{ date, averageScore, messageCount }>,
 * }
 *
 * Score interpretation:
 *   > 0.05   positive
 *   < -0.05  negative
 *   else     neutral
 */

var _       = require('lodash');
var engine  = require('../../lib/nlp-engine');
var { format, startOfDay } = require('../../utils/dateHelpers');

var POS_THRESHOLD = 0.05;
var NEG_THRESHOLD = -0.05;

function label(score) {
  if (score > POS_THRESHOLD)  return 'positive';
  if (score < NEG_THRESHOLD)  return 'negative';
  return 'neutral';
}

function scoreMessage(msg) {
  if (!msg || !msg.message_text) return null;
  var tokens = engine.tokenizer.tokenize(msg.message_text);
  if (!tokens || tokens.length === 0) return null;
  var score = engine.sentimentAnalyzer.getSentiment(tokens);
  return { msg: msg, score: score };
}

function sentimentAnalysis(messages) {
  if (!Array.isArray(messages)) {
    return { overall: 0, label: 'neutral', totalMessages: 0, perParticipant: {}, perDay: [] };
  }

  var scored = messages.map(scoreMessage).filter(Boolean);
  if (scored.length === 0) {
    return { overall: 0, label: 'neutral', totalMessages: 0, perParticipant: {}, perDay: [] };
  }

  var totalScore = scored.reduce(function(s, e) { return s + e.score; }, 0);
  var overall    = totalScore / scored.length;

  // Per participant
  var bySender = _.groupBy(scored, function(e) {
    return e.msg.sender || (e.msg.is_from_me === 1 ? 'me' : 'other');
  });
  var perParticipant = {};
  Object.keys(bySender).forEach(function(sender) {
    var group = bySender[sender];
    var avg   = group.reduce(function(s, e) { return s + e.score; }, 0) / group.length;
    perParticipant[sender] = {
      averageScore:  parseFloat(avg.toFixed(4)),
      messageCount:  group.length,
      label:         label(avg),
    };
  });

  // Per day
  var byDay = _.groupBy(scored, function(e) {
    var d = e.msg.date ? new Date(e.msg.date) : null;
    if (!d || isNaN(d.getTime())) return 'unknown';
    return format(startOfDay(d), 'yyyy-MM-dd');
  });
  var perDay = Object.keys(byDay)
    .filter(function(k) { return k !== 'unknown'; })
    .sort()
    .map(function(day) {
      var group = byDay[day];
      var avg   = group.reduce(function(s, e) { return s + e.score; }, 0) / group.length;
      return {
        date:         day,
        averageScore: parseFloat(avg.toFixed(4)),
        messageCount: group.length,
        label:        label(avg),
      };
    });

  return {
    overall:        parseFloat(overall.toFixed(4)),
    label:          label(overall),
    totalMessages:  scored.length,
    perParticipant: perParticipant,
    perDay:         perDay,
  };
}

module.exports = { sentimentAnalysis };
