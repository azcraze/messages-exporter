'use strict';

var { expect } = require('chai');
var Converter  = require('../../lib/converter');

// Instantiate without progress bar (pass a stub options object)
function makeConverter() {
  return new Converter({ showProgress: false });
}

describe('Converter', function () {

  // -------------------------------------------------------------------------
  // formatAddress
  // -------------------------------------------------------------------------
  describe('formatAddress()', function () {
    var conv;
    beforeEach(function () { conv = makeConverter(); });

    it('returns null for "E:" prefix with no address', function () {
      expect(conv.formatAddress('E:')).to.be.null;
    });

    it('strips "E:" prefix and keeps the email', function () {
      expect(conv.formatAddress('E:user@example.com')).to.equal('user@example.com');
    });

    it('normalises a valid US phone number to E.164', function () {
      var result = conv.formatAddress('+15551234567');
      expect(result).to.match(/^\+1\d{10}$/);
    });

    it('passes through an unrecognised string unchanged', function () {
      // A short non-phone, non-email string that phone lib cannot normalise
      expect(conv.formatAddress('unknown-handle')).to.equal('unknown-handle');
    });

    it('returns the value unchanged for falsy input', function () {
      expect(conv.formatAddress(null)).to.be.null;
      expect(conv.formatAddress(undefined)).to.be.undefined;
      expect(conv.formatAddress('')).to.equal('');
    });
  });

  // -------------------------------------------------------------------------
  // internalIdentifier
  // -------------------------------------------------------------------------
  describe('internalIdentifier()', function () {
    var conv;
    beforeEach(function () { conv = makeConverter(); });

    it('returns a 40-char hex SHA1 string', function () {
      var row = { address: '+15551234567', date: '2024-01-15', message_text: 'hi', service: 'iMessage' };
      var id  = conv.internalIdentifier(row);
      expect(id).to.be.a('string').with.lengthOf(40).and.match(/^[0-9a-f]+$/);
    });

    it('returns the same value for the same input', function () {
      var row = { address: 'a', date: 'b', message_text: 'c', service: 'd' };
      expect(conv.internalIdentifier(row)).to.equal(conv.internalIdentifier(row));
    });

    it('returns different values for different inputs', function () {
      var r1 = { address: 'a', date: 'b', message_text: 'c', service: 'd' };
      var r2 = { address: 'a', date: 'b', message_text: 'X', service: 'd' };
      expect(conv.internalIdentifier(r1)).to.not.equal(conv.internalIdentifier(r2));
    });
  });

  // -------------------------------------------------------------------------
  // uniqueId
  // -------------------------------------------------------------------------
  describe('uniqueId()', function () {
    var conv;
    beforeEach(function () { conv = makeConverter(); });

    it('returns a 40-char hex SHA1 string', function () {
      var msg = { sender: 'a', receiver: 'b', date: 'c', message_text: 'd', service: 'e' };
      expect(conv.uniqueId(msg)).to.be.a('string').with.lengthOf(40).and.match(/^[0-9a-f]+$/);
    });

    it('is deterministic for the same message', function () {
      var msg = { sender: 's', receiver: 'r', date: 'd', message_text: 't', service: 'svc' };
      expect(conv.uniqueId(msg)).to.equal(conv.uniqueId(msg));
    });

    it('differs when any field changes', function () {
      var base = { sender: 's', receiver: 'r', date: 'd', message_text: 't', service: 'svc' };
      var diff = Object.assign({}, base, { message_text: 'different' });
      expect(conv.uniqueId(base)).to.not.equal(conv.uniqueId(diff));
    });
  });
});
