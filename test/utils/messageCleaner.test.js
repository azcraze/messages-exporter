'use strict';

var { expect } = require('chai');
var { cleanMessage } = require('../../utils/messageCleaner');

describe('messageCleaner.cleanMessage()', function () {

  it('assigns a UUID _id to every message', function () {
    var out = cleanMessage({ message_text: 'hello', date: '2024-01-01T00:00:00', is_from_me: 0 });
    expect(out._id).to.be.a('string').and.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('generates a different _id for each call', function () {
    var a = cleanMessage({ message_text: 'x', date: '2024-01-01', is_from_me: 0 });
    var b = cleanMessage({ message_text: 'x', date: '2024-01-01', is_from_me: 0 });
    expect(a._id).to.not.equal(b._id);
  });

  describe('message_text', function () {
    it('keeps a string value unchanged', function () {
      var out = cleanMessage({ message_text: 'hello world' });
      expect(out.message_text).to.equal('hello world');
    });

    it('coerces non-string to empty string', function () {
      var out = cleanMessage({ message_text: 42 });
      expect(out.message_text).to.equal('');
    });

    it('defaults to empty string when missing', function () {
      var out = cleanMessage({});
      expect(out.message_text).to.equal('');
    });
  });

  describe('is_from_me', function () {
    it('keeps integer 1', function () {
      expect(cleanMessage({ is_from_me: 1 }).is_from_me).to.equal(1);
    });

    it('keeps integer 0', function () {
      expect(cleanMessage({ is_from_me: 0 }).is_from_me).to.equal(0);
    });

    it('defaults to 0 for non-integer values', function () {
      expect(cleanMessage({ is_from_me: true }).is_from_me).to.equal(0);
      expect(cleanMessage({ is_from_me: '1' }).is_from_me).to.equal(0);
      expect(cleanMessage({}).is_from_me).to.equal(0);
    });
  });

  describe('date', function () {
    it('keeps a valid ISO date string', function () {
      var out = cleanMessage({ date: '2024-06-15T12:00:00' });
      expect(out.date).to.equal('2024-06-15T12:00:00');
    });

    it('defaults to "Unknown Date" when missing', function () {
      expect(cleanMessage({}).date).to.equal('Unknown Date');
    });

    it('defaults to "Unknown Date" for blank string', function () {
      expect(cleanMessage({ date: '   ' }).date).to.equal('Unknown Date');
    });
  });

  describe('sender', function () {
    it('uses provided sender', function () {
      expect(cleanMessage({ sender: '+15551234567' }).sender).to.equal('+15551234567');
    });

    it('defaults to "Unknown Sender"', function () {
      expect(cleanMessage({}).sender).to.equal('Unknown Sender');
    });
  });

  describe('service', function () {
    it('keeps string service', function () {
      expect(cleanMessage({ service: 'iMessage' }).service).to.equal('iMessage');
      expect(cleanMessage({ service: 'SMS' }).service).to.equal('SMS');
    });

    it('sets null when not a string', function () {
      expect(cleanMessage({}).service).to.be.null;
      expect(cleanMessage({ service: 42 }).service).to.be.null;
    });
  });

  describe('attachments', function () {
    it('maps attachment objects to {path, type}', function () {
      var out = cleanMessage({ attachments: [{ path: '/a.jpg', type: 'image/jpeg', extra: 'ignore' }] });
      expect(out.attachments).to.deep.equal([{ path: '/a.jpg', type: 'image/jpeg' }]);
    });

    it('defaults to empty array when missing or non-array', function () {
      expect(cleanMessage({}).attachments).to.deep.equal([]);
      expect(cleanMessage({ attachments: null }).attachments).to.deep.equal([]);
    });

    it('fills missing path/type with empty strings', function () {
      var out = cleanMessage({ attachments: [{}] });
      expect(out.attachments[0]).to.deep.equal({ path: '', type: '' });
    });
  });

  describe('message_segments', function () {
    it('maps segment objects retaining allowed fields', function () {
      var seg = { type: 'text', text: 'hi', file_type: null, path: null, reaction_type: null, extra: 'drop' };
      var out = cleanMessage({ message_segments: [seg] });
      expect(out.message_segments[0]).to.deep.equal({ type: 'text', text: 'hi', file_type: null, path: null, reaction_type: null });
    });

    it('defaults to empty array', function () {
      expect(cleanMessage({}).message_segments).to.deep.equal([]);
    });
  });

  describe('participants / receiver', function () {
    it('keeps array values', function () {
      var out = cleanMessage({ participants: ['a', 'b'], receiver: ['c'] });
      expect(out.participants).to.deep.equal(['a', 'b']);
      expect(out.receiver).to.deep.equal(['c']);
    });

    it('defaults to empty arrays', function () {
      expect(cleanMessage({}).participants).to.deep.equal([]);
      expect(cleanMessage({}).receiver).to.deep.equal([]);
    });
  });
});
