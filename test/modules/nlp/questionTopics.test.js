'use strict';

var { expect } = require('chai');
var { tagQuestionTopics } = require('../../../modules/nlp/questionTopics');

describe('tagQuestionTopics()', function () {

  it('returns empty result for non-array input', function () {
    expect(tagQuestionTopics(null)).to.deep.equal({ total: 0, tagged: [], clusters: [] });
  });

  it('tags each detected question with keywords', function () {
    var simplified = [
      { _id: '1', message_text: 'What restaurant should we try tonight?', date: '2024-01-15T18:00:00', sender: 'alice' },
      { _id: '2', message_text: 'Not sure, pizza or sushi?',               date: '2024-01-15T18:01:00', sender: 'bob' },
      { _id: '3', message_text: 'Sounds good either way',                  date: '2024-01-15T18:02:00', sender: 'alice' },
    ];

    var result = tagQuestionTopics(simplified);
    expect(result.total).to.equal(2);
    expect(result.tagged).to.have.lengthOf(2);
    result.tagged.forEach(function(q) { expect(q.keywords).to.be.an('array'); });
  });

  it('clusters two similar questions together', function () {
    var simplified = [
      { _id: '1', message_text: 'What restaurant should we try for dinner tonight?', date: '2024-01-15T18:00:00', sender: 'alice' },
      { _id: '2', message_text: 'What restaurant should we try for dinner tomorrow?', date: '2024-01-16T18:00:00', sender: 'bob' },
      { _id: '3', message_text: 'Did you finish the quarterly budget report?', date: '2024-01-17T18:00:00', sender: 'alice' },
    ];

    var result = tagQuestionTopics(simplified, { similarityThreshold: 0.2 });
    expect(result.clusters.length).to.be.at.least(1);
    var cluster = result.clusters[0];
    expect(cluster.members).to.include.members(['1', '2']);
  });
});
