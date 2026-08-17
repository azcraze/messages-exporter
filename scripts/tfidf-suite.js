/**
 * scripts/tfidf-suite.js
 *
 * Runs the full TF-IDF analysis family (7 features) against an already-
 * loaded analysis context and writes JSON + Markdown + CSV output for each,
 * using the same saveReport/makeMeta helpers as scripts/analyze.js.
 *
 * Called from scripts/analyze.js (as part of the full 15-feature run) and
 * from scripts/analyze-tfidf.js (standalone — just this family). One
 * implementation, two entry points.
 *
 * runTfidfSuite(ctx, opts?) → Array<string>  names of features written
 *
 * ctx  = { simplified, conversations, msgCount, dateRange }
 *        (the shape returned by lib/analyze-shared.js's loadContext())
 * opts.query {string}  optional — when provided, also runs TF-IDF relevance
 *            search; omitted, that one feature is skipped since it needs a query.
 */

'use strict';

var { saveReport, makeMeta } = require('../lib/analyze-shared');

var { computeTfIdf }               = require('../modules/nlp/tfidf');
var { computeTfIdfByConversation } = require('../modules/nlp/tfidfByConversation');
var { computeTfIdfByPeriod }       = require('../modules/nlp/tfidfByPeriod');
var { computeTfIdfSimilarity }     = require('../modules/nlp/tfidfSimilarity');
var { extractKeywordTags }         = require('../modules/nlp/tfidfKeywordTags');
var { computeVocabularyDrift }     = require('../modules/nlp/tfidfDrift');
var { searchByRelevance }          = require('../modules/nlp/tfidfSearch');

var tfidfReport               = require('../reports/tfidf-report');
var tfidfByConversationReport = require('../reports/tfidf-by-conversation-report');
var tfidfByPeriodReport       = require('../reports/tfidf-by-period-report');
var tfidfSimilarityReport     = require('../reports/tfidf-similarity-report');
var tfidfKeywordTagsReport    = require('../reports/tfidf-keyword-tags-report');
var tfidfDriftReport          = require('../reports/tfidf-drift-report');
var tfidfSearchReport         = require('../reports/tfidf-search-report');

/**
 * @param {Object} ctx  { simplified, conversations, msgCount, dateRange }
 * @param {Object} [opts]
 * @param {string} [opts.query]  free-text query; enables the relevance-search feature
 * @returns {Array<string>}  names of features written
 */
function runTfidfSuite(ctx, opts) {
  opts = opts || {};
  var simplified    = ctx.simplified;
  var conversations = ctx.conversations;
  var msgCount       = ctx.msgCount;
  var dateRange      = ctx.dateRange;

  var written = [];

  // 1. TF-IDF per sender
  console.log('Running: TF-IDF (per sender)...');
  var tfidfResult = computeTfIdf(simplified);
  var tfidfRpt     = tfidfReport.build(tfidfResult);
  saveReport('tfidf', tfidfResult, tfidfRpt.sections, makeMeta('TF-IDF Distinctive Terms', msgCount, dateRange), function(d) {
    var rows = [];
    Object.keys(d.bySender || {}).forEach(function(sender) {
      (d.bySender[sender] || []).forEach(function(t) {
        rows.push({ sender: sender, rank: t.rank, term: t.term, tfidf: t.tfidf });
      });
    });
    return [{ filename: 'tfidf', rows: rows, headers: ['sender','rank','term','tfidf'] }];
  });
  written.push('tfidf');

  // 2. TF-IDF per conversation
  console.log('Running: TF-IDF (per conversation)...');
  var byConvResult = computeTfIdfByConversation(conversations);
  var byConvRpt     = tfidfByConversationReport.build(byConvResult);
  saveReport('tfidf-by-conversation', byConvResult, byConvRpt.sections, makeMeta('TF-IDF Distinctive Terms per Conversation', msgCount, dateRange), function(d) {
    var rows = [];
    Object.keys(d.byConversation || {}).forEach(function(conversationId) {
      (d.byConversation[conversationId] || []).forEach(function(t) {
        rows.push({ conversationId: conversationId, rank: t.rank, term: t.term, tfidf: t.tfidf });
      });
    });
    return [{ filename: 'tfidf-by-conversation', rows: rows, headers: ['conversationId','rank','term','tfidf'] }];
  });
  written.push('tfidf-by-conversation');

  // 3. TF-IDF per time period
  console.log('Running: TF-IDF (per period)...');
  var byPeriodResult = computeTfIdfByPeriod(simplified);
  var byPeriodRpt     = tfidfByPeriodReport.build(byPeriodResult);
  saveReport('tfidf-by-period', byPeriodResult, byPeriodRpt.sections, makeMeta('TF-IDF Distinctive Terms per Period', msgCount, dateRange), function(d) {
    var rows = [];
    Object.keys(d.byPeriod || {}).forEach(function(period) {
      (d.byPeriod[period] || []).forEach(function(t) {
        rows.push({ period: period, rank: t.rank, term: t.term, tfidf: t.tfidf });
      });
    });
    return [{ filename: 'tfidf-by-period', rows: rows, headers: ['period','rank','term','tfidf'] }];
  });
  written.push('tfidf-by-period');

  // 4. TF-IDF sender similarity
  console.log('Running: TF-IDF (sender similarity)...');
  var simResult = computeTfIdfSimilarity(simplified);
  var simRpt     = tfidfSimilarityReport.build(simResult);
  saveReport('tfidf-similarity', simResult, simRpt.sections, makeMeta('TF-IDF Vocabulary Similarity', msgCount, dateRange), function(d) {
    var rows = (d.pairs || []).map(function(p) {
      return { a: p.a, b: p.b, similarity: p.similarity };
    });
    return [{ filename: 'tfidf-similarity', rows: rows, headers: ['a','b','similarity'] }];
  });
  written.push('tfidf-similarity');

  // 5. TF-IDF per-message keyword tags
  console.log('Running: TF-IDF (keyword tags)...');
  var tagsResult = extractKeywordTags(simplified);
  var tagsRpt     = tfidfKeywordTagsReport.build(tagsResult);
  saveReport('tfidf-keyword-tags', tagsResult, tagsRpt.sections, makeMeta('TF-IDF Per-Message Keyword Tags', msgCount, dateRange), function(d) {
    var rows = [];
    (d || []).forEach(function(entry) {
      (entry.keywords || []).forEach(function(k, i) {
        rows.push({ id: entry.id, rank: i + 1, term: k.term, tfidf: k.tfidf });
      });
    });
    return [{ filename: 'tfidf-keyword-tags', rows: rows, headers: ['id','rank','term','tfidf'] }];
  });
  written.push('tfidf-keyword-tags');

  // 6. TF-IDF vocabulary drift
  console.log('Running: TF-IDF (vocabulary drift)...');
  var driftResult = computeVocabularyDrift(simplified);
  var driftRpt     = tfidfDriftReport.build(driftResult);
  saveReport('tfidf-drift', driftResult, driftRpt.sections, makeMeta('TF-IDF Vocabulary Drift', msgCount, dateRange), function(d) {
    var rows = [];
    (d.transitions || []).forEach(function(t) {
      (t.rising || []).forEach(function(r) {
        rows.push({ from: t.from, to: t.to, direction: 'rising', term: r.term, before: r.before, after: r.after, delta: r.delta });
      });
      (t.falling || []).forEach(function(r) {
        rows.push({ from: t.from, to: t.to, direction: 'falling', term: r.term, before: r.before, after: r.after, delta: r.delta });
      });
    });
    return [{ filename: 'tfidf-drift', rows: rows, headers: ['from','to','direction','term','before','after','delta'] }];
  });
  written.push('tfidf-drift');

  // 7. TF-IDF relevance search (only when a query is provided)
  if (opts.query) {
    console.log('Running: TF-IDF (relevance search) for query "' + opts.query + '"...');
    var searchResult = searchByRelevance(simplified, opts.query);
    var searchRpt     = tfidfSearchReport.build(searchResult, opts.query);
    saveReport('tfidf-search', searchResult, searchRpt.sections, makeMeta('TF-IDF Relevance Search: "' + opts.query + '"', msgCount, dateRange), function(d) {
      var rows = (d || []).map(function(r) {
        return { id: r.id, score: r.score, preview: r.preview };
      });
      return [{ filename: 'tfidf-search', rows: rows, headers: ['id','score','preview'] }];
    });
    written.push('tfidf-search');
  } else {
    console.log('Skipping: TF-IDF (relevance search) — no --query provided.');
  }

  return written;
}

module.exports = { runTfidfSuite };
