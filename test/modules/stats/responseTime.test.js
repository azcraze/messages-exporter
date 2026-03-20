'use strict';

var { expect } = require('chai');
var { responseTime } = require('../../../modules/stats/responseTime');

// Alternating senders: A→B at 09:00, B→A at 09:10 (10 min gap), A→B at 09:25 (15 min gap)
var MSGS = [
  { date: '2024-01-15T09:00:00', sender: 'A', is_from_me: 0 },
  { date: '2024-01-15T09:10:00', sender: 'B', is_from_me: 1 },
  { date: '2024-01-15T09:25:00', sender: 'A', is_from_me: 0 },
];

describe('responseTime()', function () {

  it('returns overall object with mean, median, count', function () {
    var r = responseTime(MSGS);
    expect(r.overall).to.have.keys(['mean', 'median', 'count']);
  });

  it('counts 2 response events', function () {
    expect(responseTime(MSGS).overall.count).to.equal(2);
  });

  it('overall mean is 12.5 minutes', function () {
    expect(responseTime(MSGS).overall.mean).to.equal(12.5);
  });

  it('overall median is 12.5 minutes', function () {
    expect(responseTime(MSGS).overall.median).to.equal(12.5);
  });

  it('returns per-sender breakdown', function () {
    var r = responseTime(MSGS);
    expect(r.bySender).to.be.an('object');
    // Both A and B responded once each
    expect(Object.keys(r.bySender).length).to.be.at.least(1);
  });

  it('B responded in 10 minutes', function () {
    var r = responseTime(MSGS);
    expect(r.bySender['B'].median).to.equal(10);
  });

  it('returns null overall for fewer than 2 messages', function () {
    var r = responseTime([MSGS[0]]);
    expect(r.overall).to.be.null;
  });

  it('ignores gaps larger than maxGapMinutes', function () {
    var msgs = [
      { date: '2024-01-15T09:00:00', sender: 'A', is_from_me: 0 },
      { date: '2024-01-15T15:00:00', sender: 'B', is_from_me: 1 }, // 360 min gap
    ];
    var r = responseTime(msgs, { maxGapMinutes: 60 });
    expect(r.overall.count).to.equal(0);
  });
});
