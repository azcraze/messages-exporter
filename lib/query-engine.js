/**
 * lib/query-engine.js
 *
 * A chainable query builder that filters an in-memory message array.
 * All filter methods return `this` for chaining; `.run()` executes them.
 *
 * Usage:
 *   var QueryEngine = require('./lib/query-engine');
 *
 *   var results = new QueryEngine(messages)
 *     .dateRange('2024-01-01', '2024-06-30')
 *     .participant('+15551234567')
 *     .search('hello world')
 *     .limit(100)
 *     .run();
 *
 *   // Async (fuzzy search builds an index):
 *   new QueryEngine(messages)
 *     .fuzzy('hello', { threshold: 0.3 })
 *     .runAsync()            // → Promise<Array>
 *     .then(results => …);
 */

var {
  filterMessagesByDateRange,
  filterMessagesByParticipant,
  filterMessagesByText,
} = require('../modules/messageFiltering');

/**
 * @param {Array} messages  Starting message array.
 */
function QueryEngine(messages) {
  if (!(this instanceof QueryEngine)) return new QueryEngine(messages);
  this._messages  = Array.isArray(messages) ? messages : [];
  this._filters   = [];   // Array of { type, fn, async }
  this._limitN    = null;
  this._sortField = null;
  this._sortDir   = 'asc';
}

// ---------------------------------------------------------------------------
// 6.2  Date-range filter
// ---------------------------------------------------------------------------
/**
 * Keep messages whose `date` falls within [startDate, endDate].
 * Either bound may be omitted / null for open-ended ranges.
 * Dates should be ISO-8601 strings, e.g. '2024-01-15' or '2024-01-15T09:00:00'.
 *
 * @param {string|null} startDate
 * @param {string|null} endDate
 */
QueryEngine.prototype.dateRange = function(startDate, endDate) {
  this._filters.push({
    type: 'dateRange',
    fn:   function(msgs) {
      return filterMessagesByDateRange(msgs, startDate || null, endDate || null);
    },
  });
  return this;
};

// ---------------------------------------------------------------------------
// 6.3  Participant filter
// ---------------------------------------------------------------------------
/**
 * Keep messages where `sender`, `receiver`, or any element of `participants`
 * matches the given address.  Supports plain E.164 phone numbers and emails.
 *
 * @param {string} address
 */
QueryEngine.prototype.participant = function(address) {
  this._filters.push({
    type: 'participant',
    fn:   function(msgs) {
      return filterMessagesByParticipant(msgs, address);
    },
  });
  return this;
};

// ---------------------------------------------------------------------------
// 6.4  Exact / case-insensitive text search
// ---------------------------------------------------------------------------
/**
 * Keep messages whose `message_text` contains `text` (case-insensitive).
 *
 * @param {string} text
 */
QueryEngine.prototype.search = function(text) {
  if (!text) return this;
  this._filters.push({
    type: 'search',
    fn:   function(msgs) {
      return filterMessagesByText(msgs, text);
    },
  });
  return this;
};

// ---------------------------------------------------------------------------
// 6.5  Fuzzy text search
// ---------------------------------------------------------------------------
/**
 * Filter messages using fuzzy matching (via fuse.js).
 * Only valid in `runAsync()` — synchronous `.run()` will throw if a fuzzy
 * filter is present.
 *
 * @param {string} query
 * @param {object} [opts]  Fuse.js options; default threshold 0.4
 */
QueryEngine.prototype.fuzzy = function(query, opts) {
  if (!query) return this;
  this._filters.push({
    type:  'fuzzy',
    async: true,
    fn:    function(msgs) {
      var fuzzySearch = require('../modules/nlp/fuzzySearch').fuzzySearch;
      // fuzzySearch returns Array<{score, message, matches}> — unwrap to messages
      return fuzzySearch(msgs, query, opts).map(function(r) { return r.message; });
    },
  });
  return this;
};

// ---------------------------------------------------------------------------
// 6.6  Regex / pattern search
// ---------------------------------------------------------------------------
/**
 * Keep messages whose `message_text` matches the given regular expression.
 *
 * @param {string|RegExp} pattern  String is compiled with flags; or pass a RegExp.
 * @param {string}        [flags]  Regex flags when pattern is a string (default 'i').
 */
QueryEngine.prototype.pattern = function(rawPattern, flags) {
  if (!rawPattern) return this;
  var re = rawPattern instanceof RegExp
    ? rawPattern
    : new RegExp(rawPattern, flags !== undefined ? flags : 'i');

  this._filters.push({
    type: 'pattern',
    fn:   function(msgs) {
      return msgs.filter(function(msg) {
        return msg && msg.message_text && re.test(msg.message_text);
      });
    },
  });
  return this;
};

// ---------------------------------------------------------------------------
// Limit / sort helpers
// ---------------------------------------------------------------------------
/**
 * Limit the result set to `n` messages (applied after all filters).
 *
 * @param {number} n
 */
QueryEngine.prototype.limit = function(n) {
  this._limitN = parseInt(n, 10) || null;
  return this;
};

/**
 * Sort the result set before applying limit.
 * Field 'date' sorts chronologically; others compare as strings.
 *
 * @param {string} field   Message property name.
 * @param {'asc'|'desc'} [direction]  Default 'asc'.
 */
QueryEngine.prototype.sort = function(field, direction) {
  this._sortField = field;
  this._sortDir   = direction === 'desc' ? 'desc' : 'asc';
  return this;
};

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------
function applyFilters(messages, filters) {
  return filters.reduce(function(msgs, f) {
    return f.fn(msgs);
  }, messages);
}

function applySort(messages, field, dir) {
  if (!field) return messages;
  return messages.slice().sort(function(a, b) {
    var av = a[field] || '';
    var bv = b[field] || '';
    var cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return dir === 'desc' ? -cmp : cmp;
  });
}

function applyLimit(messages, n) {
  return (n && n > 0) ? messages.slice(0, n) : messages;
}

/**
 * Execute synchronously.  Throws if any async (fuzzy) filters are registered.
 *
 * @returns {Array}
 */
QueryEngine.prototype.run = function() {
  var hasAsync = this._filters.some(function(f) { return f.async; });
  if (hasAsync) {
    throw new Error('QueryEngine: fuzzy filter requires runAsync(), not run()');
  }
  var result = applyFilters(this._messages, this._filters);
  result = applySort(result, this._sortField, this._sortDir);
  return applyLimit(result, this._limitN);
};

/**
 * Execute and return a Promise — required when fuzzy filters are present.
 *
 * @returns {Promise<Array>}
 */
QueryEngine.prototype.runAsync = function() {
  var self = this;
  return Promise.resolve().then(function() {
    var result = applyFilters(self._messages, self._filters);
    result = applySort(result, self._sortField, self._sortDir);
    return applyLimit(result, self._limitN);
  });
};

/**
 * Return a count of results without materialising the full array.
 *
 * @returns {number}
 */
QueryEngine.prototype.count = function() {
  return this.run().length;
};

module.exports = QueryEngine;
