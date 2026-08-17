'use strict';

var { expect } = require('chai');
var { detectRhetoricalQuestions } = require('../../../modules/nlp/rhetoricalQuestionDetector');

describe('detectRhetoricalQuestions()', function () {

  it('flags a phrase-cue rhetorical question', function () {
    var simplified = [
      { _id: '1', message_text: 'Why me?', date: '2024-01-15T18:00:00', sender: 'alice', is_from_me: 0 },
    ];
    var conversations = [{ conversationId: 0, conversationMsgs: [{ _id: '1', from: 'alice', date: simplified[0].date, message_text: simplified[0].message_text }] }];

    var result = detectRhetoricalQuestions(simplified, conversations);
    expect(result.rhetoricalCount).to.equal(1);
    expect(result.bySender.alice[0].reasons).to.include('phrase-cue');
  });

  it('flags a self-answered question', function () {
    var simplified = [
      { _id: '1', message_text: 'Why do I even try? Because I care.', date: '2024-01-15T18:00:00', sender: 'alice', is_from_me: 0 },
    ];
    var conversations = [{ conversationId: 0, conversationMsgs: [{ _id: '1', from: 'alice', date: simplified[0].date, message_text: simplified[0].message_text }] }];

    var result = detectRhetoricalQuestions(simplified, conversations);
    expect(result.bySender.alice[0].reasons).to.include('self-answered');
  });

  it('flags an unanswered wh-question at the end of a conversation', function () {
    var simplified = [
      { _id: '1', message_text: 'Hey',                 date: '2024-01-15T18:00:00', sender: 'bob',   is_from_me: 1 },
      { _id: '2', message_text: 'Why did nobody tell me?', date: '2024-01-15T18:01:00', sender: 'alice', is_from_me: 0 },
    ];
    var conversations = [{
      conversationId: 0,
      conversationMsgs: simplified.map(function(m) { return Object.assign({}, m, { from: m.sender }); }),
    }];

    var result = detectRhetoricalQuestions(simplified, conversations);
    var entry = result.bySender.alice[0];
    expect(entry.reasons).to.include('unanswered-at-end');
  });

  it('does not flag a genuine, answered question', function () {
    var simplified = [
      { _id: '1', message_text: 'What time works for you?', date: '2024-01-15T18:00:00', sender: 'alice', is_from_me: 0 },
      { _id: '2', message_text: '7pm works',                 date: '2024-01-15T18:01:00', sender: 'bob',   is_from_me: 1 },
    ];
    var conversations = [{
      conversationId: 0,
      conversationMsgs: simplified.map(function(m) { return Object.assign({}, m, { from: m.sender }); }),
    }];

    var result = detectRhetoricalQuestions(simplified, conversations);
    expect(result.rhetoricalCount).to.equal(0);
  });
});
