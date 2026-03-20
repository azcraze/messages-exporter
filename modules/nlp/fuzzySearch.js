/**
 * modules/nlp/fuzzySearch.js
 *
 * Fuzzy full-text search over message_text using fuse.js.
 *
 * fuzzySearch(messages, query, opts?)
 *   – one-shot search, builds a temporary index
 *   → Array<{ score, message, matches }>
 *
 * buildIndex(messages, opts?)
 *   – builds a reusable index for multiple queries against the same dataset
 *   → { search(query) → Array<{ score, message, matches }> }
 *
 * Options (fuse.js options, all optional):
 *   threshold       {number}  0 = exact, 1 = anything; default 0.4
 *   minMatchCharLen {number}  default 2
 *   keys            {Array}   fields to search; default ['message_text']
 */

var Fuse = require('fuse.js');

var DEFAULT_OPTS = {
  keys:               ['message_text'],
  threshold:          0.4,
  includeScore:       true,
  includeMatches:     true,
  minMatchCharLength: 2,
  ignoreLocation:     true,
};

function formatResults(fuseResults) {
  return fuseResults.map(function(r) {
    return {
      score:   r.score,
      message: r.item,
      matches: r.matches || [],
    };
  });
}

function fuzzySearch(messages, query, opts) {
  if (!Array.isArray(messages) || !query) return [];
  var fuse = new Fuse(messages, Object.assign({}, DEFAULT_OPTS, opts || {}));
  return formatResults(fuse.search(query));
}

function buildIndex(messages, opts) {
  if (!Array.isArray(messages)) throw new Error('buildIndex: messages must be an array');
  var fuse = new Fuse(messages, Object.assign({}, DEFAULT_OPTS, opts || {}));
  return {
    search: function(query) {
      if (!query) return [];
      return formatResults(fuse.search(query));
    },
  };
}

module.exports = { fuzzySearch, buildIndex };
