/**
 * modules/nlp/entityExtractor.js
 *
 * Named-entity recognition using the compromise library.
 * Extracts people, places, and organisations mentioned across messages.
 *
 * extractEntities(messages) → {
 *   people:        Array<{ entity, count }>,
 *   places:        Array<{ entity, count }>,
 *   organizations: Array<{ entity, count }>,
 * }
 */

var nlp = require('compromise');

var TOP_N = 30;

function tally(map) {
  return Object.keys(map)
    .map(function(k) { return { entity: k, count: map[k] }; })
    .sort(function(a, b) { return b.count - a.count; })
    .slice(0, TOP_N);
}

function extractEntities(messages) {
  if (!Array.isArray(messages)) {
    return { people: [], places: [], organizations: [] };
  }

  var people = {};
  var places = {};
  var orgs   = {};

  messages.forEach(function(msg) {
    if (!msg || !msg.message_text) return;

    var doc = nlp(msg.message_text);

    doc.people().json().forEach(function(t) {
      var e = t.text.trim();
      if (e.length > 1) people[e] = (people[e] || 0) + 1;
    });
    doc.places().json().forEach(function(t) {
      var e = t.text.trim();
      if (e.length > 1) places[e] = (places[e] || 0) + 1;
    });
    doc.organizations().json().forEach(function(t) {
      var e = t.text.trim();
      if (e.length > 1) orgs[e] = (orgs[e] || 0) + 1;
    });
  });

  return {
    people:        tally(people),
    places:        tally(places),
    organizations: tally(orgs),
  };
}

module.exports = { extractEntities };
