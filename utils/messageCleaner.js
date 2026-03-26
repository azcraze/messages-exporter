// ./utils/messageCleaner.js

/**
 * Cleans and filters a raw message object into the desired simplified structure.
 * Excludes debugging info and other extraneous data.
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Validates and formats the message to only include core fields.
 * @param {Object} rawMsg - Raw message data, as read from raw JSON.
 * @returns {Object} cleaned message object.
 */
function cleanMessage(rawMsg) {
  // Validate and choose sender
  const sender = rawMsg.sender || 'Unknown Sender';

  // Validate message_text
  const messageText = typeof rawMsg.message_text === 'string' ? rawMsg.message_text : '';

  // Validate is_from_me
  const isFromMe = Number.isInteger(rawMsg.is_from_me) ? rawMsg.is_from_me : 0;

  // Validate date
  const date = typeof rawMsg.date === 'string' && rawMsg.date.trim() !== ''
    ? rawMsg.date
    : 'Unknown Date';

  // Assign an _id
  const id = uuidv4();

  // Process attachments
  const attachments = Array.isArray(rawMsg.attachments)
    ? rawMsg.attachments.map(att => ({
        path: att.path || '',
        type: att.type || ''
      }))
    : [];

  // Process message segments
  const message_segments = Array.isArray(rawMsg.message_segments)
    ? rawMsg.message_segments.map(seg => ({
        type: seg.type || '',
        text: seg.text || null,
        file_type: seg.file_type || null,
        path: seg.path || null,
        reaction_type: seg.reaction_type || null,
      }))
    : [];

  return {
    _id: id,
    is_from_me: isFromMe,
    message_text: messageText,
    date: date,
    sender: sender,
    receiver: Array.isArray(rawMsg.receiver) ? rawMsg.receiver : [],
    participants: Array.isArray(rawMsg.participants) ? rawMsg.participants : [],
    service: typeof rawMsg.service === 'string' ? rawMsg.service : null,
    attachments: attachments,
    message_segments: message_segments,
    sha: typeof rawMsg.sha === 'string' ? rawMsg.sha : null,
    associated_sha: typeof rawMsg.associated_sha === 'string' ? rawMsg.associated_sha : null,
    reply_to_guid: rawMsg.reply_to_guid || null,
    thread_originator_guid: rawMsg.thread_originator_guid || null,
  };
}

module.exports = {
  cleanMessage,
};
