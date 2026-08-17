/**
 * modules/nlp/tfidfDrift.js
 *
 * Vocabulary drift: wraps tfidfByPeriod.js and diffs each pair of
 * consecutive periods' TF-IDF term rankings to surface which terms are
 * trending up ("rising") or falling out of use ("falling") over time.
 *
 * computeVocabularyDrift(messages, opts?) → {
 *   granularity: 'day' | 'week' | 'month',
 *   transitions: Array<{
 *     from, to,
 *     rising:  Array<{ term, before, after, delta }>,
 *     falling: Array<{ term, before, after, delta }>,
 *   }>,
 * }
 *
 * Options (passed through to tfidfByPeriod for the per-period rankings):
 *   granularity  {string}  'day' | 'week' | 'month' (default 'month')
 *   topN         {number}  terms considered per period before diffing (default 20)
 *   topDrift     {number}  rising/falling terms to return per transition (default 10)
 */

var { computeTfIdfByPeriod } = require('./tfidfByPeriod');

function toScoreMap(terms) {
  var map = {};
  (terms || []).forEach(function(t) { map[t.term] = t.tfidf; });
  return map;
}

/**
 * @param {Array<Object>} messages
 * @param {Object}        [opts]
 * @returns {{ granularity: string, transitions: Array }}
 */
function computeVocabularyDrift(messages, opts) {
  if (!Array.isArray(messages)) return { granularity: null, transitions: [] };

  opts = opts || {};
  var topDrift = opts.topDrift || 10;

  var byPeriodResult = computeTfIdfByPeriod(messages, opts);
  var periodKeys = Object.keys(byPeriodResult.byPeriod).sort();

  if (periodKeys.length < 2) {
    return { granularity: byPeriodResult.granularity, transitions: [] };
  }

  var transitions = periodKeys.slice(0, -1).map(function(fromKey, i) {
    var toKey = periodKeys[i + 1];

    var fromScores = toScoreMap(byPeriodResult.byPeriod[fromKey]);
    var toScores   = toScoreMap(byPeriodResult.byPeriod[toKey]);

    var allTerms = new Set(Object.keys(fromScores).concat(Object.keys(toScores)));
    var deltas = [];
    allTerms.forEach(function(term) {
      var before = fromScores[term] || 0;
      var after  = toScores[term] || 0;
      deltas.push({ term: term, before: before, after: after, delta: parseFloat((after - before).toFixed(4)) });
    });

    var rising = deltas
      .filter(function(d) { return d.delta > 0; })
      .sort(function(a, b) { return b.delta - a.delta; })
      .slice(0, topDrift);

    var falling = deltas
      .filter(function(d) { return d.delta < 0; })
      .sort(function(a, b) { return a.delta - b.delta; })
      .slice(0, topDrift);

    return { from: fromKey, to: toKey, rising: rising, falling: falling };
  });

  return { granularity: byPeriodResult.granularity, transitions: transitions };
}

module.exports = { computeVocabularyDrift };
