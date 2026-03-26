/**
 * modules/nlp/patternFinder.js
 *
 * Keyword and regex scanning across a message array.
 * Returns every match with surrounding context text.
 *
 * patternFinder(messages, pattern, opts?) → Array<{
 *   _id, date, sender, match, context, message_text
 * }>
 *
 * pattern  – string (treated as a literal keyword) or RegExp
 *
 * Options:
 *   caseInsensitive {boolean}  default true (ignored when pattern is a RegExp)
 *   contextChars    {number}   characters of surrounding context, default 80
 */

function patternFinder(messages, pattern, opts) {
  if (!Array.isArray(messages) || !pattern) return [];

  opts = opts || {};
  var contextChars = opts.contextChars !== undefined ? opts.contextChars : 80;

  var regex;
  if (pattern instanceof RegExp) {
    // Clone to always include the global flag so exec loops correctly
    var flags = pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g';
    regex = new RegExp(pattern.source, flags);
  } else {
    var escapeRegex = String(pattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var f = opts.caseInsensitive !== false ? 'gi' : 'g';
    regex = new RegExp(escapeRegex, f);
  }

  var results = [];

  messages.forEach(function(msg) {
    if (!msg || !msg.message_text) return;

    var text = msg.message_text;
    var match;
    regex.lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      var start = Math.max(0, match.index - contextChars);
      var end   = Math.min(text.length, match.index + match[0].length + contextChars);

      results.push({
        _id:          msg._id   || null,
        date:         msg.date  || null,
        sender:       msg.sender || null,
        match:        match[0],
        context:
          (start > 0 ? '\u2026' : '') +
          text.slice(start, end) +
          (end < text.length ? '\u2026' : ''),
        message_text: text,
      });

      // Guard against zero-length matches causing an infinite loop
      if (match[0].length === 0) regex.lastIndex++;
    }
  });

  return results;
}

module.exports = { patternFinder };
