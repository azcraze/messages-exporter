'use strict';

var { expect } = require('chai');
var { classifyQuestionTypes } = require('../../../modules/nlp/questionTypeClassifier');

var MSGS = [
  { _id: '1', message_text: 'What time is it?',   sender: 'alice', date: '2024-01-01T09:00:00' },
  { _id: '2', message_text: 'Are you free?',       sender: 'alice', date: '2024-01-01T09:01:00' },
  { _id: '3', message_text: 'Pizza or tacos?',     sender: 'bob',   date: '2024-01-01T09:02:00' },
  { _id: '4', message_text: 'Sounds good.',        sender: 'bob',   date: '2024-01-01T09:03:00' },
];

describe('classifyQuestionTypes()', function () {

  it('returns empty result for non-array input', function () {
    expect(classifyQuestionTypes(null)).to.deep.equal({ total: 0, overall: {}, bySender: {}, questions: [] });
  });

  it('counts only the question messages', function () {
    var result = classifyQuestionTypes(MSGS);
    expect(result.total).to.equal(3);
  });

  it('aggregates overall type counts', function () {
    var result = classifyQuestionTypes(MSGS);
    expect(result.overall.wh).to.equal(1);
    expect(result.overall['yes-no']).to.equal(1);
    expect(result.overall.choice).to.equal(1);
  });

  it('aggregates per-sender type counts and totals', function () {
    var result = classifyQuestionTypes(MSGS);
    expect(result.bySender.alice.total).to.equal(2);
    expect(result.bySender.bob.total).to.equal(1);
  });

  it('includes a flat list of classified questions with type and confidence', function () {
    var result = classifyQuestionTypes(MSGS);
    var q = result.questions.find(function(q) { return q._id === '1'; });
    expect(q.type).to.equal('wh');
    expect(q.confidence).to.be.above(0);
  });
});
