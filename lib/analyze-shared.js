/**
 * lib/analyze-shared.js
 *
 * Shared helpers used by scripts/analyze.js and any per-feature-family
 * "suite" script (e.g. scripts/tfidf-suite.js) that needs to run
 * independently of the full analysis pipeline, without duplicating the
 * input-loading or JSON/Markdown/CSV-writing logic.
 *
 * loadContext(inputPath) → { simplified, conversations, msgCount, dateRange }
 * saveReport(name, data, sections, meta, csvFn)
 * makeMeta(title, messageCount, dateRange)
 */

'use strict';

var path = require('path');
var fs   = require('fs');

var { readJsonFile, saveJSON, ensureDir } = require('../utils/fileIO');
var { toCsv, saveCSV }                    = require('../utils/csvWriter');
var { render: mdRender }                  = require('./reporters/markdown-reporter');
var { runPipeline }                       = require('./pipeline');
var { groupMessagesByInactivity }         = require('../modules/groupConversationsByTime');
var { format }                            = require('../utils/dateHelpers');

var OUTPUT_DIR  = './output';
var REPORTS_DIR = './output/reports';

/**
 * Save a report: JSON data + Markdown + CSV(s).
 * @param {string}   name       — base filename without extension
 * @param {Object}   data       — raw JSON data
 * @param {Array}    sections   — markdown-reporter sections
 * @param {Object}   meta       — markdown report metadata
 * @param {Function} csvFn      — function(data) → Array<{ filename, rows, headers }>
 */
function saveReport(name, data, sections, meta, csvFn) {
  // JSON
  saveJSON(data, name + '.json', OUTPUT_DIR);

  // Markdown
  var md = mdRender(sections, meta);
  ensureDir(REPORTS_DIR);
  fs.writeFileSync(path.join(REPORTS_DIR, name + '.md'), md, 'utf8');

  // CSV(s)
  if (typeof csvFn === 'function') {
    var csvOutputs = csvFn(data);
    (csvOutputs || []).forEach(function(out) {
      if (!out || !out.rows || out.rows.length === 0) return;
      var csv = toCsv(out.rows, out.headers);
      if (csv) saveCSV(csv, (out.filename || name) + '.csv', REPORTS_DIR);
    });
  }
}

function makeMeta(title, messageCount, dateRange) {
  return {
    title:         title,
    message_count: messageCount,
    date_range:    dateRange || null,
    generated_at:  new Date().toISOString().slice(0, 19).replace('T', ' '),
  };
}

/**
 * Re-derive conversations over the full stream (no per-day bucketing)
 * so conversations spanning midnight are not split, and each gets a stable
 * conversationId.
 */
function buildConversationsWithIds(simplified) {
  var msgs = simplified.map(function(msg) {
    return {
      _id:             msg._id,
      from:            msg.sender || (msg.is_from_me === 1 ? 'me' : 'other'),
      date:            msg.date,
      message_text:    msg.message_text,
      attachments:     msg.attachments,
      participants:    msg.participants,
      is_from_me:      msg.is_from_me,
      message_segments: msg.message_segments,
      sha:             msg.sha,
      associated_sha:  msg.associated_sha,
      reply_to_guid:   msg.reply_to_guid,
      thread_originator_guid: msg.thread_originator_guid,
    };
  });

  var grouped = groupMessagesByInactivity(msgs, null);

  return grouped.conversations.map(function(convo, index) {
    var firstMsg = convo.conversationMsgs[0];
    var dateStr  = firstMsg && firstMsg.date && firstMsg.date !== 'Unknown Date'
      ? format(new Date(firstMsg.date), 'EEE, MMM dd, yyyy')
      : 'Unknown Date';

    // Derive participants from senders
    var senderSet = {};
    convo.conversationMsgs.forEach(function(m) {
      var s = m.from || m.sender || (m.is_from_me === 1 ? 'me' : 'other');
      senderSet[s] = true;
    });

    return {
      conversationId:   index,
      date:             dateStr,
      participants:     Object.keys(senderSet),
      conversationMsgs: convo.conversationMsgs,
      messageCount:     convo.conversationMsgs.length,
    };
  });
}

/**
 * Load raw messages from `inputPath`, run the base pipeline, and derive
 * conversations with stable IDs. Shared by scripts/analyze.js and any
 * standalone per-feature-family suite script.
 *
 * @param {string} inputPath
 * @returns {{ simplified: Array, conversations: Array, msgCount: number, dateRange: Object|null }}
 */
function loadContext(inputPath) {
  var rawMessages = readJsonFile(inputPath);

  var pipeResult = runPipeline(rawMessages);
  var simplified = pipeResult.simplified;

  var dateRange = null;
  if (simplified.length > 0) {
    var dates = simplified
      .map(function(m) { return m.date; })
      .filter(function(d) { return d && d !== 'Unknown Date'; })
      .sort();
    if (dates.length > 0) dateRange = { first: dates[0], last: dates[dates.length - 1] };
  }

  var conversations = buildConversationsWithIds(simplified);

  return {
    simplified:    simplified,
    conversations: conversations,
    msgCount:      simplified.length,
    dateRange:     dateRange,
  };
}

module.exports = { loadContext, saveReport, makeMeta, OUTPUT_DIR, REPORTS_DIR };
