/**
 * modules/nlp/curseWords.js
 *
 * Tracks profanity usage across messages, per sender, and per conversation.
 *
 * analyzeCurseWords(messages, conversations?) → {
 *   total:          number,   // total curse word occurrences
 *   uniqueWordsUsed: number,  // distinct curse words found
 *   byWord:          { [word]: { total, bySender: { [sender]: count } } },
 *   bySender:        { [sender]: { total, byWord: { [word]: count } } },
 *   topWords:        Array<{ rank, word, count }>,
 *   byConversation:  Array<{ conversationId, date, total, topWord }>  (if conversations provided)
 * }
 */

var engine = require('../../lib/nlp-engine');

// Embedded profanity word list — stored in lower-case
// This list is intentionally moderate and covers commonly used English profanity.
var CURSE_WORDS = [
  'fuck', 'fucking', 'fucked', 'fucker', 'fucks', 'motherfucker', 'motherfucking',
  'shit', 'shits', 'shitty', 'bullshit', 'horseshit',
  'ass', 'asses', 'asshole', 'assholes', 'smartass', 'dumbass', 'badass',
  'bitch', 'bitches', 'bitchy',
  'damn', 'damned', 'goddamn', 'goddamned',
  'hell', 'hellish',
  'crap', 'crappy', 'craps',
  'piss', 'pissed', 'pissing', 'pissed off',
  'bastard', 'bastards',
  'dick', 'dicks', 'dickhead',
  'cock', 'cocks', 'cocksucker',
  'pussy', 'pussies',
  'cunt', 'cunts',
  'whore', 'whores',
  'slut', 'sluts',
  'jackass', 'jackasses',
  'douchebag', 'douchebags', 'douche',
  'moron', 'morons', 'idiot', 'idiots', 'stupid',
  'retard', 'retarded',
  'twat', 'twats',
  'arse', 'arsehole',
  'wank', 'wanker', 'wankers', 'wanking',
  'bollocks',
  'bugger', 'buggered',
  'shag', 'shagged',
  'tosser', 'tossers',
  'prick', 'pricks',
  'knob', 'knobs', 'knobhead',
  'crud',
  'fag', 'fags',
  'freak',
  'screw', 'screwed', 'screwing',
  'suck', 'sucks', 'sucked', 'sucker',
  'blows', 'blew',
];

var CURSE_SET = new Set(CURSE_WORDS);

/**
 * Tokenize text and return any tokens that are curse words.
 * @param {string} text
 * @returns {string[]}
 */
function findCurseWords(text) {
  if (!text) return [];
  var tokens = engine.tokenizer.tokenize(text.toLowerCase());
  if (!tokens) return [];
  return tokens.filter(function(t) { return CURSE_SET.has(t); });
}

/**
 * @param {Array<Object>} messages
 * @param {Array<Object>} [conversations] - optional for per-conversation breakdown
 * @returns {Object}
 */
function analyzeCurseWords(messages, conversations) {
  if (!Array.isArray(messages)) {
    return { total: 0, uniqueWordsUsed: 0, byWord: {}, bySender: {}, topWords: [], byConversation: [] };
  }

  var byWord   = {};  // word → { total, bySender }
  var bySender = {};  // sender → { total, byWord }
  var totalHits = 0;

  messages.forEach(function(msg) {
    var found  = findCurseWords(msg.message_text);
    if (found.length === 0) return;

    var sender = msg.sender || (msg.is_from_me === 1 ? 'me' : 'other');
    if (!bySender[sender]) bySender[sender] = { total: 0, byWord: {} };

    found.forEach(function(word) {
      totalHits++;

      // byWord
      if (!byWord[word]) byWord[word] = { total: 0, bySender: {} };
      byWord[word].total++;
      byWord[word].bySender[sender] = (byWord[word].bySender[sender] || 0) + 1;

      // bySender
      bySender[sender].total++;
      bySender[sender].byWord[word] = (bySender[sender].byWord[word] || 0) + 1;
    });
  });

  // Ranked list
  var topWords = Object.keys(byWord)
    .map(function(w) { return { word: w, count: byWord[w].total }; })
    .sort(function(a, b) { return b.count - a.count; })
    .map(function(e, i) { return { rank: i + 1, word: e.word, count: e.count }; });

  // Per-conversation breakdown (optional)
  var byConversation = [];
  if (Array.isArray(conversations)) {
    conversations.forEach(function(convo) {
      var msgs  = convo.conversationMsgs || convo.conversation_msgs || [];
      var cid   = convo.conversationId != null ? convo.conversationId : convo.conversationID;
      var total = 0;
      var wordCounts = {};

      msgs.forEach(function(m) {
        var found = findCurseWords(m.message_text);
        found.forEach(function(w) {
          total++;
          wordCounts[w] = (wordCounts[w] || 0) + 1;
        });
      });

      if (total === 0) return;

      var topWord = Object.keys(wordCounts)
        .sort(function(a, b) { return wordCounts[b] - wordCounts[a]; })[0] || null;

      byConversation.push({
        conversationId: cid,
        date:           convo.date || '',
        total:          total,
        topWord:        topWord,
      });
    });

    byConversation.sort(function(a, b) { return b.total - a.total; });
  }

  return {
    total:           totalHits,
    uniqueWordsUsed: Object.keys(byWord).length,
    byWord:          byWord,
    bySender:        bySender,
    topWords:        topWords,
    byConversation:  byConversation,
  };
}

module.exports = { analyzeCurseWords, CURSE_WORDS };
