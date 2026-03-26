'use strict';

var { expect } = require('chai');
var { timeOfDay } = require('../../../modules/stats/timeOfDay');

// Craft 3 messages at 9 AM, 9 AM, 14 PM
var MSGS = [
  { message_text: 'a', date: '2024-01-15T09:00:00' },
  { message_text: 'b', date: '2024-01-15T09:30:00' },
  { message_text: 'c', date: '2024-01-15T14:00:00' },
];

describe('timeOfDay()', function () {

  it('returns 24 hourly entries', function () {
    expect(timeOfDay(MSGS).byHour).to.have.lengthOf(24);
  });

  it('hour 9 has count 2', function () {
    var r = timeOfDay(MSGS);
    expect(r.byHour[9].count).to.equal(2);
  });

  it('hour 14 has count 1', function () {
    var r = timeOfDay(MSGS);
    expect(r.byHour[14].count).to.equal(1);
  });

  it('peakHour is hour 9', function () {
    expect(timeOfDay(MSGS).peakHour.hour).to.equal(9);
  });

  it('all counts sum to message count', function () {
    var r = timeOfDay(MSGS);
    var sum = r.byHour.reduce(function (s, h) { return s + h.count; }, 0);
    expect(sum).to.equal(MSGS.length);
  });

  it('pct values sum to ~100', function () {
    var r = timeOfDay(MSGS);
    var sum = r.byHour.reduce(function (s, h) { return s + h.pct; }, 0);
    expect(sum).to.be.closeTo(100, 0.5);
  });

  it('returns sensible empty result for empty input', function () {
    var r = timeOfDay([]);
    expect(r.byHour).to.deep.equal([]);
    expect(r.peakHour).to.be.null;
  });

  it('periods object has required keys', function () {
    var r = timeOfDay(MSGS);
    expect(r.periods).to.have.keys(['morning', 'afternoon', 'evening', 'night']);
  });
});
