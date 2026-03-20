/**
 * lib/reporters/json-reporter.js
 *
 * Wraps a report data object in a standardised metadata envelope
 * and serialises it to a JSON string.
 *
 * render(reportData, meta?) → string (JSON)
 *
 * meta fields (all optional):
 *   title        {string}
 *   message_count {number}
 *   date_range   { first, last }
 */

var { formatDate } = require('./base-reporter');

function render(reportData, meta) {
  meta = meta || {};
  var envelope = {
    generated_at:   new Date().toISOString(),
    title:          meta.title          || 'messages-exporter report',
    message_count:  meta.message_count  != null ? meta.message_count : null,
    date_range:     meta.date_range     ? {
      first: meta.date_range.first || null,
      last:  meta.date_range.last  || null,
      formatted: meta.date_range.first
        ? formatDate(meta.date_range.first) + ' \u2013 ' + formatDate(meta.date_range.last)
        : null,
    } : null,
    data: reportData,
  };
  return JSON.stringify(envelope, null, 2);
}

module.exports = { render };
