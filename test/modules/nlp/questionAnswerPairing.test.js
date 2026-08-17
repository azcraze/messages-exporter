'use strict';

var { expect } = require('chai');
var { pairQuestionsWithAnswers } = require('../../../modules/nlp/questionAnswerPairing');

describe('pairQuestionsWithAnswers()', function () {

  it('returns an empty result for non-array input', function () {
    expect(pairQuestionsWithAnswers(null, [])).to.deep.equal({ total: 0, pairedCount: 0, unpairedCount: 0, pairs: [] });
  });

  it('pairs a question with the next different-sender message ("window" method)', function () {
    var simplified = [
      { _id: '1', message_text: 'Are you coming?', date: '2024-01-15T18:00:00', sender: 'alice', is_from_me: 0 },
      { _id: '2', message_text: 'Yes!',             date: '2024-01-15T18:01:00', sender: 'bob',   is_from_me: 1 },
    ];
    var conversations = [{
      conversationId: 0,
      conversationMsgs: [
        { _id: '1', from: 'alice', date: '2024-01-15T18:00:00', message_text: 'Are you coming?' },
        { _id: '2', from: 'bob',   date: '2024-01-15T18:01:00', message_text: 'Yes!' },
      ],
    }];

    var result = pairQuestionsWithAnswers(simplified, conversations);
    expect(result.total).to.equal(1);
    expect(result.pairedCount).to.equal(1);
    expect(result.pairs[0].answer.sender).to.equal('bob');
    expect(result.pairs[0].method).to.equal('window');
    expect(result.pairs[0].latencyMinutes).to.equal(1);
  });

  it('prefers the "thread" method over the window when a reply thread exists', function () {
    var simplified = [
      { _id: '1', message_text: 'Are you coming?', date: '2024-01-15T18:00:00', sender: 'alice', is_from_me: 0, thread_originator_guid: null },
      { _id: '2', message_text: 'unrelated aside',  date: '2024-01-15T18:00:30', sender: 'alice', is_from_me: 0 },
      { _id: '3', message_text: 'Yes!',              date: '2024-01-15T18:05:00', sender: 'bob',   is_from_me: 1, thread_originator_guid: 'GUID-1' },
    ];
    // Message 1 is the thread root: give it the same originator guid as its reply.
    simplified[0].thread_originator_guid = 'GUID-1';

    var conversations = [{
      conversationId: 0,
      conversationMsgs: simplified.map(function(m) { return Object.assign({}, m, { from: m.sender }); }),
    }];

    var result = pairQuestionsWithAnswers(simplified, conversations);
    var pair = result.pairs.find(function(p) { return p.question._id === '1'; });
    expect(pair.method).to.equal('thread');
    expect(pair.answer._id).to.equal('3');
  });

  it('leaves a question unpaired when no different-sender reply follows within the window', function () {
    var simplified = [
      { _id: '1', message_text: 'Are you coming?', date: '2024-01-15T18:00:00', sender: 'alice', is_from_me: 0 },
      { _id: '2', message_text: 'me too',            date: '2024-01-15T18:01:00', sender: 'alice', is_from_me: 0 },
    ];
    var conversations = [{
      conversationId: 0,
      conversationMsgs: [
        { _id: '1', from: 'alice', date: '2024-01-15T18:00:00', message_text: 'Are you coming?' },
        { _id: '2', from: 'alice', date: '2024-01-15T18:01:00', message_text: 'me too' },
      ],
    }];

    var result = pairQuestionsWithAnswers(simplified, conversations);
    expect(result.unpairedCount).to.equal(1);
    expect(result.pairs[0].answer).to.be.null;
  });

  it('respects maxGapMinutes for the window method', function () {
    var simplified = [
      { _id: '1', message_text: 'Are you coming?', date: '2024-01-15T18:00:00', sender: 'alice', is_from_me: 0 },
      { _id: '2', message_text: 'Yes!',             date: '2024-01-16T18:00:00', sender: 'bob',   is_from_me: 1 }, // 24h later
    ];
    var conversations = [{
      conversationId: 0,
      conversationMsgs: [
        { _id: '1', from: 'alice', date: '2024-01-15T18:00:00', message_text: 'Are you coming?' },
        { _id: '2', from: 'bob',   date: '2024-01-16T18:00:00', message_text: 'Yes!' },
      ],
    }];

    var result = pairQuestionsWithAnswers(simplified, conversations, { maxGapMinutes: 60 });
    expect(result.pairs[0].answer).to.be.null;
  });
});
