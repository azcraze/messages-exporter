'use strict';

var { expect } = require('chai');
var { parseAttributedBody } = require('../../lib/parse-attributed-body');

describe('parseAttributedBody()', function () {

  it('returns null for null input', function () {
    expect(parseAttributedBody(null)).to.be.null;
  });

  it('returns null for undefined input', function () {
    expect(parseAttributedBody(undefined)).to.be.null;
  });

  it('returns null for empty Buffer', function () {
    expect(parseAttributedBody(Buffer.alloc(0))).to.be.null;
  });

  it('returns null for non-Buffer input', function () {
    expect(parseAttributedBody('not a buffer')).to.be.null;
    expect(parseAttributedBody(42)).to.be.null;
    expect(parseAttributedBody({})).to.be.null;
  });

  it('returns null for a corrupt / random buffer', function () {
    var garbage = Buffer.from([0x00, 0x01, 0x02, 0xFF, 0xFE, 0xAB]);
    expect(parseAttributedBody(garbage)).to.be.null;
  });

  it('returns null for a Buffer containing valid JSON (not bplist)', function () {
    var jsonBuf = Buffer.from('{"key":"value"}');
    expect(parseAttributedBody(jsonBuf)).to.be.null;
  });
});
