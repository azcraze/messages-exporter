// utils/normalizeText.js

/**
 * Text normalization pipeline for NLP pre-processing.
 * Strips diacritics, emoji, normalizes URLs, whitespace, and casing.
 * Does not require external dependencies.
 */

// Matches emoji and extended pictographic characters (Unicode property escapes, ES2018+)
const EMOJI_REGEX = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu;

// Matches http/https URLs
const URL_REGEX = /https?:\/\/[^\s]+/gi;

/**
 * Strip diacritics via Unicode NFD decomposition.
 * e.g. "café" → "cafe", "naïve" → "naive"
 */
function stripDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Replace emoji with a single space to preserve word boundaries.
 */
function stripEmoji(str) {
  return str.replace(EMOJI_REGEX, ' ');
}

/**
 * Lowercase URL hostnames and strip trailing punctuation that may have been
 * captured as part of the URL (e.g. "example.com." at end of sentence).
 */
function normalizeUrls(str) {
  return str.replace(URL_REGEX, (url) => {
    const clean = url.replace(/[.,;!?)]+$/, '');
    try {
      const parsed = new URL(clean);
      parsed.hostname = parsed.hostname.toLowerCase();
      return parsed.toString();
    } catch {
      return clean.toLowerCase();
    }
  });
}

/**
 * Collapse runs of whitespace (spaces, tabs, newlines) into a single space and trim.
 */
function normalizeWhitespace(str) {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Full normalization pipeline.
 * Order: emoji → URLs → diacritics → lowercase → whitespace
 *
 * @param {string} text - Raw message text
 * @returns {string} Normalized text suitable for NLP/comparison
 */
function normalizeText(text) {
  if (typeof text !== 'string') return '';
  let result = text;
  result = stripEmoji(result);
  result = normalizeUrls(result);
  result = stripDiacritics(result);
  result = result.toLowerCase();
  result = normalizeWhitespace(result);
  return result;
}

module.exports = {
  normalizeText,
  stripDiacritics,
  stripEmoji,
  normalizeUrls,
  normalizeWhitespace,
};
