/**
 * reports/word-frequency-report.js
 *
 * Top-50 words (stop-word filtered) and top-20 phrases (bigrams/trigrams).
 *
 * build(messages) → { data, sections }
 */

var { wordFrequency } = require('../modules/nlp/wordFrequency');
var { phraseFrequency } = require('../modules/nlp/phraseExtractor');
var { formatNumber } = require('../lib/reporters/base-reporter');

function build(messages) {
  if (!Array.isArray(messages)) messages = [];

  var wfResult = wordFrequency(messages, { topN: 50 });
  var words    = Array.isArray(wfResult) ? wfResult : (wfResult.words || []);
  var bigrams  = phraseFrequency(messages, { n: 2, topN: 20 });
  var trigrams = phraseFrequency(messages, { n: 3, topN: 10 });

  var data = { words, bigrams, trigrams };

  var wordRows = words.map(function(w) {
    return [String(w.rank), w.word, formatNumber(w.count)];
  });

  var bigramRows = bigrams.map(function(p) {
    return [String(p.rank), p.phrase, formatNumber(p.count)];
  });

  var trigramRows = trigrams.map(function(p) {
    return [String(p.rank), p.phrase, formatNumber(p.count)];
  });

  var sections = [
    { type: 'heading', level: 2, text: 'Word Frequency' },
    {
      type: 'callout',
      label: 'Note',
      text: 'Stop words removed. Top ' + words.length + ' words shown.',
    },
    { type: 'blank' },
    {
      type: 'table',
      headers: ['Rank', 'Word', 'Count'],
      aligns:  ['right', 'left', 'right'],
      rows:    wordRows,
    },
    { type: 'blank' },
    { type: 'heading', level: 2, text: 'Top Phrases (Bigrams)' },
    {
      type: 'table',
      headers: ['Rank', 'Phrase', 'Count'],
      aligns:  ['right', 'left', 'right'],
      rows:    bigramRows,
    },
    { type: 'blank' },
    { type: 'heading', level: 2, text: 'Top Phrases (Trigrams)' },
    {
      type: 'table',
      headers: ['Rank', 'Phrase', 'Count'],
      aligns:  ['right', 'left', 'right'],
      rows:    trigramRows,
    },
  ];

  if (words.length > 0) {
    sections.push({ type: 'blank' });
    sections.push({
      type: 'callout',
      label: 'Insight',
      text: 'Most used word: **' + words[0].word + '** (' + formatNumber(words[0].count) + ' times).',
    });
  }

  return { data, sections };
}

module.exports = { build };
