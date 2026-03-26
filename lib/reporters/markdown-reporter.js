/**
 * lib/reporters/markdown-reporter.js
 *
 * Renders report sections as GitHub-flavoured Markdown following the
 * Epic 7 design rules:
 *
 *   H1  = report title + date range
 *   H2  = major sections
 *   H3  = subsections
 *   GFM pipe tables for tabular data
 *   Bullet lists for ranked items
 *   `> **Insight:** …` callout blocks for key findings
 *   No inline HTML
 *
 * render(sections, meta?) → string
 *
 * Section shapes are identical to text-reporter.js.
 */

var {
  formatDate, formatDateRange, formatNumber,
  mdTable, mdRankedList, mdCallout, sparkline,
} = require('./base-reporter');

function renderMeta(meta) {
  if (!meta) return '';
  var lines = [];
  if (meta.message_count != null) {
    lines.push('**Messages:** ' + formatNumber(meta.message_count));
  }
  if (meta.date_range && meta.date_range.first) {
    lines.push('**Date range:** ' + formatDateRange(meta.date_range.first, meta.date_range.last));
  }
  if (meta.generated_at) {
    lines.push('**Generated:** ' + meta.generated_at);
  }
  return lines.join('  \n');
}

function renderSection(section) {
  switch (section.type) {
    case 'heading': {
      var prefix = '#'.repeat(section.level || 2);
      return prefix + ' ' + section.text;
    }

    case 'kv':
      return section.pairs.map(function(p) {
        return '- **' + p[0] + ':** ' + (p[1] == null ? '—' : p[1]);
      }).join('\n');

    case 'table':
      return mdTable(section.headers, section.rows, section.aligns);

    case 'list':
      return section.items.map(function(it) { return '- ' + it; }).join('\n');

    case 'ranked':
      return mdRankedList(section.items);

    case 'callout':
      return mdCallout(section.text, section.label);

    case 'sparkline': {
      var line = sparkline(section.values);
      return '```\n' + (section.label ? section.label + '\n' : '') + line + '\n```';
    }

    case 'blank':
      return '';

    case 'divider':
      return '---';

    case 'text':
      return section.text || '';

    case 'bar':
      // In Markdown, render as a table with a pseudo-bar column
      return mdTable(
        ['#', 'Label', 'Count'],
        section.items.map(function(it, i) {
          return [String(i + 1), it.label, String(it.value)];
        }),
        ['right', 'left', 'right']
      );

    default:
      return '';
  }
}

function render(sections, meta) {
  var parts = [];

  // H1 title block
  if (meta) {
    parts.push('# ' + (meta.title || 'messages-exporter Report'));
    var metaBlock = renderMeta(meta);
    if (metaBlock) parts.push(metaBlock);
    parts.push('');
  }

  (sections || []).forEach(function(s) {
    var rendered = renderSection(s);
    parts.push(rendered);
  });

  return parts.join('\n\n');
}

module.exports = { render };
