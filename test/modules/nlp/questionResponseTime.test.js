'use strict';

var { expect } = require('chai');
var { computeQuestionResponseTime } = require('../../../modules/nlp/questionResponseTime');

describe('computeQuestionResponseTime()', function () {
  var simplified = [
    { _id: '1', message_text: 'Are you coming?', date: '2024-01-15T18:00:00', sender: 'alice', is_from_me: 0 },
    { _id: '2', message_text: 'Yes!',             date: '2024-01-15T18:10:00', sender: 'bob',   is_from_me: 1 }, // 10 min
    { _id: '3', message_text: 'What time?',       date: '2024-01-15T18:11:00', sender: 'alice', is_from_me: 0 },
    { _id: '4', message_text: '7pm',              date: '2024-01-15T18:16:00', sender: 'bob',   is_from_me: 1 }, // 5 min
  ];
  var conversations = [{
    conversationId: 0,
    conversationMsgs: simplified.map(function(m) { return Object.assign({}, m, { from: m.sender }); }),
  }];

  it('computes overall mean/median/count across paired questions', function () {
    var result = computeQuestionResponseTime(simplified, conversations);
    expect(result.overall.count).to.equal(2);
    expect(result.overall.mean).to.equal(7.5);
    expect(result.overall.median).to.equal(7.5);
  });

  it('breaks latency down by answerer', function () {
    var result = computeQuestionResponseTime(simplified, conversations);
    expect(result.byAnswerer.bob.count).to.equal(2);
  });

  it('breaks latency down by asker', function () {
    var result = computeQuestionResponseTime(simplified, conversations);
    expect(result.byAsker.alice.count).to.equal(2);
  });

  it('breaks latency down by asker->answerer pair', function () {
    var result = computeQuestionResponseTime(simplified, conversations);
    expect(result.byPair['alice -> bob'].count).to.equal(2);
  });
});
