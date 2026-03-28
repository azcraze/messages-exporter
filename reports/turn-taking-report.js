/**
 * reports/turn-taking-report.js
 *
 * Turn-taking analysis: initiations, run lengths, back-and-forth ratios.
 *
 * build(result) → { data, sections }
 * result = output of analyzeTurnTaking()
 */

var { formatNumber, formatFloat } = require('../lib/reporters/base-reporter');

function build(result) {
  if (!result || typeof result !== 'object') {
    result = {
      initiations:           { bySender: {} },
      avgRunLength:          { bySender: {}, overall: 0 },
      backAndForthRatio:     { overall: 0, bySender: {} },
      conversationBreakdown: [],
    };
  }

  var data     = result;
  var sections = [];

  sections.push({ type: 'heading', level: 2, text: 'Turn-Taking Analysis' });
  sections.push({
    type: 'kv',
    pairs: [
      ['Overall avg run length',       formatFloat(result.avgRunLength.overall || 0, 2)],
      ['Overall back-and-forth ratio', formatFloat(result.backAndForthRatio.overall || 0, 3)],
      ['Conversations analysed',       formatNumber((result.conversationBreakdown || []).length)],
    ],
  });
  sections.push({ type: 'blank' });
  sections.push({
    type:  'callout',
    label: 'Note',
    text:  'Back-and-forth ratio = sender switches ÷ total messages. Higher = more conversational ping-pong.',
  });
  sections.push({ type: 'blank' });

  // Initiations table
  var initBySender = result.initiations && result.initiations.bySender || {};
  var initRows = Object.keys(initBySender)
    .map(function(s) { return [s, formatNumber(initBySender[s])]; })
    .sort(function(a, b) { return parseInt(b[1].replace(/,/g, '')) - parseInt(a[1].replace(/,/g, '')); });

  if (initRows.length > 0) {
    sections.push({ type: 'heading', level: 3, text: 'Conversation Initiations by Sender' });
    sections.push({
      type:    'table',
      headers: ['Sender', 'Conversations Initiated'],
      aligns:  ['left', 'right'],
      rows:    initRows,
    });
    sections.push({ type: 'blank' });
  }

  // Average run length per sender
  var runBySender = result.avgRunLength && result.avgRunLength.bySender || {};
  var runRows = Object.keys(runBySender)
    .map(function(s) { return [s, formatFloat(runBySender[s], 2)]; })
    .sort(function(a, b) { return parseFloat(b[1]) - parseFloat(a[1]); });

  if (runRows.length > 0) {
    sections.push({ type: 'heading', level: 3, text: 'Average Run Length per Sender' });
    sections.push({
      type:    'table',
      headers: ['Sender', 'Avg Consecutive Messages'],
      aligns:  ['left', 'right'],
      rows:    runRows,
    });
    sections.push({ type: 'blank' });
    sections.push({
      type:  'callout',
      label: 'Insight',
      text:  'A run length > 2 suggests one sender often sends multiple messages before receiving a reply.',
    });
  }

  return { data, sections };
}

module.exports = { build };
