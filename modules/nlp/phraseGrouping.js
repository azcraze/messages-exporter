/**
 * modules/nlp/phraseGrouping.js
 *
 * Clusters similar phrases that likely mean the same thing using
 * fuzzy string matching (fuse.js).
 *
 * Approach:
 *   1. Collect all unique phrases (with their counts) from phraseFrequency.
 *   2. Process each phrase in descending count order.
 *   3. Search the current cluster canonical list with Fuse.js.
 *   4. If a match is found above threshold, merge into that cluster.
 *   5. Otherwise, start a new cluster with this phrase as canonical.
 *
 * groupPhrases(messages, opts?) → {
 *   clusters: Array<ClusterEntry>,
 * }
 *
 * ClusterEntry: {
 *   rank:       number,
 *   canonical:  string,
 *   variants:   Array<{ phrase, count }>,
 *   totalCount: number,
 * }
 *
 * Options:
 *   threshold  {number}  Fuse.js score threshold 0–1; lower = stricter (default 0.35)
 *   topN       {number}  phrases to collect before clustering (default 100)
 *   minN       {number}  min n-gram size passed to phraseFrequency (default 2)
 *   maxN       {number}  max n-gram size passed to phraseFrequency (default 3)
 *   minCount   {number}  minimum phrase count to include (default 2)
 */

var Fuse = require('fuse.js');
var { phraseFrequency } = require('./phraseExtractor');

/**
 * @param {Array<Object>} messages
 * @param {Object}        [opts]
 * @returns {{ clusters: Array }}
 */
function groupPhrases(messages, opts) {
  if (!Array.isArray(messages)) return { clusters: [] };

  opts = opts || {};
  var threshold = opts.threshold != null ? opts.threshold : 0.35;
  var topN      = opts.topN      || 100;
  var minCount  = opts.minCount  || 2;

  // Collect phrases
  var phrases = phraseFrequency(messages, {
    topN:     topN,
    minN:     opts.minN   || 2,
    maxN:     opts.maxN   || 3,
    minCount: minCount,
  });

  if (phrases.length === 0) return { clusters: [] };

  // Sort by count descending so high-frequency phrases become canonicals
  phrases.sort(function(a, b) { return b.count - a.count; });

  var clusters    = [];  // { canonical, variants: [{ phrase, count }], totalCount }
  var canonicals  = []; // flat list for Fuse index

  phrases.forEach(function(phraseEntry) {
    if (!canonicals.length) {
      // First phrase starts the first cluster
      var c = { canonical: phraseEntry.phrase, variants: [{ phrase: phraseEntry.phrase, count: phraseEntry.count }], totalCount: phraseEntry.count };
      clusters.push(c);
      canonicals.push(phraseEntry.phrase);
      return;
    }

    var fuse = new Fuse(canonicals, {
      includeScore:   true,
      threshold:      threshold,
      tokenize:       true,
      minMatchCharLen: 3,
    });

    var results = fuse.search(phraseEntry.phrase);

    if (results.length > 0 && results[0].score <= threshold) {
      // Merge into matching cluster
      var matchedCanonical = results[0].item;
      var cluster = clusters.find(function(cl) { return cl.canonical === matchedCanonical; });
      if (cluster) {
        cluster.variants.push({ phrase: phraseEntry.phrase, count: phraseEntry.count });
        cluster.totalCount += phraseEntry.count;
        return;
      }
    }

    // Start a new cluster
    var newCluster = {
      canonical:  phraseEntry.phrase,
      variants:   [{ phrase: phraseEntry.phrase, count: phraseEntry.count }],
      totalCount: phraseEntry.count,
    };
    clusters.push(newCluster);
    canonicals.push(phraseEntry.phrase);
  });

  // Sort clusters by totalCount descending and assign rank
  clusters.sort(function(a, b) { return b.totalCount - a.totalCount; });
  clusters.forEach(function(cl, i) { cl.rank = i + 1; });

  return { clusters: clusters };
}

module.exports = { groupPhrases };
