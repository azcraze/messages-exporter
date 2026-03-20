'use strict';

var { expect } = require('chai');
var { phraseFrequency } = require('../../../modules/nlp/phraseExtractor');

var MSGS = [
  { message_text: 'good morning how are you doing' },
  { message_text: 'good morning everyone have a great day' },
  { message_text: 'how are you feeling today' },
];

describe('phraseFrequency()', function () {

  it('returns an array', function () {
    expect(phraseFrequency(MSGS)).to.be.an('array');
  });

  it('returns only bigrams when minN=2, maxN=2', function () {
    var result = phraseFrequency(MSGS, { minN: 2, maxN: 2 });
    result.forEach(function (p) {
      expect(p.phrase.split(' ')).to.have.lengthOf(2);
    });
  });

  it('finds "good morning" as a top bigram', function () {
    var result = phraseFrequency(MSGS, { minN: 2, maxN: 2 });
    var phrases = result.map(function (p) { return p.phrase; });
    expect(phrases).to.include('good morning');
  });

  it('"good morning" appears with count 2', function () {
    var result = phraseFrequency(MSGS, { minN: 2, maxN: 2 });
    var gm = result.find(function (p) { return p.phrase === 'good morning'; });
    expect(gm).to.exist;
    expect(gm.count).to.equal(2);
  });

  it('returns only trigrams when minN=3, maxN=3', function () {
    var result = phraseFrequency(MSGS, { minN: 3, maxN: 3 });
    result.forEach(function (p) {
      expect(p.phrase.split(' ')).to.have.lengthOf(3);
    });
  });

  it('respects topN option', function () {
    var result = phraseFrequency(MSGS, { minN: 2, maxN: 2, topN: 2 });
    expect(result.length).to.be.at.most(2);
  });

  it('returns empty array for empty input', function () {
    expect(phraseFrequency([])).to.deep.equal([]);
  });

  it('ranks phrases by descending count', function () {
    var result = phraseFrequency(MSGS, { n: 2 });
    for (var i = 1; i < result.length; i++) {
      expect(result[i - 1].count).to.be.at.least(result[i].count);
    }
  });
});
