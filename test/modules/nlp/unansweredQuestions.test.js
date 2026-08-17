'use strict';

var { expect } = require('chai');
var { findUnansweredQuestions } = require('../../../modules/nlp/unansweredQuestions');

describe('findUnansweredQuestions()', function () {
  var simplified = [
    { _id: '1', message_text: 'Are you coming?', date: '2024-01-15T18:00:00', sender: 'alice', is_from_me: 0 },
    { _id: '2', message_text: 'Yes!',             date: '2024-01-15T18:01:00', sender: 'bob',   is_from_me: 1 },
    { _id: '3', message_text: 'What time?',       date: '2024-01-15T18:02:00', sender: 'alice', is_from_me: 0 },
  ];
  var conversations = [{
    conversationId: 0,
    conversationMsgs: simplified.map(function(m) { return Object.assign({}, m, { from: m.sender }); }),
  }];

  it('reports the answered question as answered and the trailing question as unanswered', function () {
    var result = findUnansweredQuestions(simplified, conversations);
    expect(result.total).to.equal(2);
    expect(result.unansweredCount).to.equal(1);
    expect(result.bySender.alice).to.have.lengthOf(1);
    expect(result.bySender.alice[0]._id).to.equal('3');
  });

  it('does not group anything under a sender whose questions were all answered', function () {
    var result = findUnansweredQuestions(simplified, conversations);
    expect(result.bySender.bob).to.be.undefined;
  });
});
