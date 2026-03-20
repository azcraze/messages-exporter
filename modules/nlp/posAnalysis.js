/**
 * modules/nlp/posAnalysis.js
 *
 * Part-of-speech distribution and top-word lists using the compromise library.
 *
 * posAnalysis(messages) → {
 *   distribution: { nouns, verbs, adjectives, adverbs, pronouns },
 *   topNouns:       Array<{ word, count }>,
 *   topVerbs:       Array<{ word, count }>,
 *   topAdjectives:  Array<{ word, count }>,
 * }
 */

var nlp = require('compromise');

var TOP_N = 20;

function tally(map) {
  return Object.keys(map)
    .map(function(w) { return { word: w, count: map[w] }; })
    .sort(function(a, b) { return b.count - a.count; })
    .slice(0, TOP_N);
}

function posAnalysis(messages) {
  if (!Array.isArray(messages)) {
    return { distribution: {}, topNouns: [], topVerbs: [], topAdjectives: [] };
  }

  var dist = { nouns: 0, verbs: 0, adjectives: 0, adverbs: 0, pronouns: 0 };
  var topNouns = {};
  var topVerbs = {};
  var topAdj   = {};

  messages.forEach(function(msg) {
    if (!msg || !msg.message_text) return;

    var doc = nlp(msg.message_text);

    dist.nouns      += doc.nouns().length;
    dist.verbs      += doc.verbs().length;
    dist.adjectives += doc.adjectives().length;
    dist.adverbs    += doc.adverbs().length;
    dist.pronouns   += doc.pronouns().length;

    doc.nouns().json().forEach(function(t) {
      var w = t.text.toLowerCase().trim();
      if (w) topNouns[w] = (topNouns[w] || 0) + 1;
    });
    doc.verbs().json().forEach(function(t) {
      var w = t.text.toLowerCase().trim();
      if (w) topVerbs[w] = (topVerbs[w] || 0) + 1;
    });
    doc.adjectives().json().forEach(function(t) {
      var w = t.text.toLowerCase().trim();
      if (w) topAdj[w] = (topAdj[w] || 0) + 1;
    });
  });

  return {
    distribution:  dist,
    topNouns:      tally(topNouns),
    topVerbs:      tally(topVerbs),
    topAdjectives: tally(topAdj),
  };
}

module.exports = { posAnalysis };
