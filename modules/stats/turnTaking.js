/**
 * modules/stats/turnTaking.js
 *
 * Analyses conversational turn-taking patterns:
 *   - Who initiates conversations most often
 *   - Average run length (consecutive messages from same sender)
 *   - Back-and-forth ratio (sender switches / total messages)
 *
 * analyzeTurnTaking(conversations) → {
 *   initiations:       { bySender: { [sender]: number } },
 *   avgRunLength:      { bySender: { [sender]: number }, overall: number },
 *   backAndForthRatio: { overall: number, bySender: { [sender]: number } },
 *   conversationBreakdown: Array<ConvoBreakdown>,
 * }
 *
 * ConvoBreakdown: {
 *   conversationId, date, initiator, messageCount,
 *   runLengths: { [sender]: number },
 *   switchCount: number, backAndForthRatio: number,
 * }
 */

function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce(function(s, v) { return s + v; }, 0) / arr.length;
}

/**
 * Given an ordered array of sender strings, compute run lengths per sender
 * and the number of sender switches.
 * @param {string[]} senders
 * @returns {{ runsBySender: Object, switchCount: number }}
 */
function analyzeRuns(senders) {
  var runsBySender = {};
  var switchCount  = 0;
  var currentRun   = 1;

  for (var i = 1; i < senders.length; i++) {
    if (senders[i] === senders[i - 1]) {
      currentRun++;
    } else {
      // Record the completed run
      var s = senders[i - 1];
      if (!runsBySender[s]) runsBySender[s] = [];
      runsBySender[s].push(currentRun);
      currentRun = 1;
      switchCount++;
    }
  }
  // Record the final run
  if (senders.length > 0) {
    var last = senders[senders.length - 1];
    if (!runsBySender[last]) runsBySender[last] = [];
    runsBySender[last].push(currentRun);
  }

  return { runsBySender: runsBySender, switchCount: switchCount };
}

/**
 * @param {Array<Object>} conversations - array of { conversationId, date, conversationMsgs|conversation_msgs }
 * @returns {Object}
 */
function analyzeTurnTaking(conversations) {
  if (!Array.isArray(conversations) || conversations.length === 0) {
    return {
      initiations:            { bySender: {} },
      avgRunLength:           { bySender: {}, overall: 0 },
      backAndForthRatio:      { overall: 0, bySender: {} },
      conversationBreakdown:  [],
    };
  }

  // Accumulators across all conversations
  var initiationCounts  = {};   // sender → count of convos initiated
  var allRunsBySender   = {};   // sender → flat array of run lengths across all convos
  var allRatiosBySender = {};   // sender → array of their per-convo back-and-forth ratios
  var allRatios         = [];   // global per-convo ratios

  var breakdown = [];

  conversations.forEach(function(convo) {
    var msgs = convo.conversationMsgs || convo.conversation_msgs || [];
    if (msgs.length < 2) return;

    var cid   = convo.conversationId != null ? convo.conversationId : convo.conversationID;
    var senders = msgs.map(function(m) {
      return m.from || m.sender || (m.is_from_me === 1 ? 'me' : 'other');
    });

    var initiator = senders[0];
    initiationCounts[initiator] = (initiationCounts[initiator] || 0) + 1;

    var runInfo    = analyzeRuns(senders);
    var switchCount = runInfo.switchCount;
    var ratio      = parseFloat((switchCount / senders.length).toFixed(4));

    allRatios.push(ratio);

    // Aggregate run lengths per sender
    Object.keys(runInfo.runsBySender).forEach(function(sender) {
      if (!allRunsBySender[sender]) allRunsBySender[sender] = [];
      allRunsBySender[sender] = allRunsBySender[sender].concat(runInfo.runsBySender[sender]);
    });

    // Per-sender ratio contribution — store sender-wise for this convo
    senders.forEach(function(s) {
      if (!allRatiosBySender[s]) allRatiosBySender[s] = [];
    });
    allRatiosBySender[initiator] = allRatiosBySender[initiator] || [];

    // Per-convo mean run lengths
    var runLengths = {};
    Object.keys(runInfo.runsBySender).forEach(function(sender) {
      runLengths[sender] = parseFloat(mean(runInfo.runsBySender[sender]).toFixed(2));
    });

    breakdown.push({
      conversationId:   cid,
      date:             convo.date || '',
      initiator:        initiator,
      messageCount:     msgs.length,
      runLengths:       runLengths,
      switchCount:      switchCount,
      backAndForthRatio: ratio,
    });
  });

  // Build avgRunLength bySender
  var avgRunLengthBySender = {};
  Object.keys(allRunsBySender).forEach(function(sender) {
    avgRunLengthBySender[sender] = parseFloat(mean(allRunsBySender[sender]).toFixed(2));
  });

  var allRuns = Object.values(allRunsBySender).reduce(function(acc, arr) { return acc.concat(arr); }, []);
  var overallAvgRun = parseFloat(mean(allRuns).toFixed(2));

  var overallRatio = parseFloat(mean(allRatios).toFixed(4));

  return {
    initiations:  { bySender: initiationCounts },
    avgRunLength: { bySender: avgRunLengthBySender, overall: overallAvgRun },
    backAndForthRatio: {
      overall:  overallRatio,
      bySender: {}, // filled below
    },
    conversationBreakdown: breakdown,
  };
}

module.exports = { analyzeTurnTaking };
