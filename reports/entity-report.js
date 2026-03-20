/**
 * reports/entity-report.js
 *
 * Named entities (people, places, organisations) mentioned across messages.
 *
 * build(messages) → { data, sections }
 */

var { extractEntities } = require('../modules/nlp/entityExtractor');
var { formatNumber } = require('../lib/reporters/base-reporter');

function entityToRows(list, topN) {
  return (list || []).slice(0, topN || 20).map(function(e, i) {
    return [String(i + 1), e.entity, formatNumber(e.count)];
  });
}

function build(messages) {
  if (!Array.isArray(messages)) messages = [];

  var result = extractEntities(messages);
  var data   = result;

  var sections = [
    { type: 'heading', level: 2, text: 'Named Entities' },
    {
      type: 'kv',
      pairs: [
        ['Unique people',        formatNumber((result.people        || []).length)],
        ['Unique places',        formatNumber((result.places        || []).length)],
        ['Unique organisations', formatNumber((result.organizations || []).length)],
      ],
    },
    { type: 'blank' },
    { type: 'heading', level: 2, text: 'People Mentioned' },
    result.people && result.people.length > 0 ? {
      type: 'table',
      headers: ['Rank', 'Name', 'Mentions'],
      aligns:  ['right', 'left', 'right'],
      rows:    entityToRows(result.people),
    } : { type: 'text', text: 'No people entities detected.' },
    { type: 'blank' },
    { type: 'heading', level: 2, text: 'Places Mentioned' },
    result.places && result.places.length > 0 ? {
      type: 'table',
      headers: ['Rank', 'Place', 'Mentions'],
      aligns:  ['right', 'left', 'right'],
      rows:    entityToRows(result.places),
    } : { type: 'text', text: 'No place entities detected.' },
    { type: 'blank' },
    { type: 'heading', level: 2, text: 'Organisations Mentioned' },
    result.organizations && result.organizations.length > 0 ? {
      type: 'table',
      headers: ['Rank', 'Organisation', 'Mentions'],
      aligns:  ['right', 'left', 'right'],
      rows:    entityToRows(result.organizations),
    } : { type: 'text', text: 'No organisation entities detected.' },
  ];

  // Insight callout — most-mentioned entity overall
  var all = (result.people || []).concat(result.places || []).concat(result.organizations || []);
  all.sort(function(a, b) { return b.count - a.count; });
  if (all.length > 0) {
    sections.push({ type: 'blank' });
    sections.push({
      type: 'callout',
      label: 'Insight',
      text: 'Most-mentioned entity: **' + all[0].entity + '** (' + formatNumber(all[0].count) + ' mentions).',
    });
  }

  return { data, sections };
}

module.exports = { build };
