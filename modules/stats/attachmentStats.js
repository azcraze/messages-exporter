/**
 * modules/stats/attachmentStats.js
 *
 * Counts attachments across all messages, grouped by broad MIME category
 * and by specific MIME type.
 *
 * attachmentStats(messages) → {
 *   total:       number,
 *   byCategory:  { image, video, audio, document, other },
 *   byMimeType:  Array<{ mimeType, count }>,
 *   messagesWithAttachments: number,
 * }
 */

function mimeCategory(mimeType) {
  if (!mimeType) return 'other';
  var t = mimeType.toLowerCase();
  if (t.startsWith('image/'))       return 'image';
  if (t.startsWith('video/'))       return 'video';
  if (t.startsWith('audio/'))       return 'audio';
  if (
    t.startsWith('application/') ||
    t.startsWith('text/') ||
    t === 'application/pdf'
  )                                  return 'document';
  return 'other';
}

function attachmentStats(messages) {
  if (!Array.isArray(messages)) {
    return { total: 0, byCategory: {}, byMimeType: [], messagesWithAttachments: 0 };
  }

  var total    = 0;
  var msgCount = 0;
  var cats     = { image: 0, video: 0, audio: 0, document: 0, other: 0 };
  var mimeMap  = {};

  messages.forEach(function(msg) {
    if (!msg || !Array.isArray(msg.attachments) || msg.attachments.length === 0) return;
    msgCount++;
    msg.attachments.forEach(function(att) {
      total++;
      var cat  = mimeCategory(att.type);
      cats[cat]++;
      var mime = att.type || 'unknown';
      mimeMap[mime] = (mimeMap[mime] || 0) + 1;
    });
  });

  var byMimeType = Object.keys(mimeMap)
    .map(function(t) { return { mimeType: t, count: mimeMap[t] }; })
    .sort(function(a, b) { return b.count - a.count; });

  return {
    total:                   total,
    byCategory:              cats,
    byMimeType:              byMimeType,
    messagesWithAttachments: msgCount,
  };
}

module.exports = { attachmentStats };
