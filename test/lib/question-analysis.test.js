'use strict';

var { expect } = require('chai');
var {
  classifyQuestion,
  linkConversationContext,
  resolveSender,
  followingMessages,
  formatTime,
} = require('../../lib/question-analysis');

describe('classifyQuestion()', function () {

  it('is not a question for empty/null/non-string input', function () {
    expect(classifyQuestion('').isQuestion).to.be.false;
    expect(classifyQuestion(null).isQuestion).to.be.false;
    expect(classifyQuestion(undefined).isQuestion).to.be.false;
    expect(classifyQuestion(42).isQuestion).to.be.false;
  });

  it('classifies a wh-question', function () {
    var r = classifyQuestion('What time are we leaving?');
    expect(r.isQuestion).to.be.true;
    expect(r.type).to.equal('wh');
  });

  it('classifies a yes/no question', function () {
    var r = classifyQuestion('Are you coming tonight?');
    expect(r.isQuestion).to.be.true;
    expect(r.type).to.equal('yes-no');
  });

  it('classifies a tag question', function () {
    var r = classifyQuestion("You're coming, right?");
    expect(r.isQuestion).to.be.true;
    expect(r.type).to.equal('tag');
  });

  it('classifies a choice question', function () {
    var r = classifyQuestion('Pizza or tacos?');
    expect(r.isQuestion).to.be.true;
    expect(r.type).to.equal('choice');
  });

  it('classifies a rhetorical-cue question', function () {
    var r = classifyQuestion('Why me?');
    expect(r.isQuestion).to.be.true;
    expect(r.type).to.equal('rhetorical-cue');
  });

  it('classifies a plain non-pattern question as "other"', function () {
    var r = classifyQuestion('Really?');
    // "Really?" matches the rhetorical-cue phrase list
    expect(r.isQuestion).to.be.true;
  });

  it('is not a question for a plain statement', function () {
    var r = classifyQuestion('I am going to the store.');
    expect(r.isQuestion).to.be.false;
    expect(r.type).to.be.null;
  });

  it('assigns higher confidence to a "?"-terminated wh-question than a bare wh-lead-in', function () {
    var withMark    = classifyQuestion('Why are you here?');
    var withoutMark = classifyQuestion('Why are you here');
    expect(withMark.confidence).to.be.above(withoutMark.confidence);
  });

  it('confidence is 0 for a non-question', function () {
    expect(classifyQuestion('This is fine.').confidence).to.equal(0);
  });
});

describe('resolveSender()', function () {
  it('prefers .sender', function () { expect(resolveSender({ sender: 'a', from: 'b' })).to.equal('a'); });
  it('falls back to .from', function () { expect(resolveSender({ from: 'b' })).to.equal('b'); });
  it('falls back to is_from_me', function () {
    expect(resolveSender({ is_from_me: 1 })).to.equal('me');
    expect(resolveSender({ is_from_me: 0 })).to.equal('other');
  });
  it('returns "" for null/undefined', function () { expect(resolveSender(null)).to.equal(''); });
});

describe('formatTime()', function () {
  it('formats an ISO date as HH:mm', function () {
    expect(formatTime('2024-01-15T18:30:00')).to.equal('18:30');
  });
  it('returns "" for falsy input', function () { expect(formatTime('')).to.equal(''); });
});

describe('linkConversationContext()', function () {
  var conversations = [
    {
      conversationId: 0,
      conversationMsgs: [
        { _id: '1', from: 'alice', message_text: 'hi' },
        { _id: '2', from: 'bob',   message_text: 'hey' },
      ],
    },
  ];

  it('links each message to its conversation, participants, and index', function () {
    var meta = linkConversationContext([], conversations);
    expect(meta['1'].conversationId).to.equal(0);
    expect(meta['1'].participants).to.include.members(['alice', 'bob']);
    expect(meta['1'].indexInConvo).to.equal(0);
    expect(meta['2'].indexInConvo).to.equal(1);
  });

  it('returns {} for non-array conversations', function () {
    expect(linkConversationContext([], null)).to.deep.equal({});
  });
});

describe('followingMessages()', function () {
  var conversations = [
    {
      conversationId: 0,
      conversationMsgs: [
        { _id: '1', from: 'alice', date: 'd1', message_text: 'one' },
        { _id: '2', from: 'bob',   date: 'd2', message_text: 'two' },
        { _id: '3', from: 'alice', date: 'd3', message_text: 'three' },
      ],
    },
  ];
  var meta = linkConversationContext([], conversations);

  it('returns up to n following messages', function () {
    var following = followingMessages(meta['1'], 3);
    expect(following).to.have.lengthOf(2);
    expect(following[0].message_text).to.equal('two');
  });

  it('returns [] when meta is missing', function () {
    expect(followingMessages(undefined, 3)).to.deep.equal([]);
  });

  it('returns [] when there is nothing left in the conversation', function () {
    expect(followingMessages(meta['3'], 3)).to.deep.equal([]);
  });
});
