/**
 * reports/message-volume-report.js
 *
 * Message volume over time: by month, year, with sparkline trend.
 *
 * build(result) → { data, sections }
 * result = output of messageVolume()
 */

var { formatNumber, formatFloat, formatDateRange, sparkline } = require('../lib/reporters/base-reporter');

function build(result) {
  if (!result || typeof result !== 'object') {
    result = { total: 0, dateRange: null, byDay: [], byWeek: [], byMonth: [], byYear: [], averages: {} };
  }

  var data     = result;
  var sections = [];

  sections.push({ type: 'heading', level: 2, text: 'Message Volume' });

  var rangeStr = result.dateRange
    ? formatDateRange(result.dateRange.first, result.dateRange.last) + ' (' + formatNumber(result.dateRange.spanDays) + ' days)'
    : '—';

  sections.push({
    type: 'kv',
    pairs: [
      ['Total messages',       formatNumber(result.total || 0)],
      ['Date range',           rangeStr],
      ['Avg messages / day',   formatFloat((result.averages || {}).perDay   || 0, 1)],
      ['Avg messages / week',  formatFloat((result.averages || {}).perWeek  || 0, 1)],
      ['Avg messages / month', formatFloat((result.averages || {}).perMonth || 0, 1)],
    ],
  });
  sections.push({ type: 'blank' });

  // Monthly sparkline
  var monthCounts = (result.byMonth || []).map(function(m) { return m.count; });
  if (monthCounts.length > 0) {
    sections.push({
      type:   'sparkline',
      label:  'Monthly volume trend (' + (result.byMonth || []).length + ' months)',
      values: monthCounts,
    });
    sections.push({ type: 'blank' });
  }

  // By year table
  var yearRows = (result.byYear || []).map(function(y) {
    return [String(y.year), formatNumber(y.count)];
  });
  if (yearRows.length > 0) {
    sections.push({ type: 'heading', level: 3, text: 'Volume by Year' });
    sections.push({
      type:    'table',
      headers: ['Year', 'Messages'],
      aligns:  ['left', 'right'],
      rows:    yearRows,
    });
    sections.push({ type: 'blank' });
  }

  // By month table (last 24)
  var monthRows = (result.byMonth || []).slice(-24).map(function(m) {
    return [m.month, formatNumber(m.count)];
  });
  if (monthRows.length > 0) {
    sections.push({ type: 'heading', level: 3, text: 'Volume by Month (last 24)' });
    sections.push({
      type:    'table',
      headers: ['Month', 'Messages'],
      aligns:  ['left', 'right'],
      rows:    monthRows,
    });
  }

  return { data, sections };
}

module.exports = { build };
