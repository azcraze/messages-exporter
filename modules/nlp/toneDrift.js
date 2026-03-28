/**
 * modules/nlp/toneDrift.js
 *
 * Detects conversations where the emotional tone shifted significantly
 * between the opening and closing of the conversation.
 *
 * Compares the mean AFINN sentiment of the first third of messages
 * against the last third. Flags the conversation as "drifted" when
 * |delta| >= 0.2.
 *
 * detectToneDrift(conversations, opts?) → {
 *   total:   number,   // conversations analysed
 *   drifted: number,
 *   drifts:  Array<DriftEntry>,
 * }
 *
 * DriftEntry: {
 *   conversationId, date, participants,
 *   messageCount, startScore, endScore, delta,
 *   direction: 'positive' | 'negative',
 * }
 *
 * Options:
 *   minMessages  {number}  minimum messages to analyse a conversation (default 8)
 *   threshold    {number}  minimum |delta| to flag as drifted (default 0.2)
 */

var engine = require('../../lib/nlp-engine');

var DEFAULT_MIN  = 8;
var DEFAULT_THRESHOLD = 0.2;

function scoreMsg(msg) {
  var text = msg.message_text;
  if (!text) return null;
  var tokens = engine.tokenizer.tokenize(text);
  if (!tokens || tokens.length === 0) return null;
  return engine.sentimentAnalyzer.getSentiment(tokens);
}

function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce(function(s, v) { return s + v; }, 0) / arr.length;
}

/**
 * @param {Array<Object>} conversations
 * @param {Object}        [opts]
 * @returns {Object}
 */
function detectToneDrift(conversations, opts) {
  opts = opts || {};
  var minMessages = opts.minMessages || DEFAULT_MIN;
  var threshold   = opts.threshold   || DEFAULT_THRESHOLD;

  if (!Array.isArray(conversations)) return { total: 0, drifted: 0, drifts: [] };

  var total  = 0;
  var drifts = [];

  conversations.forEach(function(convo) {
    var msgs = convo.conversationMsgs || convo.conversation_msgs || [];
    if (msgs.length < minMessages) return;

    var scores = [];
    msgs.forEach(function(m) {
      var s = scoreMsg({ message_text: m.message_text });
      if (s !== null) scores.push(s);
    });
    if (scores.length < minMessages) return;

    total++;

    var third      = Math.max(1, Math.floor(scores.length / 3));
    var startScore = parseFloat(mean(scores.slice(0, third)).toFixed(4));
    var endScore   = parseFloat(mean(scores.slice(-third)).toFixed(4));
    var delta      = parseFloat((endScore - startScore).toFixed(4));

    if (Math.abs(delta) < threshold) return;

    var cid = convo.conversationId != null ? convo.conversationId : convo.conversationID;

    // Derive participants
    var senderSet = {};
    msgs.forEach(function(m) {
      var s = m.from || m.sender || (m.is_from_me === 1 ? 'me' : 'other');
      senderSet[s] = true;
    });

    drifts.push({
      conversationId: cid,
      date:           convo.date || '',
      participants:   Object.keys(senderSet),
      messageCount:   msgs.length,
      startScore:     startScore,
      endScore:       endScore,
      delta:          delta,
      direction:      delta > 0 ? 'positive' : 'negative',
    });
  });

  // Sort by absolute delta descending
  drifts.sort(function(a, b) { return Math.abs(b.delta) - Math.abs(a.delta); });

  return { total: total, drifted: drifts.length, drifts: drifts };
}

module.exports = { detectToneDrift };
