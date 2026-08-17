/**
 * modules/nlp/tfidfSimilarity.js
 *
 * Pairwise cosine similarity between TF-IDF vectors of groups of messages
 * (by default, senders) using natural.TfIdf (via lib/tfidf-corpus.js).
 * Answers "whose vocabulary is most like mine" / "which conversations are
 * topically similar."
 *
 * computeTfIdfSimilarity(messages, opts?) → {
 *   groups: Array<string|number>,
 *   pairs:  Array<{ a, b, similarity }>,   sorted by similarity descending
 *   matrix: Array<Array<number>>,          matrix[i][j] aligned with `groups`
 * }
 *
 * Options:
 *   groupBy       {'sender'|'conversation'|Function}  default 'sender'.
 *                 A function receives a message and returns its group key.
 *   conversations {Array}  required when groupBy === 'conversation'; the
 *                 same shape as tfidfByConversation.js expects.
 */

var _      = require('lodash');
var corpus = require('../../lib/tfidf-corpus');

function defaultSenderKey(msg) {
  return msg.sender || (msg.is_from_me === 1 ? 'me' : 'other');
}

function buildGroupDocs(messages, opts) {
  if (typeof opts.groupBy === 'function') {
    var grouped = _.groupBy(messages, opts.groupBy);
    return Object.keys(grouped).map(function(key) {
      return { id: key, text: grouped[key].map(function(m) { return m.message_text || ''; }).join(' ') };
    });
  }

  if (opts.groupBy === 'conversation') {
    var conversations = Array.isArray(opts.conversations) ? opts.conversations : [];
    return conversations
      .filter(function(c) { return c && Array.isArray(c.conversationMsgs) && c.conversationMsgs.length > 0; })
      .map(function(c) {
        return {
          id:   c.conversationId,
          text: c.conversationMsgs.map(function(m) { return (m && m.message_text) || ''; }).join(' '),
        };
      });
  }

  var bySender = _.groupBy(messages, defaultSenderKey);
  return Object.keys(bySender).map(function(sender) {
    return { id: sender, text: bySender[sender].map(function(m) { return m.message_text || ''; }).join(' ') };
  });
}

/**
 * @param {Array<Object>} messages
 * @param {Object}        [opts]
 * @returns {{ groups: Array, pairs: Array, matrix: Array<Array<number>> }}
 */
function computeTfIdfSimilarity(messages, opts) {
  if (!Array.isArray(messages)) return { groups: [], pairs: [], matrix: [] };

  opts = opts || {};
  var docs = buildGroupDocs(messages, opts);

  if (docs.length < 2) {
    return { groups: docs.map(function(d) { return d.id; }), pairs: [], matrix: docs.length ? [[1]] : [] };
  }

  var built   = corpus.buildCorpus(docs);
  var vectors = built.ids.map(function(id, idx) { return corpus.getVector(built.tfidf, idx); });

  var matrix = vectors.map(function(vecA) {
    return vectors.map(function(vecB) {
      return parseFloat(corpus.cosineSimilarity(vecA, vecB).toFixed(4));
    });
  });

  var pairs = [];
  for (var i = 0; i < built.ids.length; i++) {
    for (var j = i + 1; j < built.ids.length; j++) {
      pairs.push({ a: built.ids[i], b: built.ids[j], similarity: matrix[i][j] });
    }
  }
  pairs.sort(function(a, b) { return b.similarity - a.similarity; });

  return { groups: built.ids, pairs: pairs, matrix: matrix };
}

module.exports = { computeTfIdfSimilarity };
