/**
 * modules/nlp/tfidfSearch.js
 *
 * TF-IDF relevance search: ranks messages (or conversations) by
 * term-weighted relevance to a free-text query, using natural.TfIdf's own
 * `tfidfs()` scoring. This is concept/relevance search, distinct from
 * fuzzySearch.js's edit-distance matching — it finds documents whose
 * distinctive vocabulary overlaps with the query's terms, not documents
 * that merely look similar to the query string.
 *
 * searchByRelevance(messages, query, opts?) → Array<{ id, score, preview }>
 *   sorted by score descending; only results with score > 0 are included.
 *
 * Options:
 *   granularity    {'message'|'conversation'}  default 'message'
 *   conversations  {Array}  required when granularity === 'conversation'
 *                  (same shape as tfidfByConversation.js expects)
 *   topN           {number}  results to return (default 20)
 */

var corpus = require('../../lib/tfidf-corpus');

function buildDocs(messages, opts) {
  if (opts.granularity === 'conversation') {
    var conversations = Array.isArray(opts.conversations) ? opts.conversations : [];
    return conversations
      .filter(function(c) { return c && Array.isArray(c.conversationMsgs) && c.conversationMsgs.length > 0; })
      .map(function(c) {
        return {
          id:      c.conversationId,
          text:    c.conversationMsgs.map(function(m) { return (m && m.message_text) || ''; }).join(' '),
          preview: (c.conversationMsgs[0] && c.conversationMsgs[0].message_text) || '',
        };
      });
  }

  return (messages || [])
    .map(function(msg, index) {
      return {
        id:      (msg && (msg.sha || msg._id)) || index,
        text:    (msg && msg.message_text) || '',
        preview: (msg && msg.message_text) || '',
      };
    })
    .filter(function(d) { return d.text; });
}

/**
 * @param {Array<Object>} messages
 * @param {string}        query
 * @param {Object}        [opts]
 * @returns {Array<{ id, score: number, preview: string }>}
 */
function searchByRelevance(messages, query, opts) {
  if (!Array.isArray(messages) || !query || typeof query !== 'string') return [];

  opts = opts || {};
  var topN = opts.topN || 20;

  var docs = buildDocs(messages, opts);
  if (docs.length === 0) return [];

  var built    = corpus.buildCorpus(docs);
  var previews = docs.map(function(d) { return d.preview; });

  var results = [];
  built.tfidf.tfidfs(query, function(i, measure) {
    if (measure > 0) {
      results.push({ id: built.ids[i], score: parseFloat(measure.toFixed(4)), preview: previews[i] });
    }
  });

  results.sort(function(a, b) { return b.score - a.score; });
  return results.slice(0, topN);
}

module.exports = { searchByRelevance };
