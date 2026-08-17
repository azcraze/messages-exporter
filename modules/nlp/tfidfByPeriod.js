/**
 * modules/nlp/tfidfByPeriod.js
 *
 * TF-IDF analysis using natural.TfIdf (via lib/tfidf-corpus.js).
 * All messages within a time bucket (day/week/month) are treated as a
 * single document, so the returned terms are distinctive to that period
 * relative to every other period — "what words were hot this month."
 *
 * computeTfIdfByPeriod(messages, opts?) → {
 *   byPeriod:    { [periodKey]: Array<{ term, tfidf, rank }> },
 *   granularity: 'day' | 'week' | 'month',
 * }
 *
 * Options:
 *   topN         {number}  terms to return per period (default 20)
 *   granularity  {string}  'day' | 'week' | 'month' (default 'month')
 */

var _ = require('lodash');
var corpus = require('../../lib/tfidf-corpus');
var { parseISO, isValid, startOfDay, startOfWeek, startOfMonth, format } = require('../../utils/dateHelpers');

var GRANULARITIES = {
  day:   { start: startOfDay,   fmt: 'yyyy-MM-dd' },
  week:  { start: startOfWeek,  fmt: 'yyyy-MM-dd' },
  month: { start: startOfMonth, fmt: 'yyyy-MM' },
};

/**
 * @param {Array<Object>} messages
 * @param {Object}        [opts]
 * @returns {{ byPeriod: Object, granularity: string }}
 */
function computeTfIdfByPeriod(messages, opts) {
  if (!Array.isArray(messages)) return { byPeriod: {}, granularity: null };

  opts = opts || {};
  var topN        = opts.topN || 20;
  var granularity = GRANULARITIES[opts.granularity] ? opts.granularity : 'month';
  var conf        = GRANULARITIES[granularity];

  var validMessages = messages.filter(function(msg) {
    return msg && msg.date && isValid(parseISO(msg.date));
  });

  var grouped = _.groupBy(validMessages, function(msg) {
    return format(conf.start(parseISO(msg.date)), conf.fmt);
  });

  var periodKeys = Object.keys(grouped);
  if (periodKeys.length === 0) return { byPeriod: {}, granularity: granularity };

  var docs = periodKeys.map(function(key) {
    var text = grouped[key]
      .map(function(m) { return m.message_text || ''; })
      .join(' ');
    return { id: key, text: text };
  });

  var built = corpus.buildCorpus(docs);

  var byPeriod = {};
  built.ids.forEach(function(key, idx) {
    byPeriod[key] = corpus.rankTerms(built.tfidf, idx, { topN: topN });
  });

  return { byPeriod: byPeriod, granularity: granularity };
}

module.exports = { computeTfIdfByPeriod };
