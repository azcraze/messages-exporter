'use strict';

var { expect } = require('chai');
var { dayOfWeek } = require('../../../modules/stats/dayOfWeek');

// 2024-01-15 = Monday, 2024-01-16 = Tuesday, 2024-01-20 = Saturday
var MSGS = [
  { date: '2024-01-15T09:00:00' }, // Mon
  { date: '2024-01-15T18:00:00' }, // Mon
  { date: '2024-01-16T09:00:00' }, // Tue
  { date: '2024-01-20T12:00:00' }, // Sat
];

describe('dayOfWeek()', function () {

  it('returns 7 entries in Mon-first order', function () {
    var r = dayOfWeek(MSGS);
    expect(r.byDay).to.have.lengthOf(7);
    expect(r.byDay[0].day).to.equal('Monday');
    expect(r.byDay[6].day).to.equal('Sunday');
  });

  it('Monday has count 2', function () {
    var r = dayOfWeek(MSGS);
    var mon = r.byDay.find(function (d) { return d.day === 'Monday'; });
    expect(mon.count).to.equal(2);
  });

  it('mostActive is Monday', function () {
    expect(dayOfWeek(MSGS).mostActive.day).to.equal('Monday');
  });

  it('all counts sum to message count', function () {
    var r = dayOfWeek(MSGS);
    var sum = r.byDay.reduce(function (s, d) { return s + d.count; }, 0);
    expect(sum).to.equal(MSGS.length);
  });

  it('weekend count is 1 (Saturday)', function () {
    expect(dayOfWeek(MSGS).weekendVsWeekday.weekend).to.equal(1);
  });

  it('weekday count is 3', function () {
    expect(dayOfWeek(MSGS).weekendVsWeekday.weekday).to.equal(3);
  });

  it('returns safe default for empty input', function () {
    var r = dayOfWeek([]);
    expect(r.byDay).to.deep.equal([]);
    expect(r.mostActive).to.be.null;
  });
});
