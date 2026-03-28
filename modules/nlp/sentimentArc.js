/**
 * modules/nlp/sentimentArc.js
 *
 * Computes a per-conversation sentiment arc — the emotional trajectory
 * across the messages in a conversation.
 *
 * sentimentArcs(conversations) → {
 *   arcs: Array<ArcEntry>,
 * }
 *
 * ArcEntry: {
 *   conversationId:  number,
 *   date:            string,
 *   participants:    string[],
 *   messageCount:    number,
 *   scores:          number[],      // per-message AFINN score
 *   firstHalfMean:   number,
 *   secondHalfMean:  number,
 *   delta:           number,        // secondHalf - firstHalf
 *   trend:           'rising' | 'falling' | 'volatile' | 'stable',
 * }
 *
 * Only conversations with >= 5 scoreable messages are included.
 */

var engine = require('../../lib/nlp-engine');

var RISING_THRESHOLD   =  0.15;
var FALLING_THRESHOLD  = -0.15;
var VOLATILE_STDDEV    =  0.4;
var MIN_MESSAGES       =  5;

function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce(function(s, v) { return s + v; }, 0) / arr.length;
}

function stddev(arr) {
  if (!arr || arr.length < 2) return 0;
  var m   = mean(arr);
  var sq  = arr.reduce(function(s, v) { return s + Math.pow(v - m, 2); }, 0);
  return Math.sqrt(sq / arr.length);
}

function scoreMessage(msg) {
  if (!msg || !msg.message_text) return null;
  var tokens = engine.tokenizer.tokenize(msg.message_text);
  if (!tokens || tokens.length === 0) return null;
  return engine.sentimentAnalyzer.getSentiment(tokens);
}

function classifyTrend(scores, delta) {
  if (stddev(scores) > VOLATILE_STDDEV) return 'volatile';
  if (delta > RISING_THRESHOLD)          return 'rising';
  if (delta < FALLING_THRESHOLD)         return 'falling';
  return 'stable';
}

/**
 * @param {Array<Object>} conversations - array of { conversationId, date, conversationMsgs, participants? }
 * @returns {{ arcs: Array }}
 */
function sentimentArcs(conversations) {
  if (!Array.isArray(conversations)) return { arcs: [] };

  var arcs = [];

  conversations.forEach(function(convo) {
    var msgs         = convo.conversationMsgs || convo.conversation_msgs || [];
    var cid          = convo.conversationId != null ? convo.conversationId : convo.conversationID;
    var participants = convo.participants || [];

    // Derive participants if not provided
    if (participants.length === 0) {
      var senderSet = {};
      msgs.forEach(function(m) {
        var s = m.from || m.sender || (m.is_from_me === 1 ? 'me' : 'other');
        senderSet[s] = true;
      });
      participants = Object.keys(senderSet);
    }

    // Score each message
    var scores = [];
    msgs.forEach(function(m) {
      // conversationMsgs may have a 'from' field instead of 'sender'
      var msgObj = { message_text: m.message_text, sender: m.from || m.sender };
      var s = scoreMessage(msgObj);
      if (s !== null) scores.push(parseFloat(s.toFixed(4)));
    });

    if (scores.length < MIN_MESSAGES) return;

    var half           = Math.floor(scores.length / 2);
    var firstHalfMean  = parseFloat(mean(scores.slice(0, half)).toFixed(4));
    var secondHalfMean = parseFloat(mean(scores.slice(half)).toFixed(4));
    var delta          = parseFloat((secondHalfMean - firstHalfMean).toFixed(4));
    var trend          = classifyTrend(scores, delta);

    arcs.push({
      conversationId:  cid,
      date:            convo.date || '',
      participants:    participants,
      messageCount:    msgs.length,
      scores:          scores,
      firstHalfMean:   firstHalfMean,
      secondHalfMean:  secondHalfMean,
      delta:           delta,
      trend:           trend,
    });
  });

  return { arcs: arcs };
}

module.exports = { sentimentArcs };
