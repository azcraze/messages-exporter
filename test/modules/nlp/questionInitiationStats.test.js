'use strict';

var { expect } = require('chai');
var { computeQuestionInitiationStats } = require('../../../modules/nlp/questionInitiationStats');

describe('computeQuestionInitiationStats()', function () {
  var simplified = [
    { _id: '1', message_text: 'What time is it?', date: '2024-01-15T18:00:00', sender: 'alice', is_from_me: 0 },
    { _id: '2', message_text: '6pm',               date: '2024-01-15T18:01:00', sender: 'bob',   is_from_me: 1 },
    { _id: '3', message_text: 'Cool thanks',        date: '2024-01-15T18:02:00', sender: 'alice', is_from_me: 0 },
  ];
  var conversations = [{
    conversationId: 0,
    conversationMsgs: simplified.map(function(m) { return Object.assign({}, m, { from: m.sender }); }),
  }];

  it('counts messages sent and questions asked per sender', function () {
    var result = computeQuestionInitiationStats(simplified, conversations);
    expect(result.bySender.alice.messagesSent).to.equal(2);
    expect(result.bySender.alice.questionsAsked).to.equal(1);
    expect(result.bySender.bob.messagesSent).to.equal(1);
    expect(result.bySender.bob.questionsAsked).to.equal(0);
  });

  it('computes curiosity index as questionsAsked / messagesSent', function () {
    var result = computeQuestionInitiationStats(simplified, conversations);
    expect(result.bySender.alice.curiosityIndex).to.equal(0.5);
  });

  it('credits the answerer with questionsAnsweredByThem', function () {
    var result = computeQuestionInitiationStats(simplified, conversations);
    expect(result.bySender.bob.questionsAnsweredByThem).to.equal(1);
  });

  it('rolls up totals across all senders', function () {
    var result = computeQuestionInitiationStats(simplified, conversations);
    expect(result.totals.messagesSent).to.equal(3);
    expect(result.totals.questionsAsked).to.equal(1);
    expect(result.totals.questionsAnswered).to.equal(1);
  });

  it('returns empty result for non-array input', function () {
    var result = computeQuestionInitiationStats(null, []);
    expect(result.totals.messagesSent).to.equal(0);
  });
});
