/**
 * scripts/analyze.js
 *
 * Full analysis pipeline. Runs all 15 analysis features against the message
 * data and writes JSON, Markdown, and CSV output for each.
 *
 * Usage:
 *   node scripts/analyze.js [path/to/data.json]
 *
 * Input:  data/data.json  (or the path provided)
 * Output: output/*.json           — intermediate data per feature
 *         output/reports/*.md     — markdown reports
 *         output/reports/*.csv    — CSV data files
 *
 * Run node run.js first to generate the base output files, or provide a
 * raw data.json directly.
 */

'use strict';

var path = require('path');
var fs   = require('fs');

// ── Infrastructure ────────────────────────────────────────────────────────────
var { readJsonFile, saveJSON, ensureDir }   = require('../utils/fileIO');
var { toCsv, saveCSV }                     = require('../utils/csvWriter');
var { render: mdRender }                   = require('../lib/reporters/markdown-reporter');
var { runPipeline }                        = require('../lib/pipeline');
var { groupMessagesByInactivity }          = require('../modules/groupConversationsByTime');
var { format }                             = require('../utils/dateHelpers');

// ── New analysis modules ──────────────────────────────────────────────────────
var { detectQuestions }    = require('../modules/nlp/questionDetector');
var { mapReactions }       = require('../modules/nlp/reactionMapper');
var { reconstructThreads } = require('../modules/nlp/threadReconstructor');
var { sentimentArcs }      = require('../modules/nlp/sentimentArc');
var { detectToneDrift }    = require('../modules/nlp/toneDrift');
var { perSenderPhrases }   = require('../modules/nlp/perSenderPhrases');
var { groupPhrases }       = require('../modules/nlp/phraseGrouping');
var { computeTfIdf }       = require('../modules/nlp/tfidf');
var { analyzeCurseWords }  = require('../modules/nlp/curseWords');
var { analyzeTurnTaking }  = require('../modules/stats/turnTaking');

// ── Existing stats modules ────────────────────────────────────────────────────
var { messageVolume }      = require('../modules/stats/messageVolume');
var { conversationStats }  = require('../modules/stats/conversationStats');
var { emojiStats }         = require('../modules/stats/emojiStats');
var { responseTime }       = require('../modules/stats/responseTime');
var { timeOfDay }          = require('../modules/stats/timeOfDay');
var { dayOfWeek }          = require('../modules/stats/dayOfWeek');

// ── Report builders ───────────────────────────────────────────────────────────
var questionReport      = require('../reports/question-report');
var reactionReport      = require('../reports/reaction-report');
var threadReport        = require('../reports/thread-report');
var turnTakingReport    = require('../reports/turn-taking-report');
var convLengthReport    = require('../reports/conversation-length-report');
var msgVolumeReport     = require('../reports/message-volume-report');
var tfidfReport         = require('../reports/tfidf-report');
var phrasePatternsReport = require('../reports/phrase-patterns-report');
var phraseGroupingReport = require('../reports/phrase-grouping-report');
var sentimentArcReport  = require('../reports/sentiment-arc-report');
var toneDriftReport     = require('../reports/tone-drift-report');
var commPatternsReport  = require('../reports/communication-patterns-report');
var emojiReport         = require('../reports/emoji-report');
var curseWordsReport    = require('../reports/curse-words-report');

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Conversations with IDs ────────────────────────────────────────────────────
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

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  var inputPath = process.argv[2] || './data/data.json';

  var rawMessages;
  try {
    rawMessages = readJsonFile(inputPath);
  } catch (e) {
    console.error('Could not read ' + inputPath + ':', e.message);
    process.exit(1);
  }
  console.log('Loaded ' + rawMessages.length + ' raw messages from ' + inputPath);

  // ── Step 1: Base pipeline ─────────────────────────────────────────────────
  var pipeResult  = runPipeline(rawMessages);
  var simplified  = pipeResult.simplified;
  var dateRange   = null;

  if (simplified.length > 0) {
    var dates = simplified
      .map(function(m) { return m.date; })
      .filter(function(d) { return d && d !== 'Unknown Date'; })
      .sort();
    if (dates.length > 0) dateRange = { first: dates[0], last: dates[dates.length - 1] };
  }

  var msgCount = simplified.length;
  console.log('Simplified messages: ' + msgCount);

  // ── Step 2: Conversations with stable IDs ─────────────────────────────────
  var conversations = buildConversationsWithIds(simplified);
  console.log('Conversations: ' + conversations.length);

  var written = [];

  // ── Step 3: Run each analysis ─────────────────────────────────────────────

  // 1. Question Detection
  console.log('Running: question detection...');
  var qResult    = detectQuestions(simplified, conversations);
  var qReport    = questionReport.build(qResult);
  var allQuestions = [];
  Object.keys(qResult.bySender || {}).forEach(function(sender) {
    (qResult.bySender[sender] || []).forEach(function(q) {
      allQuestions.push({
        sender:         sender,
        date:           q.date ? q.date.slice(0, 10) : '',
        time:           q.time || '',
        conversationId: q.conversationId != null ? q.conversationId : '',
        participants:   (q.participants || []).join('; '),
        question:       q.message_text || '',
        following_1:    q.followingMessages[0] ? (q.followingMessages[0].sender + ': ' + q.followingMessages[0].message_text) : '',
        following_2:    q.followingMessages[1] ? (q.followingMessages[1].sender + ': ' + q.followingMessages[1].message_text) : '',
        following_3:    q.followingMessages[2] ? (q.followingMessages[2].sender + ': ' + q.followingMessages[2].message_text) : '',
      });
    });
  });
  saveReport('question-detection', qResult, qReport.sections, makeMeta('Question Detection', msgCount, dateRange), function() {
    return [{ filename: 'question-detection', rows: allQuestions,
      headers: ['sender','date','time','conversationId','participants','question','following_1','following_2','following_3'] }];
  });
  written.push('question-detection');

  // 2. Reaction Mapping
  console.log('Running: reaction mapping...');
  var rxResult = mapReactions(simplified);
  var rxReport = reactionReport.build(rxResult);
  saveReport('reaction-mapping', rxResult, rxReport.sections, makeMeta('Reaction Mapping', msgCount, dateRange), function(d) {
    var rows = (d.reactions || []).map(function(r) {
      return {
        date:           r.date ? r.date.slice(0, 10) : '',
        sender:         r.sender || '',
        reactionType:   r.reactionType || '',
        originalSender: r.originalMsg ? (r.originalMsg.sender || '') : '',
        originalText:   r.originalMsg ? (r.originalMsg.message_text || '') : '',
      };
    });
    return [{ filename: 'reaction-mapping', rows: rows,
      headers: ['date','sender','reactionType','originalSender','originalText'] }];
  });
  written.push('reaction-mapping');

  // 3. Thread Reconstruction
  console.log('Running: thread reconstruction...');
  var thrResult = reconstructThreads(simplified);
  var thrReport = threadReport.build(thrResult);
  saveReport('threads', thrResult, thrReport.sections, makeMeta('Thread Reconstruction', msgCount, dateRange), function(d) {
    var rows = (d.threads || []).map(function(t) {
      return {
        threadId:    t.threadId,
        startDate:   t.startDate ? t.startDate.slice(0, 10) : '',
        endDate:     t.endDate   ? t.endDate.slice(0, 10)   : '',
        replyCount:  t.replyCount,
        participants: (t.participants || []).join('; '),
        rootSender:  t.rootMessage ? (t.rootMessage.sender || '') : '',
        rootText:    t.rootMessage ? (t.rootMessage.message_text || '') : '',
      };
    });
    return [{ filename: 'threads', rows: rows,
      headers: ['threadId','startDate','endDate','replyCount','participants','rootSender','rootText'] }];
  });
  written.push('threads');

  // 4. Turn-Taking Analysis
  console.log('Running: turn-taking analysis...');
  var ttResult = analyzeTurnTaking(conversations);
  var ttReport = turnTakingReport.build(ttResult);
  saveReport('turn-taking', ttResult, ttReport.sections, makeMeta('Turn-Taking Analysis', msgCount, dateRange), function(d) {
    var initBS = (d.initiations || {}).bySender || {};
    var runBS  = (d.avgRunLength || {}).bySender || {};
    var senders = Array.from(new Set(Object.keys(initBS).concat(Object.keys(runBS))));
    var rows = senders.map(function(s) {
      return {
        sender:        s,
        initiations:   initBS[s] || 0,
        avgRunLength:  runBS[s]  || 0,
      };
    });
    return [{ filename: 'turn-taking', rows: rows, headers: ['sender','initiations','avgRunLength'] }];
  });
  written.push('turn-taking');

  // 5. Message Volume
  console.log('Running: message volume...');
  var mvResult = messageVolume(simplified);
  var mvReport = msgVolumeReport.build(mvResult);
  saveReport('message-volume', mvResult, mvReport.sections, makeMeta('Message Volume', msgCount, dateRange), function(d) {
    return [
      { filename: 'message-volume-monthly', rows: d.byMonth || [], headers: ['month','count'] },
      { filename: 'message-volume-yearly',  rows: d.byYear  || [], headers: ['year','count'] },
      { filename: 'message-volume-daily',   rows: (d.byDay  || []).map(function(r) { return { date: r.date, count: r.count }; }), headers: ['date','count'] },
    ];
  });
  written.push('message-volume');

  // 6. Conversation Length Distribution
  console.log('Running: conversation length distribution...');
  var clResult = conversationStats(conversations.map(function(c) {
    return { date: c.date, conversation_msgs: c.conversationMsgs };
  }));
  var clReport = convLengthReport.build(clResult);
  saveReport('conversation-length', clResult, clReport.sections, makeMeta('Conversation Length Distribution', msgCount, dateRange), function(d) {
    var dist = d.distribution || {};
    var rows = Object.keys(dist).map(function(k) { return { bucket: k, count: dist[k] }; });
    return [{ filename: 'conversation-length', rows: rows, headers: ['bucket','count'] }];
  });
  written.push('conversation-length');

  // 7. TF-IDF
  console.log('Running: TF-IDF...');
  var tfidfResult = computeTfIdf(simplified);
  var tfidfRpt    = tfidfReport.build(tfidfResult);
  saveReport('tfidf', tfidfResult, tfidfRpt.sections, makeMeta('TF-IDF Distinctive Terms', msgCount, dateRange), function(d) {
    var rows = [];
    Object.keys(d.bySender || {}).forEach(function(sender) {
      (d.bySender[sender] || []).forEach(function(t) {
        rows.push({ sender: sender, rank: t.rank, term: t.term, tfidf: t.tfidf });
      });
    });
    return [{ filename: 'tfidf', rows: rows, headers: ['sender','rank','term','tfidf'] }];
  });
  written.push('tfidf');

  // 8. Per-Sender Phrase Patterns
  console.log('Running: per-sender phrase patterns...');
  var pspResult = perSenderPhrases(simplified);
  var pspReport = phrasePatternsReport.build(pspResult);
  saveReport('per-sender-phrases', pspResult, pspReport.sections, makeMeta('Phrase Patterns per Sender', msgCount, dateRange), function(d) {
    var rows = [];
    Object.keys(d.bySender || {}).forEach(function(sender) {
      (d.bySender[sender] || []).forEach(function(p) {
        rows.push({ sender: sender, rank: p.rank, phrase: p.phrase, count: p.count, words: p.words });
      });
    });
    return [{ filename: 'per-sender-phrases', rows: rows, headers: ['sender','rank','phrase','count','words'] }];
  });
  written.push('per-sender-phrases');

  // 9. Phrase Grouping
  console.log('Running: phrase grouping...');
  var pgResult = groupPhrases(simplified);
  var pgReport = phraseGroupingReport.build(pgResult);
  saveReport('phrase-groups', pgResult, pgReport.sections, makeMeta('Phrase Grouping', msgCount, dateRange), function(d) {
    var rows = (d.clusters || []).map(function(cl) {
      return {
        rank:       cl.rank,
        canonical:  cl.canonical,
        totalCount: cl.totalCount,
        variants:   (cl.variants || []).filter(function(v) { return v.phrase !== cl.canonical; }).map(function(v) { return v.phrase; }).join('; '),
      };
    });
    return [{ filename: 'phrase-groups', rows: rows, headers: ['rank','canonical','totalCount','variants'] }];
  });
  written.push('phrase-groups');

  // 10. Per-Conversation Sentiment Arcs
  console.log('Running: sentiment arcs...');
  var saResult = sentimentArcs(conversations);
  var saReport = sentimentArcReport.build(saResult);
  saveReport('sentiment-arcs', saResult, saReport.sections, makeMeta('Sentiment Arcs', msgCount, dateRange), function(d) {
    var rows = (d.arcs || []).map(function(a) {
      return {
        conversationId:  a.conversationId,
        date:            a.date ? a.date.slice(0, 10) : '',
        messageCount:    a.messageCount,
        firstHalfMean:   a.firstHalfMean,
        secondHalfMean:  a.secondHalfMean,
        delta:           a.delta,
        trend:           a.trend,
        participants:    (a.participants || []).join('; '),
      };
    });
    return [{ filename: 'sentiment-arcs', rows: rows,
      headers: ['conversationId','date','messageCount','firstHalfMean','secondHalfMean','delta','trend','participants'] }];
  });
  written.push('sentiment-arcs');

  // 11. Tone Drift Detection
  console.log('Running: tone drift detection...');
  var tdResult = detectToneDrift(conversations);
  var tdReport = toneDriftReport.build(tdResult);
  saveReport('tone-drift', tdResult, tdReport.sections, makeMeta('Tone Drift Detection', msgCount, dateRange), function(d) {
    var rows = (d.drifts || []).map(function(dr) {
      return {
        conversationId: dr.conversationId,
        date:           dr.date ? dr.date.slice(0, 10) : '',
        messageCount:   dr.messageCount,
        startScore:     dr.startScore,
        endScore:       dr.endScore,
        delta:          dr.delta,
        direction:      dr.direction,
        participants:   (dr.participants || []).join('; '),
      };
    });
    return [{ filename: 'tone-drift', rows: rows,
      headers: ['conversationId','date','messageCount','startScore','endScore','delta','direction','participants'] }];
  });
  written.push('tone-drift');

  // 12. Communication Patterns
  console.log('Running: communication patterns...');
  var rtResult  = responseTime(simplified);
  var todResult = timeOfDay(simplified);
  var dowResult = dayOfWeek(simplified);
  var cpReport  = commPatternsReport.build(rtResult, todResult, dowResult);
  var cpData    = { responseTime: rtResult, timeOfDay: todResult, dayOfWeek: dowResult };
  saveReport('communication-patterns', cpData, cpReport.sections, makeMeta('Communication Patterns', msgCount, dateRange), function(d) {
    // Three CSVs: response-time per sender, time-of-day hourly, day-of-week
    var rtRows = Object.keys((d.responseTime || {}).bySender || {}).map(function(s) {
      var r = d.responseTime.bySender[s];
      return { sender: s, meanMinutes: r.mean, medianMinutes: r.median, count: r.count };
    });
    var todRows = ((d.timeOfDay || {}).byHour || []).map(function(h) {
      return { hour: h.hour, label: h.label, count: h.count, pct: h.pct };
    });
    var dowRows = ((d.dayOfWeek || {}).byDay || []).map(function(day) {
      return { day: day.day, count: day.count, pct: day.pct };
    });
    return [
      { filename: 'comm-response-time',  rows: rtRows,  headers: ['sender','meanMinutes','medianMinutes','count'] },
      { filename: 'comm-time-of-day',    rows: todRows, headers: ['hour','label','count','pct'] },
      { filename: 'comm-day-of-week',    rows: dowRows, headers: ['day','count','pct'] },
    ];
  });
  written.push('communication-patterns');

  // 13. Emoji Usage Patterns
  console.log('Running: emoji usage...');
  var emResult = emojiStats(simplified, { perSender: true, topN: 30 });
  var emReport = emojiReport.build(emResult);
  saveReport('emoji-stats', emResult, emReport.sections, makeMeta('Emoji Usage Patterns', msgCount, dateRange), function(d) {
    var rows = [];
    (d.topN || []).forEach(function(e) {
      rows.push({ sender: 'overall', rank: e.rank, emoji: e.emoji, count: e.count });
    });
    Object.keys(d.perSender || {}).forEach(function(sender) {
      (d.perSender[sender] || []).forEach(function(e) {
        rows.push({ sender: sender, rank: e.rank, emoji: e.emoji, count: e.count });
      });
    });
    return [{ filename: 'emoji-stats', rows: rows, headers: ['sender','rank','emoji','count'] }];
  });
  written.push('emoji-stats');

  // 14. Curse Word Analysis
  console.log('Running: profanity analysis...');
  var cwResult = analyzeCurseWords(simplified, conversations);
  var cwReport = curseWordsReport.build(cwResult);
  saveReport('curse-words', cwResult, cwReport.sections, makeMeta('Profanity Usage Patterns', msgCount, dateRange), function(d) {
    var rows = (d.topWords || []).map(function(w) {
      var senderCols = {};
      Object.keys(d.bySender || {}).forEach(function(s) {
        senderCols['sender_' + s] = ((d.bySender[s] || {}).byWord || {})[w.word] || 0;
      });
      return Object.assign({ rank: w.rank, word: w.word, total: w.count }, senderCols);
    });
    return [{ filename: 'curse-words', rows: rows }];
  });
  written.push('curse-words');

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n✓ Analysis complete. ' + written.length + ' features processed.\n');
  console.log('JSON data:   ' + OUTPUT_DIR + '/');
  console.log('Reports:     ' + REPORTS_DIR + '/\n');

  console.log('Files written:');
  written.forEach(function(name) {
    console.log('  ' + OUTPUT_DIR + '/' + name + '.json');
    console.log('  ' + REPORTS_DIR + '/' + name + '.md');
  });
}

main().catch(function(err) {
  console.error('Fatal error:', err);
  process.exit(1);
});
