var bplistParser = require('bplist-parser');
var logger = require('./debug-log');

/**
 * Resolves a UID reference (or raw index) into the $objects array.
 */
function resolve(objects, ref) {
  if (ref === null || ref === undefined) return null;
  var index = (typeof ref === 'object' && ref.UID !== undefined) ? ref.UID : ref;
  return objects[index];
}

/**
 * Extracts plain text from an NSAttributedString stored as an NSKeyedArchiver
 * binary plist blob (the attributedBody column in chat.db, iOS 16+).
 *
 * Returns the string, or null if parsing fails or the buffer is empty.
 *
 * @param {Buffer|null} buffer
 * @returns {string|null}
 */
function parseAttributedBody(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) return null;

  try {
    var parsed = bplistParser.parseBuffer(buffer);
    if (!parsed || !parsed[0]) return null;

    var root = parsed[0];
    var objects = root['$objects'];
    if (!Array.isArray(objects)) return null;

    // Resolve the top-level root object from $top.root
    var topRef = root['$top'] && root['$top']['root'];
    if (topRef === null || topRef === undefined) return null;

    var rootObj = resolve(objects, topRef);
    if (!rootObj || typeof rootObj !== 'object') return null;

    // The root object is an NSAttributedString (or NSMutableAttributedString).
    // Its NSString key points to the actual string in $objects.
    var nsStringRef = rootObj['NSString'];
    if (nsStringRef === null || nsStringRef === undefined) return null;

    var str = resolve(objects, nsStringRef);
    if (typeof str === 'string') return str;

    return null;
  } catch (e) {
    logger.warn('parseAttributedBody failed:', e.message);
    return null;
  }
}

module.exports = { parseAttributedBody };
