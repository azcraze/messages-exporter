'use strict';

var { expect } = require('chai');
var { streaks } = require('../../../modules/stats/streaks');

// 4 consecutive days then a 2-day gap then 2 more days
var MSGS = [
  { date: '2024-01-01T09:00:00' },
  { date: '2024-01-02T09:00:00' },
  { date: '2024-01-03T09:00:00' },
  { date: '2024-01-04T09:00:00' },
  // gap: 5th and 6th
  { date: '2024-01-07T09:00:00' },
  { date: '2024-01-08T09:00:00' },
];

describe('streaks()', function () {

  it('finds longestStreak of 4 days', function () {
    expect(streaks(MSGS).longestStreak.days).to.equal(4);
  });

  it('longestStreak starts on 2024-01-01', function () {
    expect(streaks(MSGS).longestStreak.startDate).to.equal('2024-01-01');
  });

  it('currentStreak is 2 days (last run)', function () {
    expect(streaks(MSGS).currentStreak.days).to.equal(2);
  });

  it('longestGap is 2 days (Jan 5–6)', function () {
    expect(streaks(MSGS).longestGap.days).to.equal(2);
  });

  it('totalActiveDays is 6', function () {
    expect(streaks(MSGS).totalActiveDays).to.equal(6);
  });

  it('deduplicates same-day messages', function () {
    var msgs = [
      { date: '2024-02-01T08:00:00' },
      { date: '2024-02-01T20:00:00' }, // same day
      { date: '2024-02-02T09:00:00' },
    ];
    var r = streaks(msgs);
    expect(r.totalActiveDays).to.equal(2);
    expect(r.longestStreak.days).to.equal(2);
  });

  it('returns null fields for empty input', function () {
    var r = streaks([]);
    expect(r.longestStreak).to.be.null;
    expect(r.currentStreak).to.be.null;
    expect(r.totalActiveDays).to.equal(0);
  });

  it('single-day input has streak of 1 and no gap', function () {
    var r = streaks([{ date: '2024-01-01T09:00:00' }]);
    expect(r.longestStreak.days).to.equal(1);
    expect(r.longestGap).to.be.null;
  });
});
