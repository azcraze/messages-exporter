/**
 * lib/pipeline.js
 *
 * Shared processing pipeline. Takes a raw message array (from the DB converter
 * or from a saved data.json) and runs every transformation step in order.
 *
 * Returns a results map so callers can save whichever outputs they need:
 *
 *   {
 *     simplified       – cleaned, sorted message array
 *     conversations    – flat array of { date, conversation_msgs }
 *     dailyCounts      – array of { date, isoDate, message_count }
 *     largeConversations – conversations with >= minConvoMessages messages
 *     longMessages     – messages >= minMessageChars characters
 *   }
 */

const { format }                     = require('../utils/dateHelpers');
const { getSimplifiedMessages }      = require('../modules/getSimplifiedMessages');
const { groupMessagesByInactivity }  = require('../modules/groupConversationsByTime');
const { countMessagesPerDay }        = require('../modules/countMessagesPerDay');
const { filterGroupedConversations } = require('../modules/filterLargeConversations');
const { getHighCharMessages }        = require('../modules/highCharMessages');

/**
 * @param {Array}  rawMessages
 * @param {Object} [opts]
 * @param {number} [opts.inactivityGapHours=3]   – gap that splits conversations
 * @param {number} [opts.minConvoMessages=15]     – threshold for "large" conversations
 * @param {number} [opts.minMessageChars=300]     – threshold for "long" messages
 * @returns {Object} results map
 */
function runPipeline(rawMessages, opts) {
  opts = opts || {};
  var gapHours      = opts.inactivityGapHours || 3;
  var minConvo      = opts.minConvoMessages   || 15;
  var minChars      = opts.minMessageChars    || 300;

  // Step 1 – clean and sort
  var simplified = getSimplifiedMessages(rawMessages);

  // Step 2 – bucket by calendar day, then split into conversations
  var messagesByDate = {};
  simplified.forEach(function(msg) {
    var dateObj = new Date(msg.date);
    if (isNaN(dateObj.getTime())) return;
    var dateStr = format(dateObj, 'EEE, MMM dd, yyyy');
    if (!messagesByDate[dateStr]) messagesByDate[dateStr] = [];
    messagesByDate[dateStr].push(msg);
  });

  var conversations = [];
  Object.keys(messagesByDate).forEach(function(dateStr) {
    var group = groupMessagesByInactivity(messagesByDate[dateStr], dateStr, gapHours);
    group.conversations.forEach(function(convo) {
      conversations.push({
        date: dateStr,
        conversation_msgs: convo.conversationMsgs,
      });
    });
  });

  // Step 3 – statistics
  var dailyCounts        = countMessagesPerDay(simplified);
  var largeConversations = filterGroupedConversations(conversations, minConvo);
  var longMessages       = getHighCharMessages(simplified);

  return {
    simplified,
    conversations,
    dailyCounts,
    largeConversations,
    longMessages,
  };
}

module.exports = { runPipeline };
