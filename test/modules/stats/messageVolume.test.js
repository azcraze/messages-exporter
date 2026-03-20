'use strict';

var { expect } = require('chai');
var { messageVolume } = require('../../../modules/stats/messageVolume');
var MSGS = require('../../fixtures/messages.json');

describe('messageVolume()', function () {

  it('returns total matching input length', function () {
    expect(messageVolume(MSGS).total).to.equal(MSGS.length);
  });

  it('returns zero totals for empty array', function () {
    var r = messageVolume([]);
    expect(r.total).to.equal(0);
    expect(r.byDay).to.deep.equal([]);
  });

  it('provides a dateRange with first, last, and spanDays', function () {
    var r = messageVolume(MSGS);
    expect(r.dateRange).to.be.an('object');
    expect(r.dateRange.first).to.be.a('string');
    expect(r.dateRange.last).to.be.a('string');
    expect(r.dateRange.spanDays).to.be.a('number').and.at.least(1);
  });

  it('byDay sums match total', function () {
    var r = messageVolume(MSGS);
    var sum = r.byDay.reduce(function (s, d) { return s + d.count; }, 0);
    expect(sum).to.equal(MSGS.length);
  });

  it('byWeek entries have weekStart and count', function () {
    var r = messageVolume(MSGS);
    r.byWeek.forEach(function (w) {
      expect(w).to.have.keys(['weekStart', 'count']);
    });
  });

  it('byMonth entries have month and count', function () {
    var r = messageVolume(MSGS);
    r.byMonth.forEach(function (m) {
      expect(m).to.have.keys(['month', 'count']);
    });
  });

  it('averages are positive numbers', function () {
    var r = messageVolume(MSGS);
    expect(r.averages.perDay).to.be.above(0);
    expect(r.averages.perWeek).to.be.above(0);
    expect(r.averages.perMonth).to.be.above(0);
  });

  it('handles messages with invalid dates gracefully', function () {
    var bad = [{ message_text: 'hi', date: 'not-a-date' }, MSGS[0]];
    var r = messageVolume(bad);
    expect(r.total).to.equal(2);
    expect(r.byDay.length).to.be.at.least(1); // only the valid date is bucketed
  });
});
