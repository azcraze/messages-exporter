/**
 * modules/nlp/tokenizer.js
 *
 * Converts a message text string into a cleaned array of lowercase tokens.
 * Used as the foundation for word frequency, phrase extraction, and sentiment.
 *
 * tokenize(text, opts?)         – tokenise a single string
 * tokenizeMessages(msgs, opts?) – tokenise all message_text fields, returns flat token array
 *
 * Options:
 *   removeStopWords {boolean}  default true
 *   minLength       {number}   minimum token length, default 2
 */

var engine = require('../../lib/nlp-engine');

// Strip URLs before tokenising so they don't pollute word counts
var URL_RE = /https?:\/\/\S+|www\.\S+/gi;

function tokenize(text, opts) {
  if (!text || typeof text !== 'string') return [];

  opts = opts || {};
  var removeStop = opts.removeStopWords !== false;
  var minLen     = opts.minLength !== undefined ? opts.minLength : 2;

  var cleaned = text.replace(URL_RE, '');
  var tokens  = engine.tokenizer.tokenize(cleaned.toLowerCase());
  if (!tokens) return [];

  return tokens.filter(function(t) {
    if (t.length < minLen) return false;
    if (removeStop && engine.STOP_WORDS.has(t)) return false;
    return true;
  });
}

function tokenizeMessages(messages, opts) {
  if (!Array.isArray(messages)) return [];
  var result = [];
  messages.forEach(function(msg) {
    if (msg && msg.message_text) {
      var tokens = tokenize(msg.message_text, opts);
      for (var i = 0; i < tokens.length; i++) result.push(tokens[i]);
    }
  });
  return result;
}

module.exports = { tokenize, tokenizeMessages };
