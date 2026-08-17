/**
 * modules/nlp/tfidfKeywordTags.js
 *
 * Per-message keyword tagging: each message is treated as its own document
 * in a TF-IDF corpus built from the whole message set, surfacing the terms
 * most distinctive to that individual message relative to every other
 * message — a lightweight "what is this message about" tagger.
 *
 * extractKeywordTags(messages, opts?) → Array<{ id, keywords }>
 *   keywords: Array<{ term, tfidf }>
 *   Only messages with at least `minWords` tokens are included; the
 *   returned array is not aligned 1:1 with the input array.
 *
 * Options:
 *   topK      {number}  keywords per message (default 5)
 *   minWords  {number}  minimum whitespace-separated words required to tag
 *                        a message (default 3) — skips trivial short texts
 */

var corpus = require('../../lib/tfidf-corpus');

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * @param {Array<Object>} messages
 * @param {Object}        [opts]
 * @returns {Array<{ id, keywords: Array<{term, tfidf}> }>}
 */
function extractKeywordTags(messages, opts) {
  if (!Array.isArray(messages)) return [];

  opts = opts || {};
  var topK     = opts.topK || 5;
  var minWords = opts.minWords !== undefined ? opts.minWords : 3;

  var taggable = messages
    .map(function(msg, index) { return { msg: msg, index: index }; })
    .filter(function(entry) {
      var text = entry.msg && entry.msg.message_text;
      return typeof text === 'string' && wordCount(text) >= minWords;
    });

  if (taggable.length === 0) return [];

  var docs = taggable.map(function(entry) {
    return {
      id:   entry.msg.sha || entry.msg._id || entry.index,
      text: entry.msg.message_text,
    };
  });

  var built = corpus.buildCorpus(docs);

  return built.ids.map(function(id, idx) {
    return {
      id: id,
      keywords: corpus.rankTerms(built.tfidf, idx, { topN: topK }).map(function(t) {
        return { term: t.term, tfidf: t.tfidf };
      }),
    };
  });
}

module.exports = { extractKeywordTags };
