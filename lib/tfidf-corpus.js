/**
 * lib/tfidf-corpus.js
 *
 * Shared TF-IDF corpus-building, ranking, and comparison helpers built on
 * `natural.TfIdf`. Every modules/nlp/tfidf*.js module delegates to this
 * instead of re-implementing "group texts into documents → build corpus →
 * rank/compare terms".
 *
 * buildCorpus(docs)               → { tfidf, ids }
 * rankTerms(tfidf, index, opts?)  → Array<{ rank, term, tfidf }>
 * getVector(tfidf, index)         → { [term]: score }
 * cosineSimilarity(vecA, vecB)    → number (0..1)
 *
 * Options for rankTerms:
 *   topN       {number}  terms to return, default 20
 *   minLength  {number}  minimum token length, default 3
 */

var natural = require('natural');
var engine  = require('./nlp-engine');

/**
 * Build one natural.TfIdf instance with one document per entry in `docs`.
 * @param {Array<{id, text}>} docs
 * @returns {{ tfidf: Object, ids: Array }}
 */
function buildCorpus(docs) {
  var tfidf = new natural.TfIdf();
  var ids = [];
  (docs || []).forEach(function(doc) {
    ids.push(doc.id);
    tfidf.addDocument(doc.text || '');
  });
  return { tfidf: tfidf, ids: ids };
}

/**
 * Rank a document's terms by TF-IDF score, filtering stop words and short
 * tokens, and assigning 1-based rank.
 * @param {Object} tfidf  a natural.TfIdf instance
 * @param {number} index  document index within that instance
 * @param {Object} [opts]
 * @returns {Array<{rank: number, term: string, tfidf: number}>}
 */
function rankTerms(tfidf, index, opts) {
  opts = opts || {};
  var topN      = opts.topN || 20;
  var minLength = opts.minLength !== undefined ? opts.minLength : 3;

  var terms = [];
  tfidf.listTerms(index).forEach(function(item) {
    var t = item.term;
    if (!t || t.length < minLength) return;
    if (engine.STOP_WORDS.has(t.toLowerCase())) return;
    terms.push({ term: t, tfidf: parseFloat(item.tfidf.toFixed(4)) });
  });

  terms.sort(function(a, b) { return b.tfidf - a.tfidf; });

  return terms.slice(0, topN).map(function(t, i) {
    return { rank: i + 1, term: t.term, tfidf: t.tfidf };
  });
}

/**
 * All terms/scores for a document, unfiltered (no stop-word/length pass) —
 * intended for vector comparisons rather than human-facing ranked lists.
 * @param {Object} tfidf
 * @param {number} index
 * @returns {Object} { [term]: score }
 */
function getVector(tfidf, index) {
  var vector = {};
  tfidf.listTerms(index).forEach(function(item) {
    vector[item.term] = item.tfidf;
  });
  return vector;
}

/**
 * Cosine similarity between two term→score maps.
 * @param {Object} vecA
 * @param {Object} vecB
 * @returns {number} 0..1 (0 when either vector is empty/zero-magnitude)
 */
function cosineSimilarity(vecA, vecB) {
  var terms = new Set(Object.keys(vecA || {}).concat(Object.keys(vecB || {})));
  var dot = 0, magA = 0, magB = 0;

  terms.forEach(function(t) {
    var a = (vecA && vecA[t]) || 0;
    var b = (vecB && vecB[t]) || 0;
    dot  += a * b;
    magA += a * a;
    magB += b * b;
  });

  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

module.exports = { buildCorpus, rankTerms, getVector, cosineSimilarity };
