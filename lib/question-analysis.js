/**
 * lib/question-analysis.js
 *
 * Shared core for the modules/nlp/question*.js family. Every module in that
 * family answers a different follow-up to "is this a question" — was it
 * answered, by whom, how fast, was it rhetorical — so they all share the
 * same classification and conversation-linking logic instead of
 * re-deriving it (the same relationship lib/tfidf-corpus.js has to the
 * modules/nlp/tfidf*.js family).
 *
 * classifyQuestion(text)                        → { isQuestion, type, confidence }
 * linkConversationContext(simplified, conversations) → { [msgId]: MsgMeta }
 * resolveSender(msg)                             → string
 * followingMessages(meta, n?)                    → Array<{ sender, date, message_text, _id }>
 * formatTime(isoDate)                            → 'HH:mm' string
 *
 * classifyQuestion types (mutually exclusive, priority order below):
 *   'tag'            — ends in a tag phrase, e.g. "..., right?"
 *   'rhetorical-cue'  — matches a common rhetorical/no-answer-expected phrase
 *   'choice'         — "A or B?" pattern
 *   'wh'             — starts with a wh-word (what/why/when/where/who/how/...)
 *   'yes-no'         — starts with an auxiliary/modal verb (do/is/can/...)
 *   'other'          — ends with '?' but matches none of the above
 *   null             — not a question
 *
 * MsgMeta: { conversationId, participants, indexInConvo, convoMsgs }
 */

var { format } = require('../utils/dateHelpers');

// Wh-words that, when a message starts with them, signal a question
var WH_WORDS = new Set([
  'what', 'why', 'when', 'where', 'who', 'whom', 'whose', 'which', 'how',
]);

// Auxiliary/modal verbs at sentence start that signal a yes/no question
var AUX_VERBS = new Set([
  'do', 'does', 'did',
  'is', 'are', 'was', 'were',
  'will', 'would', 'shall', 'should',
  'can', 'could', 'may', 'might', 'must',
  'have', 'has', 'had',
]);

// ", right?" / ", isn't it?" style tag questions
var TAG_QUESTION_RE = /,\s*(right|isn'?t (it|he|she|they)|aren'?t (you|they|we)|don'?t (you|they)|doesn'?t (he|she|it)|didn'?t (you|he|she|they)|won'?t (you|he|she|they|it)|wasn'?t (it|he|she)|weren'?t (you|they|we)|can'?t (you|he|she|they)|couldn'?t (you|he|she|they)|shouldn'?t (you|he|she|they|we)|wouldn'?t (you|he|she|they))\s*\??\s*$/i;

// Substrings that commonly signal a rhetorical question — no genuine answer
// is expected, so downstream modules should treat these differently from
// a real information request.
var RHETORICAL_PHRASES = [
  'why me', 'why bother', 'who knows', 'who cares', "what's the point",
  'whats the point', 'is it just me', 'am i right', "isn't that something",
  'what do you expect', 'what did you expect', 'how hard is it',
  'do i look like', 'does it look like', 'what am i supposed to do',
  'what was i thinking', 'you know?', 'right?', 'seriously?', 'really?',
];

var CHOICE_OR_RE = /\bor\b/i;

/**
 * Classify a message's text as question-or-not, with a type and a rough
 * confidence score (0..1). Confidence is a heuristic, not a probability —
 * it exists so downstream modules can threshold ("only high-confidence
 * questions") without re-implementing the scoring.
 *
 * @param {string} text
 * @returns {{ isQuestion: boolean, type: string|null, confidence: number }}
 */
function classifyQuestion(text) {
  if (!text || typeof text !== 'string') return { isQuestion: false, type: null, confidence: 0 };

  var trimmed = text.trim();
  if (!trimmed) return { isQuestion: false, type: null, confidence: 0 };

  var lower       = trimmed.toLowerCase();
  var endsWithQ   = trimmed.endsWith('?');
  var firstWord   = trimmed.split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, '');

  var isTag        = TAG_QUESTION_RE.test(lower);
  var isRhetorical = !isTag && RHETORICAL_PHRASES.some(function(p) { return lower.indexOf(p) !== -1; });
  var isChoice      = !isTag && !isRhetorical && endsWithQ && CHOICE_OR_RE.test(lower);
  var isWh          = WH_WORDS.has(firstWord);
  var isAux         = AUX_VERBS.has(firstWord);

  var type = null;
  if (isTag)             type = 'tag';
  else if (isRhetorical)  type = 'rhetorical-cue';
  else if (isChoice)      type = 'choice';
  else if (isWh)           type = 'wh';
  else if (isAux)          type = 'yes-no';
  else if (endsWithQ)      type = 'other';

  var isQuestionFlag = type !== null;
  var confidence = 0;

  if (isQuestionFlag) {
    confidence = 0.4;
    if (endsWithQ) confidence += 0.35;
    if (isWh || isAux) confidence += 0.15;
    if (isTag) confidence += 0.1;
    confidence = parseFloat(Math.min(confidence, 0.98).toFixed(2));
  }

  return { isQuestion: isQuestionFlag, type: type, confidence: confidence };
}

/**
 * Resolve a display sender for a message across both the "simplified"
 * message shape (`.sender`) and the conversation-msg shape produced by
 * groupConversationsByTime.js / lib/analyze-shared.js (`.from`).
 * @param {Object} msg
 * @returns {string}
 */
function resolveSender(msg) {
  if (!msg) return '';
  return msg.sender || msg.from || (msg.is_from_me === 1 ? 'me' : 'other');
}

/**
 * Format time as HH:mm from an ISO date string.
 * @param {string} isoDate
 * @returns {string}
 */
function formatTime(isoDate) {
  if (!isoDate) return '';
  try {
    return format(new Date(isoDate), 'HH:mm');
  } catch (e) {
    return '';
  }
}

/**
 * Build a per-message lookup of conversation context: which conversation a
 * message belongs to, who else was in it, its position within it, and the
 * full ordered message list of that conversation (for following/preceding
 * message lookups).
 *
 * @param {Array<Object>} simplified   - cleaned message array (unused directly,
 *                                        kept in the signature for parity with
 *                                        callers that pass it alongside conversations)
 * @param {Array<Object>} conversations - array of { conversationId, conversationMsgs, ... }
 * @returns {Object} { [msgId]: MsgMeta }
 */
function linkConversationContext(simplified, conversations) {
  var msgMeta = {};
  var convos  = Array.isArray(conversations) ? conversations : [];

  convos.forEach(function(convo) {
    var msgs = convo.conversationMsgs || convo.conversation_msgs || [];
    var cid  = convo.conversationId != null ? convo.conversationId : convo.conversationID;

    var senderSet = {};
    msgs.forEach(function(m) {
      var s = resolveSender(m);
      if (s) senderSet[s] = true;
    });
    var participants = Object.keys(senderSet);

    msgs.forEach(function(msg, idx) {
      var id = msg._id;
      if (id) {
        msgMeta[id] = {
          conversationId: cid,
          participants:   participants,
          indexInConvo:   idx,
          convoMsgs:       msgs,
        };
      }
    });
  });

  return msgMeta;
}

/**
 * Return up to `n` messages following a given message within its
 * conversation, in the lightweight shape used for display/context.
 * @param {Object} meta  - a single MsgMeta entry from linkConversationContext()
 * @param {number} [n]   - default 3
 * @returns {Array<{ sender, date, message_text, _id }>}
 */
function followingMessages(meta, n) {
  n = n || 3;
  if (!meta || !Array.isArray(meta.convoMsgs)) return [];

  var start = meta.indexInConvo + 1;
  return meta.convoMsgs.slice(start, start + n).map(function(m) {
    return {
      _id:          m._id,
      sender:       resolveSender(m),
      date:         m.date || m.dateTime || '',
      message_text: m.message_text || '',
    };
  });
}

module.exports = {
  classifyQuestion,
  linkConversationContext,
  resolveSender,
  followingMessages,
  formatTime,
};
