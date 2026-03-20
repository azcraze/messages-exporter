'use strict';

var { expect } = require('chai');
var chaiAsPromised = require('chai-as-promised');
require('chai').use(chaiAsPromised.default || chaiAsPromised);

var QueryEngine = require('../../lib/query-engine');

var MSGS = [
  { message_text: 'Hello world',   date: '2024-01-10T09:00:00', sender: '+1555', is_from_me: 0, participants: ['+1555'] },
  { message_text: 'Good morning',  date: '2024-02-01T07:00:00', sender: 'me',    is_from_me: 1, participants: ['+1555'] },
  { message_text: 'See you soon',  date: '2024-03-15T18:00:00', sender: '+1555', is_from_me: 0, participants: ['+1555'] },
  { message_text: 'Helo typo',     date: '2024-03-20T10:00:00', sender: 'me',    is_from_me: 1, participants: ['+1555'] },
  { message_text: 'Final message', date: '2024-04-01T08:00:00', sender: '+1999', is_from_me: 0, participants: ['+1999'] },
];

describe('QueryEngine', function () {

  describe('constructor', function () {
    it('accepts an array', function () {
      expect(new QueryEngine(MSGS).run()).to.have.lengthOf(MSGS.length);
    });
    it('treats non-array as empty', function () {
      expect(new QueryEngine(null).run()).to.deep.equal([]);
    });
    it('can be called without new', function () {
      expect(QueryEngine(MSGS).run()).to.have.lengthOf(MSGS.length);
    });
  });

  describe('.search()', function () {
    it('finds exact substring (case-insensitive)', function () {
      var r = new QueryEngine(MSGS).search('hello').run();
      expect(r).to.have.lengthOf(1);
      expect(r[0].message_text).to.equal('Hello world');
    });
    it('returns all when no match', function () {
      // search with no match returns 0 results
      expect(new QueryEngine(MSGS).search('zzznomatch').run()).to.have.lengthOf(0);
    });
    it('is a no-op when text is empty/falsy', function () {
      expect(new QueryEngine(MSGS).search('').run()).to.have.lengthOf(MSGS.length);
      expect(new QueryEngine(MSGS).search(null).run()).to.have.lengthOf(MSGS.length);
    });
  });

  describe('.dateRange()', function () {
    it('filters by start date (inclusive)', function () {
      var r = new QueryEngine(MSGS).dateRange('2024-03-01', null).run();
      expect(r.every(function (m) { return m.date >= '2024-03-01'; })).to.be.true;
    });
    it('filters by end date (inclusive)', function () {
      var r = new QueryEngine(MSGS).dateRange(null, '2024-01-31').run();
      expect(r.every(function (m) { return m.date <= '2024-01-31T23:59:59'; })).to.be.true;
    });
    it('returns subset for bounded range', function () {
      var r = new QueryEngine(MSGS).dateRange('2024-02-01', '2024-03-20').run();
      expect(r.length).to.be.at.least(1).and.at.most(MSGS.length - 1);
    });
  });

  describe('.participant()', function () {
    it('keeps messages from the given sender', function () {
      var r = new QueryEngine(MSGS).participant('+1555').run();
      expect(r.length).to.be.at.least(1);
      r.forEach(function (m) {
        var inSender = m.sender === '+1555';
        var inParticipants = Array.isArray(m.participants) && m.participants.includes('+1555');
        expect(inSender || inParticipants).to.be.true;
      });
    });
    it('returns empty for unknown participant', function () {
      expect(new QueryEngine(MSGS).participant('+9999999').run()).to.have.lengthOf(0);
    });
  });

  describe('.pattern()', function () {
    it('matches with a string pattern (default case-insensitive)', function () {
      var r = new QueryEngine(MSGS).pattern('^hel').run();
      expect(r.length).to.be.at.least(1);
      r.forEach(function (m) {
        expect(m.message_text).to.match(/^hel/i);
      });
    });
    it('accepts a RegExp object', function () {
      var r = new QueryEngine(MSGS).pattern(/world$/i).run();
      expect(r).to.have.lengthOf(1);
    });
    it('is a no-op for falsy pattern', function () {
      expect(new QueryEngine(MSGS).pattern(null).run()).to.have.lengthOf(MSGS.length);
    });
  });

  describe('.limit()', function () {
    it('limits result length', function () {
      expect(new QueryEngine(MSGS).limit(2).run()).to.have.lengthOf(2);
    });
    it('returns all when limit > length', function () {
      expect(new QueryEngine(MSGS).limit(1000).run()).to.have.lengthOf(MSGS.length);
    });
  });

  describe('.sort()', function () {
    it('sorts ascending by date', function () {
      var r = new QueryEngine(MSGS).sort('date', 'asc').run();
      for (var i = 1; i < r.length; i++) {
        expect(r[i - 1].date <= r[i].date).to.be.true;
      }
    });
    it('sorts descending by date', function () {
      var r = new QueryEngine(MSGS).sort('date', 'desc').run();
      for (var i = 1; i < r.length; i++) {
        expect(r[i - 1].date >= r[i].date).to.be.true;
      }
    });
    it('sort + limit returns correct top element', function () {
      var r = new QueryEngine(MSGS).sort('date', 'desc').limit(1).run();
      expect(r[0].message_text).to.equal('Final message');
    });
  });

  describe('.count()', function () {
    it('returns the number of matching messages', function () {
      expect(new QueryEngine(MSGS).search('hello').count()).to.equal(1);
    });
  });

  describe('chaining', function () {
    it('can chain multiple filters', function () {
      var r = new QueryEngine(MSGS)
        .participant('+1555')
        .dateRange('2024-01-01', '2024-02-28')
        .run();
      expect(r.length).to.be.at.least(1);
      r.forEach(function (m) {
        expect(m.date <= '2024-02-28T23:59:59').to.be.true;
      });
    });
  });

  describe('.run() with async filter', function () {
    it('throws when fuzzy filter used with run()', function () {
      expect(function () {
        new QueryEngine(MSGS).fuzzy('hello').run();
      }).to.throw(/runAsync/);
    });
  });

  describe('.runAsync()', function () {
    it('returns a Promise', function () {
      var result = new QueryEngine(MSGS).runAsync();
      expect(result).to.be.instanceOf(Promise);
      return result;
    });

    it('resolves to full array when no filters', function () {
      return expect(new QueryEngine(MSGS).runAsync()).to.eventually.have.lengthOf(MSGS.length);
    });

    it('fuzzy search resolves to an array', function () {
      return new QueryEngine(MSGS).fuzzy('hello').runAsync().then(function (r) {
        expect(r).to.be.an('array');
        expect(r.length).to.be.at.least(1);
      });
    });
  });
});
