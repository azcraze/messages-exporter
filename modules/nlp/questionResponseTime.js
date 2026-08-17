/**
 * modules/nlp/questionResponseTime.js
 *
 * Latency between a question and its paired answer (from
 * modules/nlp/questionAnswerPairing.js) — distinct from the general-purpose
 * modules/stats/responseTime.js, which measures gaps between *any*
 * consecutive messages from different senders and has no notion of which
 * messages are questions or which reply actually answers which question.
 *
 * computeQuestionResponseTime(simplified, conversations, opts?) → {
 *   overall:     { mean, median, count },
 *   byAnswerer:  { [sender]: { mean, median, count } },  // how fast X answers questions asked of them
 *   byAsker:     { [sender]: { mean, median, count } },  // how fast X's questions get answered
 *   byPair:      { "asker -> answerer": { mean, median, count } },
 * }
 *
 * Times are in minutes, rounded to 1 decimal place. Only paired questions
 * with a computable latency are counted.
 *
 * Options: same as questionAnswerPairing.js (windowSize, maxGapMinutes).
 */

var { pairQuestionsWithAnswers } = require('./questionAnswerPairing');

function median(arr) {
  if (arr.length === 0) return null;
  var sorted = arr.slice().sort(function(a, b) { return a - b; });
  var mid    = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? parseFloat(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1))
    : parseFloat(sorted[mid].toFixed(1));
}

function mean(arr) {
  if (arr.length === 0) return null;
  return parseFloat((arr.reduce(function(s, v) { return s + v; }, 0) / arr.length).toFixed(1));
}

function summarize(times) {
  return { mean: mean(times), median: median(times), count: times.length };
}

/**
 * @param {Array<Object>} simplified
 * @param {Array<Object>} conversations
 * @param {Object}        [opts]
 * @returns {Object}
 */
function computeQuestionResponseTime(simplified, conversations, opts) {
  var pairing = pairQuestionsWithAnswers(simplified, conversations, opts);

  var overall    = [];
  var byAnswerer = {};
  var byAsker    = {};
  var byPair     = {};

  pairing.pairs.forEach(function(pair) {
    if (!pair.answer || pair.latencyMinutes == null) return;

    var asker    = pair.question.sender || 'unknown';
    var answerer = pair.answer.sender   || 'unknown';
    var latency  = pair.latencyMinutes;
    var pairKey  = asker + ' -> ' + answerer;

    overall.push(latency);

    if (!byAnswerer[answerer]) byAnswerer[answerer] = [];
    byAnswerer[answerer].push(latency);

    if (!byAsker[asker]) byAsker[asker] = [];
    byAsker[asker].push(latency);

    if (!byPair[pairKey]) byPair[pairKey] = [];
    byPair[pairKey].push(latency);
  });

  var byAnswererResult = {};
  Object.keys(byAnswerer).forEach(function(s) { byAnswererResult[s] = summarize(byAnswerer[s]); });

  var byAskerResult = {};
  Object.keys(byAsker).forEach(function(s) { byAskerResult[s] = summarize(byAsker[s]); });

  var byPairResult = {};
  Object.keys(byPair).forEach(function(k) { byPairResult[k] = summarize(byPair[k]); });

  return {
    overall:    summarize(overall),
    byAnswerer: byAnswererResult,
    byAsker:    byAskerResult,
    byPair:     byPairResult,
  };
}

module.exports = { computeQuestionResponseTime };
