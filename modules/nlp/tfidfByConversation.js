/**
 * modules/nlp/tfidfByConversation.js
 *
 * TF-IDF analysis using natural.TfIdf (via lib/tfidf-corpus.js).
 * Each conversation is treated as a single document, so the returned terms
 * are distinctive to that conversation relative to every other conversation
 * in the corpus — "what was this specific conversation about."
 *
 * computeTfIdfByConversation(conversations, opts?) → {
 *   byConversation: { [conversationId]: Array<{ term, tfidf, rank }> },
 * }
 *
 * `conversations` — Array<{ conversationId, conversationMsgs }>, the shape
 * produced by scripts/analyze.js's buildConversationsWithIds() /
 * modules/groupConversationsByTime.js's groupMessagesByInactivity().
 *
 * Options:
 *   topN      {number}  terms to return per conversation (default 20)
 */

var corpus = require('../../lib/tfidf-corpus');

/**
 * @param {Array<Object>} conversations
 * @param {Object}        [opts]
 * @returns {{ byConversation: Object }}
 */
function computeTfIdfByConversation(conversations, opts) {
  if (!Array.isArray(conversations)) return { byConversation: {} };

  opts  = opts || {};
  var topN = opts.topN || 20;

  var withText = conversations.filter(function(c) {
    return c && Array.isArray(c.conversationMsgs) && c.conversationMsgs.length > 0;
  });
  if (withText.length === 0) return { byConversation: {} };

  var docs = withText.map(function(c) {
    var text = c.conversationMsgs
      .map(function(m) { return (m && m.message_text) || ''; })
      .join(' ');
    return { id: c.conversationId, text: text };
  });

  var built = corpus.buildCorpus(docs);

  var byConversation = {};
  built.ids.forEach(function(conversationId, idx) {
    byConversation[conversationId] = corpus.rankTerms(built.tfidf, idx, { topN: topN });
  });

  return { byConversation: byConversation };
}

module.exports = { computeTfIdfByConversation };
