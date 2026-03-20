/**
 * lib/reporters/text-reporter.js
 *
 * Renders a report data object as fixed-width plain text.
 *
 * render(sections, meta?) → string
 *
 * Each section is one of:
 *   { type: 'heading',  level: 1|2|3, text }
 *   { type: 'kv',       pairs: [[label, value], …] }
 *   { type: 'table',    headers, rows, aligns? }
 *   { type: 'list',     items: [string, …] }
 *   { type: 'ranked',   items: [{ rank, label, value }, …] }
 *   { type: 'bar',      items: [{ label, value, max }, …], width? }
 *   { type: 'blank' }
 *   { type: 'divider' }
 *   { type: 'text',     text }
 */

var { formatDate, formatDateRange, textTable, asciiBar } = require('./base-reporter');

var LINE_WIDTH = 72;

function divider(char) {
  return (char || '=').repeat(LINE_WIDTH);
}

function heading(level, text) {
  if (level === 1) return divider('=') + '\n  ' + text.toUpperCase() + '\n' + divider('=');
  if (level === 2) return '\n' + text + '\n' + divider('-');
  return '  ' + text + ':';
}

function renderMeta(meta) {
  if (!meta) return '';
  var lines = [];
  if (meta.title)         lines.push('Report : ' + meta.title);
  if (meta.generated_at)  lines.push('Date   : ' + meta.generated_at);
  if (meta.message_count != null) lines.push('Total  : ' + meta.message_count.toLocaleString('en-US') + ' messages');
  if (meta.date_range && meta.date_range.first) {
    lines.push('Range  : ' + formatDateRange(meta.date_range.first, meta.date_range.last));
  }
  return lines.join('\n');
}

function renderSection(section) {
  switch (section.type) {
    case 'heading':
      return heading(section.level || 2, section.text || '');

    case 'kv': {
      var labelW = section.pairs.reduce(function(max, p) { return Math.max(max, String(p[0]).length); }, 0);
      return section.pairs.map(function(p) {
        var label = String(p[0]);
        return '  ' + label + ' '.repeat(labelW - label.length) + '  ' + String(p[1] == null ? '—' : p[1]);
      }).join('\n');
    }

    case 'table':
      return textTable(section.headers, section.rows, { aligns: section.aligns });

    case 'list':
      return section.items.map(function(it) { return '  • ' + it; }).join('\n');

    case 'ranked':
      return section.items.map(function(it) {
        return '  ' + String(it.rank).padStart(3) + '. ' + it.label + '  —  ' + it.value;
      }).join('\n');

    case 'bar': {
      var max = section.max || Math.max.apply(null, section.items.map(function(it) { return it.value; }));
      var labelW2 = section.items.reduce(function(w, it) { return Math.max(w, String(it.label).length); }, 0);
      return section.items.map(function(it) {
        var label = String(it.label);
        var bar   = asciiBar(it.value, max, section.width || 30);
        return '  ' + label + ' '.repeat(labelW2 - label.length) + '  ' + bar + '  ' + it.value;
      }).join('\n');
    }

    case 'blank':
      return '';

    case 'divider':
      return divider(section.char);

    case 'text':
      return section.text || '';

    default:
      return '';
  }
}

function render(sections, meta) {
  var parts = [];
  if (meta) {
    parts.push(divider('='));
    parts.push(renderMeta(meta));
    parts.push(divider('='));
  }
  (sections || []).forEach(function(s) {
    parts.push(renderSection(s));
  });
  parts.push('');
  return parts.join('\n');
}

module.exports = { render };
