/**
 * modules/nlp/questionTopics.js
 *
 * Tags each detected question with its distinctive terms and clusters
 * similar questions together, reusing lib/tfidf-corpus.js (the same shared
 * helper the modules/nlp/tfidf*.js family is built on) instead of
 * re-implementing corpus-building or cosine similarity.
 *
 * tagQuestionTopics(simplified, opts?) → {
 *   total:    number,
 *   tagged:   Array<{ _id, sender, date, message_text, keywords: Array<{term, tfidf}> }>,
 *   clusters: Array<{ members: Array<string>, topTerms: Array<string> }>,
 * }
 *
 * Options:
 *   topK                 {number}  keywords per question (default 5)
 *   similarityThreshold  {number}  min cosine similarity to cluster two
 *                                   questions together (default 0.35)
 */

var corpus = require('../../lib/tfidf-corpus');
var { classifyQuestion, resolveSender } = require('../../lib/question-analysis');

var DEFAULT_TOP_K       = 5;
var DEFAULT_SIM_THRESHOLD = 0.35;

/**
 * Union-find over question indices, merging any pair whose cosine
 * similarity meets the threshold.
 * @param {number} n
 * @param {Array<Array<number>>} matrix
 * @param {number} threshold
 * @returns {Array<Array<number>>} groups of indices, singletons excluded
 */
function clusterBySimilarity(n, matrix, threshold) {
  var parent = [];
  for (var i = 0; i < n; i++) parent[i] = i;

  function find(x) {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
  }
  function union(a, b) {
    var ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  for (var a = 0; a < n; a++) {
    for (var b = a + 1; b < n; b++) {
      if (matrix[a][b] >= threshold) union(a, b);
    }
  }

  var groups = {};
  for (var idx = 0; idx < n; idx++) {
    var root = find(idx);
    if (!groups[root]) groups[root] = [];
    groups[root].push(idx);
  }

  return Object.keys(groups)
    .map(function(k) { return groups[k]; })
    .filter(function(g) { return g.length > 1; });
}

/**
 * @param {Array<Object>} simplified
 * @param {Object}        [opts]
 * @returns {Object}
 */
function tagQuestionTopics(simplified, opts) {
  if (!Array.isArray(simplified)) return { total: 0, tagged: [], clusters: [] };

  opts = opts || {};
  var topK      = opts.topK || DEFAULT_TOP_K;
  var threshold = opts.similarityThreshold != null ? opts.similarityThreshold : DEFAULT_SIM_THRESHOLD;

  var questions = simplified.filter(function(msg) {
    return classifyQuestion(msg.message_text).isQuestion && msg.message_text;
  });

  if (questions.length === 0) return { total: 0, tagged: [], clusters: [] };

  var docs = questions.map(function(msg, i) {
    return { id: msg._id || i, text: msg.message_text };
  });

  var built   = corpus.buildCorpus(docs);
  var vectors = built.ids.map(function(id, idx) { return corpus.getVector(built.tfidf, idx); });

  var tagged = questions.map(function(msg, idx) {
    return {
      _id:          msg._id,
      sender:       resolveSender(msg),
      date:         msg.date || '',
      message_text: msg.message_text,
      keywords:     corpus.rankTerms(built.tfidf, idx, { topN: topK }).map(function(t) {
        return { term: t.term, tfidf: t.tfidf };
      }),
    };
  });

  var matrix = vectors.map(function(vecA) {
    return vectors.map(function(vecB) { return corpus.cosineSimilarity(vecA, vecB); });
  });

  var groups = clusterBySimilarity(questions.length, matrix, threshold);

  var clusters = groups.map(function(indices) {
    var members  = indices.map(function(i) { return tagged[i]._id; });
    var termFreq = {};
    indices.forEach(function(i) {
      tagged[i].keywords.forEach(function(k) {
        termFreq[k.term] = (termFreq[k.term] || 0) + 1;
      });
    });
    var topTerms = Object.keys(termFreq)
      .sort(function(a, b) { return termFreq[b] - termFreq[a]; })
      .slice(0, 5);

    return { members: members, topTerms: topTerms };
  });

  return { total: tagged.length, tagged: tagged, clusters: clusters };
}

module.exports = { tagQuestionTopics };
