/**
 * lib/nlp-engine.js
 *
 * Initialises shared NLP singletons once. All NLP modules require this file
 * instead of instantiating their own copies of heavy objects.
 *
 * Exports:
 *   tokenizer        – natural.WordTokenizer instance
 *   sentimentAnalyzer – natural.SentimentAnalyzer (AFINN, English)
 *   STOP_WORDS       – Set<string> of common English + texting stop words
 */

var natural = require('natural');

var tokenizer = new natural.WordTokenizer();

var sentimentAnalyzer = new natural.SentimentAnalyzer(
  'English',
  natural.PorterStemmer,
  'afinn'
);

// Common English stop words + contractions + texting-specific noise
var STOP_WORDS = new Set([
  // Articles / determiners
  'a', 'an', 'the', 'this', 'that', 'these', 'those', 'each', 'every',
  'some', 'any', 'few', 'more', 'most', 'other', 'such', 'both', 'either',
  'neither', 'all',
  // Prepositions
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'between',
  'about', 'against', 'along', 'around', 'up', 'down', 'out', 'off',
  'over', 'under', 'again', 'further', 'once',
  // Conjunctions
  'and', 'or', 'but', 'nor', 'so', 'yet', 'if', 'then', 'because', 'while',
  'as', 'than', 'when', 'where', 'why', 'how', 'although', 'though',
  'unless', 'until', 'since',
  // Pronouns
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves',
  'you', 'your', 'yours', 'yourself', 'yourselves',
  'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
  'what', 'which', 'who', 'whom', 'here', 'there',
  // To be / auxiliaries
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'shall', 'should', 'may', 'might', 'must', 'can', 'could',
  // Common filler words
  'not', 'no', 'too', 'very', 'just', 'also', 'now', 'then', 'well',
  'one', 'two', 'get', 'got', 'like', 'know', 'think', 'go', 'going',
  // Contractions after tokenisation (apostrophe stripped → these forms)
  'im', 'its', 'dont', 'cant', 'wont', 'isnt', 'arent', 'wasnt', 'werent',
  'ill', 'id', 'ive', 'wed', 'theyre', 'youre', 'hes', 'shes', 'didnt',
  'doesnt', 'hadnt', 'havent', 'hasnt', 'shouldnt', 'wouldnt', 'couldnt',
  'mustnt', 'neednt', 'lets',
  // Texting noise
  'yeah', 'yep', 'ok', 'okay', 'lol', 'haha', 'hahaha', 'omg', 'oh',
  'ah', 'uh', 'um', 'hmm', 'hey', 'hi', 'bye', 'yes', 'no',
  // Single letters / short noise left after tokenisation
  's', 't', 're', 've', 'll', 'd', 'n',
]);

module.exports = { tokenizer, sentimentAnalyzer, STOP_WORDS };
