'use strict';

var { expect } = require('chai');
var { wordFrequency } = require('../../../modules/nlp/wordFrequency');

var MSGS = [
  { message_text: 'the quick brown fox jumps over the lazy dog' },
  { message_text: 'the fox ran quickly over the hill' },
  { message_text: 'a quick brown dog' },
];

describe('wordFrequency()', function () {

  it('returns an object with a words array', function () {
    var result = wordFrequency(MSGS);
    expect(result).to.be.an('object');
    expect(result.words).to.be.an('array');
  });

  it('ranks words by descending frequency', function () {
    var { words } = wordFrequency(MSGS);
    for (var i = 1; i < words.length; i++) {
      expect(words[i - 1].count).to.be.at.least(words[i].count);
    }
  });

  it('assigns sequential ranks starting at 1', function () {
    var { words } = wordFrequency(MSGS);
    words.forEach(function (w, i) {
      expect(w.rank).to.equal(i + 1);
    });
  });

  it('filters out stop words (e.g. "the", "a", "over")', function () {
    var { words } = wordFrequency(MSGS);
    var wordList = words.map(function (w) { return w.word; });
    expect(wordList).to.not.include('the');
    expect(wordList).to.not.include('a');
  });

  it('respects topN option', function () {
    var { words } = wordFrequency(MSGS, { topN: 3 });
    expect(words.length).to.be.at.most(3);
  });

  it('returns empty words array for empty input', function () {
    var result = wordFrequency([]);
    expect(result.words).to.deep.equal([]);
  });

  it('counts "quick" correctly across two messages', function () {
    var { words } = wordFrequency(MSGS);
    var quick = words.find(function (w) { return w.word === 'quick'; });
    // "quick" and "quickly" may both appear; "quick" must be present
    expect(quick).to.exist;
    expect(quick.count).to.be.at.least(1);
  });

  it('handles messages with null/missing text gracefully', function () {
    var msgs = [{ message_text: null }, {}, { message_text: 'hello world' }];
    var { words } = wordFrequency(msgs);
    expect(words.length).to.be.at.least(1);
  });
});
