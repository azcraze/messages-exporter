/**
 * modules/nlp/perSenderPhrases.js
 *
 * Extracts top n-gram phrases per sender by grouping messages and
 * running phraseFrequency on each sender's corpus.
 *
 * perSenderPhrases(messages, opts?) → {
 *   bySender: { [sender]: Array<{ phrase, count, rank, words }> },
 * }
 *
 * Options passed through to phraseFrequency:
 *   topN      {number}  default 20
 *   minN      {number}  default 2
 *   maxN      {number}  default 3
 *   minCount  {number}  default 2
 */

var _ = require('lodash');
var { phraseFrequency } = require('./phraseExtractor');

/**
 * @param {Array<Object>} messages
 * @param {Object}        [opts]
 * @returns {{ bySender: Object }}
 */
function perSenderPhrases(messages, opts) {
  if (!Array.isArray(messages)) return { bySender: {} };

  opts = opts || {};

  var grouped = _.groupBy(messages, function(msg) {
    return msg.sender || (msg.is_from_me === 1 ? 'me' : 'other');
  });

  var bySender = {};
  Object.keys(grouped).forEach(function(sender) {
    bySender[sender] = phraseFrequency(grouped[sender], opts);
  });

  return { bySender: bySender };
}

module.exports = { perSenderPhrases };
