/**
 * modules/nlp/wordFrequency.js
 *
 * Counts word occurrences across a message array after tokenisation and
 * stop-word removal.
 *
 * wordFrequency(messages, opts?) → Array<{ word, count, rank }>
 *
 * Options:
 *   topN            {number}   words to return, default 50
 *   removeStopWords {boolean}  default true
 *   minLength       {number}   minimum token length, default 3
 *   perSender       {boolean}  if true, also returns breakdown by sender
 */

var { tokenize } = require('./tokenizer');

function buildFreqMap(messages, tokenOpts) {
  var counts = {};
  messages.forEach(function(msg) {
    if (!msg || !msg.message_text) return;
    var tokens = tokenize(msg.message_text, tokenOpts);
    tokens.forEach(function(t) {
      counts[t] = (counts[t] || 0) + 1;
    });
  });
  return counts;
}

function toRankedList(counts, topN) {
  return Object.keys(counts)
    .map(function(word) { return { word: word, count: counts[word] }; })
    .sort(function(a, b) { return b.count - a.count; })
    .slice(0, topN)
    .map(function(entry, i) { return Object.assign({ rank: i + 1 }, entry); });
}

function wordFrequency(messages, opts) {
  if (!Array.isArray(messages)) return { words: [] };

  opts = opts || {};
  var topN      = opts.topN      || 50;
  var minLength = opts.minLength || 3;
  var tokenOpts = { removeStopWords: opts.removeStopWords !== false, minLength: minLength };

  var overall = toRankedList(buildFreqMap(messages, tokenOpts), topN);

  var result = { words: overall };

  if (opts.perSender) {
    var bySender = {};
    messages.forEach(function(msg) {
      if (!msg || !msg.message_text) return;
      var sender = msg.sender || (msg.is_from_me === 1 ? 'me' : 'other');
      if (!bySender[sender]) bySender[sender] = [];
      bySender[sender].push(msg);
    });

    result.perSender = {};
    Object.keys(bySender).forEach(function(sender) {
      result.perSender[sender] = toRankedList(
        buildFreqMap(bySender[sender], tokenOpts),
        topN
      );
    });
  }

  return result;
}

module.exports = { wordFrequency };
