/**
 * modules/nlp/phraseExtractor.js
 *
 * Extracts common multi-word phrases using n-gram frequency analysis.
 * Stop words are kept for phrase context (e.g. "out of the blue" is meaningful).
 *
 * phraseFrequency(messages, opts?) → Array<{ phrase, count, rank, words }>
 *
 * Options:
 *   topN  {number}  phrases to return per n-gram size, default 20
 *   minN  {number}  minimum n-gram size, default 2
 *   maxN  {number}  maximum n-gram size, default 3
 *   minCount {number} minimum occurrences to include, default 2
 */

var { tokenize } = require('./tokenizer');

function ngrams(tokens, n) {
  var result = [];
  for (var i = 0; i <= tokens.length - n; i++) {
    result.push(tokens.slice(i, i + n).join(' '));
  }
  return result;
}

function phraseFrequency(messages, opts) {
  if (!Array.isArray(messages)) return [];

  opts = opts || {};
  var topN     = opts.topN     || 20;
  var minN     = opts.minN     || 2;
  var maxN     = opts.maxN     || 3;
  var minCount = opts.minCount || 2;

  // Keep stop words so phrases retain natural meaning
  var tokenOpts = { removeStopWords: false, minLength: 2 };

  var counts = {};
  messages.forEach(function(msg) {
    if (!msg || !msg.message_text) return;
    var tokens = tokenize(msg.message_text, tokenOpts);
    for (var n = minN; n <= maxN; n++) {
      ngrams(tokens, n).forEach(function(phrase) {
        counts[phrase] = (counts[phrase] || 0) + 1;
      });
    }
  });

  return Object.keys(counts)
    .filter(function(p) { return counts[p] >= minCount; })
    .map(function(phrase) {
      return {
        phrase:  phrase,
        count:   counts[phrase],
        words:   phrase.split(' ').length,
      };
    })
    .sort(function(a, b) { return b.count - a.count; })
    .slice(0, topN)
    .map(function(entry, i) { return Object.assign({ rank: i + 1 }, entry); });
}

module.exports = { phraseFrequency };
