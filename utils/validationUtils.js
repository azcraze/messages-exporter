// ./modules/utils/validationUtils.js

/**
 * Utility functions for data validation and processing.
 */

const { v4: uuidv4 } = require("uuid");

/**
 * Validate if a string is a proper ISO date-time string.
 * @param {string} dateStr - The date-time string.
 * @returns {boolean} - True if valid ISO date-time, false otherwise.
 */
function isValidISODateTime(dateStr) {
  if (typeof dateStr !== "string") return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime()) && date.toISOString() === dateStr;
}

/**
 * Parse a date string into ISO format, or return null if invalid.
 * @param {string} dateStr - The date string.
 * @returns {string|null} - ISO date string if valid, else null.
 */
function parseISODateTime(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  const isoStr = date.toISOString();
  return isValidISODateTime(isoStr) ? isoStr : null;
}

/**
 * Generate a new UUID (for conversation IDs, message IDs, etc).
 * @returns {string} - UUID string.
 */
function generateUUID() {
  return uuidv4();
}

/**
 * Ensure directory exists.
 * @param {string} dirPath - Path to directory.
 */
const fs = require("fs");
const path = require("path");

function ensureDirectoryExistence(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Validate the message object fields based on schema definitions.
 * @param {Object} message - Raw message object
 * @returns {Object} - Processed message with defaults
 */
function validateMessageFields(message) {
  const validated = {};

  // is_from_me: integer, defaults to 0 if missing
  validated.is_from_me = Number.isInteger(message.is_from_me)
    ? message.is_from_me
    : 0;

  // message_text: string, defaults to ''
  validated.message_text =
    typeof message.message_text === "string"
      ? message.message_text
      : "";

  // date: string, validate
  const validDate = parseISODateTime(message.date);
  validated.date = validDate || "Unknown Date";

  // date_read: optional, string or null, validate if present
  if (message.date_read !== undefined && message.date_read !== null) {
    const validReadDate = parseISODateTime(message.date_read);
    validated.date_read = validReadDate || null;
  } else {
    validated.date_read = null;
  }

  // Optional fields (e.g., sender, receiver, attachments, etc.) with defaults or nulls
  validated.sender = message.sender || "Unknown Sender";

  // Add other fields as needed, default to null or empty array if missing
  validated.participants = Array.isArray(message.participants)
    ? message.participants
    : [];
  validated.attachments = Array.isArray(message.attachments)
    ? message.attachments
    : [];
  validated.message_segments = Array.isArray(message.message_segments)
    ? message.message_segments
    : [];

  // _debug object, assign if exists
  validated._debug = message._debug || {};

  // Optional: assign a message ID if needed for internal tracking
  validated._id = generateUUID();

  return validated;
}

module.exports = {
  isValidISODateTime,
  parseISODateTime,
  generateUUID,
  ensureDirectoryExistence,
  validateMessageFields,
};
