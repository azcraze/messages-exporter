/**
 * modules/nlp/threadReconstructor.js
 *
 * Reconstructs iMessage reply threads using thread_originator_guid.
 * Messages that share the same thread_originator_guid belong to the same thread.
 * The root message is the earliest in each group.
 *
 * reconstructThreads(messages) → {
 *   threadCount:           number,
 *   totalThreadedMessages: number,
 *   threads: Array<ThreadEntry>,
 * }
 *
 * ThreadEntry: {
 *   threadId:     number,        // sequential index
 *   rootMessage:  Object,        // earliest message in the thread
 *   replyCount:   number,        // messages after the root
 *   participants: string[],      // unique senders in thread
 *   startDate:    string,
 *   endDate:      string,
 *   messages:     Object[],      // all messages in chronological order
 * }
 */

/**
 * @param {Array<Object>} messages - simplified message array
 * @returns {Object}
 */
function reconstructThreads(messages) {
  if (!Array.isArray(messages)) {
    return { threadCount: 0, totalThreadedMessages: 0, threads: [] };
  }

  // Group by thread_originator_guid (only messages with a non-null value)
  var groups = {};
  messages.forEach(function(msg) {
    var guid = msg.thread_originator_guid;
    if (!guid) return;
    if (!groups[guid]) groups[guid] = [];
    groups[guid].push(msg);
  });

  var threads = [];
  var threadId = 0;
  var totalThreadedMessages = 0;

  Object.keys(groups).forEach(function(guid) {
    var group = groups[guid];

    // Sort chronologically
    group.sort(function(a, b) {
      var da = a.date ? new Date(a.date).getTime() : 0;
      var db = b.date ? new Date(b.date).getTime() : 0;
      return da - db;
    });

    var root = group[0];
    var replies = group.slice(1);

    // Collect unique participants
    var senderSet = {};
    group.forEach(function(m) {
      var s = m.sender || (m.is_from_me === 1 ? 'me' : 'other');
      senderSet[s] = true;
    });

    var startDate = root.date || '';
    var lastMsg   = group[group.length - 1];
    var endDate   = lastMsg.date || '';

    threads.push({
      threadId:     threadId++,
      rootMessage:  root,
      replyCount:   replies.length,
      participants: Object.keys(senderSet),
      startDate:    startDate,
      endDate:      endDate,
      messages:     group,
    });

    totalThreadedMessages += group.length;
  });

  // Sort threads by start date descending (most recent first)
  threads.sort(function(a, b) {
    var da = a.startDate ? new Date(a.startDate).getTime() : 0;
    var db = b.startDate ? new Date(b.startDate).getTime() : 0;
    return db - da;
  });

  return {
    threadCount:           threads.length,
    totalThreadedMessages: totalThreadedMessages,
    threads:               threads,
  };
}

module.exports = { reconstructThreads };
