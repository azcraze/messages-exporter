/**
 * reports/tone-drift-report.js
 *
 * Conversations where the tone drifted significantly between start and end.
 *
 * build(result) → { data, sections }
 * result = output of detectToneDrift()
 */

var { formatNumber, formatFloat } = require('../lib/reporters/base-reporter');

function build(result) {
  if (!result || typeof result !== 'object') {
    result = { total: 0, drifted: 0, drifts: [] };
  }

  var data     = result;
  var sections = [];

  sections.push({ type: 'heading', level: 2, text: 'Tone Drift Detection' });
  sections.push({
    type: 'kv',
    pairs: [
      ['Conversations analysed', formatNumber(result.total || 0)],
      ['Conversations with drift', formatNumber(result.drifted || 0)],
      ['Drift rate', result.total > 0
        ? ((result.drifted / result.total) * 100).toFixed(1) + '%'
        : '—'],
    ],
  });
  sections.push({ type: 'blank' });

  var pct = result.total > 0 ? ((result.drifted / result.total) * 100).toFixed(1) : 0;
  sections.push({
    type:  'callout',
    label: 'Insight',
    text:  pct + '% of analysed conversations ended on a notably different tone than they started.',
  });
  sections.push({ type: 'blank' });

  if ((result.drifts || []).length === 0) {
    sections.push({ type: 'text', text: 'No significant tone drifts detected.' });
    return { data, sections };
  }

  sections.push({ type: 'heading', level: 3, text: 'Drifted Conversations' });

  var rows = (result.drifts || []).map(function(d) {
    var dir = d.direction === 'positive' ? '↑ More positive' : '↓ More negative';
    return [
      d.conversationId != null ? String(d.conversationId) : '—',
      d.date ? d.date.slice(0, 10) : '—',
      formatNumber(d.messageCount),
      formatFloat(d.startScore, 3),
      formatFloat(d.endScore, 3),
      (d.delta >= 0 ? '+' : '') + formatFloat(d.delta, 3),
      dir,
      (d.participants || []).join(', ') || '—',
    ];
  });

  sections.push({
    type:    'table',
    headers: ['Conv ID', 'Date', 'Messages', 'Start Score', 'End Score', 'Delta', 'Direction', 'Participants'],
    aligns:  ['right', 'left', 'right', 'right', 'right', 'right', 'left', 'left'],
    rows:    rows,
  });

  return { data, sections };
}

module.exports = { build };
