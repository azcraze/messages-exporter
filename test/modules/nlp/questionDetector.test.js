'use strict';

var { expect } = require('chai');
var { detectQuestions, isQuestion } = require('../../../modules/nlp/questionDetector');

describe('isQuestion()', function () {
  it('detects a "?"-terminated message', function () { expect(isQuestion('Coming tonight?')).to.be.true; });
  it('detects a wh-led message without a "?"', function () { expect(isQuestion('Why are you like this')).to.be.true; });
  it('rejects a plain statement', function () { expect(isQuestion('I am going now.')).to.be.false; });
  it('rejects empty/null', function () { expect(isQuestion('')).to.be.false; expect(isQuestion(null)).to.be.false; });
});

describe('detectQuestions()', function () {
  var simplified = [
    { _id: '1', message_text: 'Are you coming to dinner?', date: '2024-01-15T18:30:00', sender: 'alice', is_from_me: 0 },
    { _id: '2', message_text: 'Yes, on my way!',            date: '2024-01-15T18:31:00', sender: 'bob',   is_from_me: 1 },
    { _id: '3', message_text: 'Great, see you then',        date: '2024-01-15T18:32:00', sender: 'alice', is_from_me: 0 },
  ];
  var conversations = [
    {
      conversationId: 0,
      conversationMsgs: [
        { _id: '1', from: 'alice', date: '2024-01-15T18:30:00', message_text: 'Are you coming to dinner?' },
        { _id: '2', from: 'bob',   date: '2024-01-15T18:31:00', message_text: 'Yes, on my way!' },
        { _id: '3', from: 'alice', date: '2024-01-15T18:32:00', message_text: 'Great, see you then' },
      ],
    },
  ];

  it('returns { total: 0, bySender: {} } for non-array input', function () {
    expect(detectQuestions(null, conversations)).to.deep.equal({ total: 0, bySender: {} });
  });

  it('finds exactly one question and groups it by sender', function () {
    var result = detectQuestions(simplified, conversations);
    expect(result.total).to.equal(1);
    expect(result.bySender.alice).to.have.lengthOf(1);
  });

  it('enriches the question with conversation context and following messages', function () {
    var result = detectQuestions(simplified, conversations);
    var q = result.bySender.alice[0];
    expect(q.conversationId).to.equal(0);
    expect(q.participants).to.include.members(['alice', 'bob']);
    expect(q.followingMessages).to.have.lengthOf(2);
    expect(q.followingMessages[0].sender).to.equal('bob');
  });
});
