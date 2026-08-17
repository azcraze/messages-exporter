/**
 * reports/tfidf-by-conversation-report.js
 *
 * TF-IDF distinctive terms per conversation.
 *
 * build(result) → { data, sections }
 * result = output of computeTfIdfByConversation()
 */

var { formatFloat } = require('../lib/reporters/base-reporter');

function build(result) {
  if (!result || typeof result !== 'object') result = { byConversation: {} };

  var data     = result;
  var sections = [];

  sections.push({ type: 'heading', level: 2, text: 'TF-IDF: Distinctive Terms per Conversation' });
  sections.push({
    type:  'callout',
    label: 'Note',
    text:  'TF-IDF ranks terms that are frequent within a conversation but rare across every other conversation — identifying what makes each conversation topically distinct.',
  });
  sections.push({ type: 'blank' });

  var conversationIds = Object.keys(result.byConversation || {});
  if (conversationIds.length === 0) {
    sections.push({ type: 'text', text: 'No data.' });
    return { data, sections };
  }

  conversationIds.forEach(function(conversationId) {
    var terms = (result.byConversation[conversationId] || []).slice(0, 20);
    if (terms.length === 0) return;

    sections.push({ type: 'heading', level: 3, text: 'Conversation: ' + conversationId });

    var rows = terms.map(function(t) {
      return [String(t.rank), t.term, formatFloat(t.tfidf, 4)];
    });

    sections.push({
      type:    'table',
      headers: ['Rank', 'Term', 'TF-IDF Score'],
      aligns:  ['right', 'left', 'right'],
      rows:    rows,
    });
    sections.push({ type: 'blank' });
  });

  return { data, sections };
}

module.exports = { build };
