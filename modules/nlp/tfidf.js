/**
 * modules/nlp/tfidf.js
 *
 * TF-IDF analysis using natural.TfIdf.
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

var natural   = require('natural');
var _         = require('lodash');
var engine    = require('../../lib/nlp-engine');

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

  // Build one TfIdf instance with one document per sender
  var tfidf = new natural.TfIdf();

  senders.forEach(function(sender) {
    var text = grouped[sender]
      .map(function(m) { return m.message_text || ''; })
      .join(' ');
    tfidf.addDocument(text);
  });

  var bySender = {};

  senders.forEach(function(sender, idx) {
    var terms = [];

    tfidf.listTerms(idx).forEach(function(item) {
      // Skip stop words and very short tokens
      var t = item.term;
      if (!t || t.length < 3) return;
      if (engine.STOP_WORDS.has(t.toLowerCase())) return;
      terms.push({ term: t, tfidf: parseFloat(item.tfidf.toFixed(4)) });
    });

    // Sort by tfidf descending, take topN, assign rank
    terms.sort(function(a, b) { return b.tfidf - a.tfidf; });
    bySender[sender] = terms.slice(0, topN).map(function(t, i) {
      return { rank: i + 1, term: t.term, tfidf: t.tfidf };
    });
  });

  return { bySender: bySender };
}

module.exports = { computeTfIdf };
