/**
 * modules/nlp/tfidf.js
 *
 * TF-IDF analysis using natural.TfIdf (via lib/tfidf-corpus.js).
 * Each sender's messages are treated as a single document.
 * Returns the top N terms per sender ranked by TF-IDF score.
 *
 * computeTfIdf(messages, opts?) → {
 *   bySender: { [sender]: Array<{ term, tfidf, rank }> },
 * }
 *
 * Options:
 *   topN      {number}  terms to return per sender (default 20)
 */

var _      = require('lodash');
var corpus = require('../../lib/tfidf-corpus');

/**
 * @param {Array<Object>} messages
 * @param {Object}        [opts]
 * @returns {{ bySender: Object }}
 */
function computeTfIdf(messages, opts) {
  if (!Array.isArray(messages)) return { bySender: {} };

  opts  = opts || {};
  var topN = opts.topN || 20;

  // Group messages by sender
  var grouped = _.groupBy(messages, function(msg) {
    return msg.sender || (msg.is_from_me === 1 ? 'me' : 'other');
  });

  var senders = Object.keys(grouped);
  if (senders.length === 0) return { bySender: {} };

  // Build one corpus with one document per sender
  var docs = senders.map(function(sender) {
    var text = grouped[sender]
      .map(function(m) { return m.message_text || ''; })
      .join(' ');
    return { id: sender, text: text };
  });

  var built = corpus.buildCorpus(docs);

  var bySender = {};
  senders.forEach(function(sender, idx) {
    bySender[sender] = corpus.rankTerms(built.tfidf, idx, { topN: topN });
  });

  return { bySender: bySender };
}

module.exports = { computeTfIdf };
