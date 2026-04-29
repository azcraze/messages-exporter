# messages-exporter

A Node.js CLI tool that reads Apple iMessage/SMS data from iOS SQLite backup databases (`chat.db`) and converts it to a standardised JSON format for downstream analysis. Supports iOS 6 through iOS 17+ and macOS direct access (`~/Library/Messages/chat.db`).

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [CLI Reference](#cli-reference)
- [Data Flow](#data-flow)
- [Entry Points](#entry-points)
- [Library (`lib/`)](#library-lib)
- [Processing Modules (`modules/`)](#processing-modules-modules)
- [Utilities (`utils/`)](#utilities-utils)
- [Scripts (`scripts/`)](#scripts-scripts)
- [Output Files](#output-files)
- [Message Schema](#message-schema)
- [iOS Version Support](#ios-version-support)

---

## Installation

```bash
npm install
```

> `sqlite3` is a native module — requires `node-gyp` and C++ build tools. On Linux, ensure `build-essential` and `python3` are available.

---

## Quick Start

```bash
# Import from an iOS backup directory
node index.js /path/to/ios/backup

# Import directly from macOS chat.db
node index.js ~/Library/Messages/chat.db

# Run the full analysis pipeline on a previously saved import
node run.js
```

---

## CLI Reference

**Usage:** `node index.js <path> [options]`

| Flag | Description |
|------|-------------|
| `-d, --debug` | Verbose/debug logging |
| `-l, --limit <n>` | Limit number of results returned |
| `-i, --ids <ids>` | Filter by message IDs (comma-separated) |
| `-s, --sinceDate [YYYY-MM-DD]` | Only include messages on or after this date |
| `-f, --search <text>` | Full-text search across `message_text` and `attributedBody` |
| `-p, --phone <number>` | Filter by participant phone number |
| `-t, --test` | Validation/test mode |
| `-w, --save` | Write output to file |

**npm scripts:**

| Command | Description |
|---------|-------------|
| `npm run import` | Runs `index.js` |
| `npm run analyze` | Runs the full live-import + analysis pipeline (`main.js`) |
| `npm run run` | Reprocesses from a previously saved `data/data.json` (`run.js`) |
| `npm test` | Runs the Mocha test suite |

---

## Data Flow

```
iOS iMessage SQLite backup  (or  ~/Library/Messages/chat.db)
        │
        ▼
  openDB()  ──►  getVersion()
        │
        ▼
  Route by iOS version:
    iOS ≤ 5  →  ios5_imessage.sql
    iOS ≥ 6  →  ios10.sql  (via load-from-modern-osx.js)
        │
        ▼
  Converter.prepareRow()  →  buildPayload()
        │
        ▼
  forever-chat-format.prepare()   ← external normalisation
        │
        ▼
  Standard Message Array (JSON)
        │
        ├──► getSimplifiedMessages()
        ├──► groupConversationsByTime()
        ├──► countMessagesPerDay()
        ├──► filterLargeConversations()
        └──► highCharMessages()
                │
                ▼
          ./output/*.json
```

---

## Entry Points

### `index.js` — CLI & `importData()`

The main CLI entry point. Parses command-line flags and delegates to the appropriate loader based on iOS version.

#### `importData(filePath, options)`

Imports raw messages from a database file or directory.

| Parameter | Type | Description |
|-----------|------|-------------|
| `filePath` | string | Path to `chat.db` or an iOS backup directory |
| `options` | object | Import options (see table below) |

**Options object:**

| Key | Type | Description |
|-----|------|-------------|
| `debug` | boolean | Enable verbose logging |
| `limit` | number | Maximum rows to return |
| `sinceDate` | string | ISO date — only messages on/after this date |
| `search` | string | Full-text search string |
| `ids` | string | Comma-separated message IDs to filter |
| `phone` | string | Phone number to filter by participant |
| `showProgress` | boolean | Show progress bar during import |

Returns a `Promise` that resolves to an array of normalised message objects.

Automatically detects whether `filePath` is a directory (looks for the known iOS backup hash path) or a direct `.db` file.

---

### `main.js` — Live Import + Full Pipeline

Imports messages directly from the database and runs the complete analysis pipeline, saving all outputs to `./output/`. Intended for interactive/local use.

**Workflow:**
1. Calls `importData()` to read from the database.
2. Saves raw data to `data/data.json`.
3. Runs `runPipeline()` across all processing modules.
4. Writes five output JSON files to `./output/`.

---

### `run.js` — Reprocess from File

Reads a previously saved `data/data.json` (or a path passed as `process.argv[2]`) and reruns the full pipeline — useful when iterating on analysis without re-reading the database.

**Workflow:**
1. Reads JSON from `./data/data.json` (or a custom path).
2. Runs `runPipeline()`.
3. Writes output JSON files to `./output/`.
4. Logs item counts for each output file.

---

## Library (`lib/`)

### `lib/open-db.js`

Opens a SQLite3 database in read-only mode.

#### `openDB(path)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `path` | string | Filesystem path to the `.db` file |

Returns a `Promise` resolving to a SQLite3 `Database` object. Always opens in `SQLITE_OPEN_READONLY` — never modifies the source backup.

---

### `lib/get-version.js`

Detects the iOS/macOS version from the `_ClientVersion` property stored in the database.

#### `getVersion(db)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `db` | Database | Open SQLite3 database object |

Returns a `Promise` resolving to a numeric OS version (e.g., `17.0` for iOS 17, `9.0` for iOS 9).

Internally maps raw `_ClientVersion` integers to their corresponding OS version via `getOSVersionForClientVersion()`.

---

### `lib/load-query.js`

Loads SQL query files from `queries/` and applies dynamic filters before execution.

#### `getQuery(queryFile, options)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `queryFile` | string | SQL filename (e.g., `"ios10.sql"`) |
| `options` | object | Filter options |

**Options:**

| Key | Type | Description |
|-----|------|-------------|
| `sinceDate` | string | ISO date lower bound |
| `search` | string | Full-text search — matches `text` and `attributedBody` (iOS 16+) |
| `phone` | string | Filter by participant handle |
| `ids` | string | Comma-separated message IDs |
| `limit` | number | `LIMIT` clause value |
| `order` | string | `ORDER BY` direction |
| `group` | boolean | Whether to include `GROUP BY` |

Returns the final SQL query string with all requested clauses injected.

---

### `lib/load-from-modern-osx.js`

Main data-loading function for iOS 6+. Executes the query and converts all rows using the `Converter` class.

#### `fetchResults(db, version, options)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `db` | Database | Open SQLite3 database object |
| `version` | number | Detected OS version |
| `options` | object | Options passed through to `getQuery()` and `Converter` |

Returns a `Promise` resolving to an array of normalised message objects.

**Steps:**
1. Loads the `ios10.sql` query via `getQuery()`.
2. Counts total rows for progress tracking.
3. Constructs a `Converter` instance and calls `prepareRow()` for each row.
4. Calls `buildPayload()` to produce the final message array.

---

### `lib/converter.js` — `Converter` Class

The core class responsible for transforming raw SQLite rows into normalised message objects. Handles attachments, participants, reactions, address normalisation, and deduplication.

#### `constructor(options)`

| Option | Type | Description |
|--------|------|-------------|
| `showProgress` | boolean | Whether to display a progress bar |

#### Progress Methods

| Method | Description |
|--------|-------------|
| `initializeProgress(rowCount)` | Initialise the progress bar for `rowCount` total rows |
| `updatePrepareProgress()` | Advance progress during the row-preparation phase |
| `updateExportProgress()` | Advance progress during the payload-building phase |

#### Hashing / Deduplication

| Method | Description |
|--------|-------------|
| `internalIdentifier(row)` | SHA1 of `address + date + message_text + service` — used as a deduplication key during import |
| `uniqueId(message)` | SHA1 of `sender + receiver + date + message_text + service` — stored on the final message as `sha` |

#### Row-Mapping Methods

These methods are called once per row inside `prepareRow()` and populate internal lookup maps used later by `buildPayload()`.

| Method | Description |
|--------|-------------|
| `mapMessage(id, row)` | Store raw row data keyed by internal SHA |
| `mapMessageGuid(id, row)` | Map Apple GUID → internal SHA |
| `mapMessageGuidToSha(guid, sha)` | Map Apple GUID → final `sha` (used for reaction linking) |
| `mapUserAddresses(row)` | Build address usage statistics: `{count, min_date, max_date, type}` |
| `mapAttachment(id, row)` | Accumulate attachments (`{path, type}`) keyed by message SHA |
| `mapParticipants(row)` | Track unique participants per `message_group` |
| `rememberOrder(id)` | Record insertion order for stable output ordering |

#### Lookup Methods

| Method | Description |
|--------|-------------|
| `lookupParticipants(message_group)` | Returns sorted unique participant handles for a group |
| `lookupAttachments(sha)` | Returns attachment array for a given message SHA |

#### Payload-Building Methods

| Method | Description |
|--------|-------------|
| `prepareRow(row)` | Process a single database row — calls all `map*` methods |
| `buildAttachmentRow(row)` | Returns `{path, type}` from a raw row |
| `buildContentSegments(message, row)` | Constructs `message_segments` array containing `text`, `file`, and `reaction` segment objects |
| `setSenderAndReceiver(message)` | Populates `sender` and `receiver` fields based on `is_from_me` and participant list |
| `formatAddress(value)` | Normalises phone numbers (E.164 via `phone` library) and strips `E:`/`P:` prefixes from emails |
| `inferMeAddress(message, row)` | Infers the user's own address from service type and address date ranges |
| `buildPayload()` | Final step — iterates all stored messages and returns the complete normalised array |

**`buildPayload()` output fields per message:**

| Field | Description |
|-------|-------------|
| `is_from_me` | `true` if sent by the device owner |
| `message_text` | Plain text content |
| `date` | ISO 8601 timestamp |
| `date_read` | ISO 8601 read timestamp (if available) |
| `service` | `"iMessage"` or `"SMS"` |
| `reply_to_guid` | GUID of the parent message (threaded replies) |
| `thread_originator_guid` | GUID of the thread root |
| `participants` | Sorted array of participant handles |
| `sender` | Sender address |
| `receiver` | Receiver address |
| `attachments` | Array of `{path, type}` |
| `message_segments` | Ordered content segments (text, file, reaction) |
| `sha` | Unique SHA1 ID |
| `associated_sha` | SHA1 of the message this reaction targets |

---

## Processing Modules (`modules/`)

Each module is a pure function: array in, array out. They are composed in sequence during `runPipeline()`.

---

### `modules/getSimplifiedMessages.js`

#### `getSimplifiedMessages(messages)`

Cleans and sorts all messages chronologically.

| Parameter | Type | Description |
|-----------|------|-------------|
| `messages` | array | Raw message objects |

Returns a sorted array of cleaned messages (oldest first). Messages with `'Unknown Date'` are placed at the end. Calls `cleanMessage()` from `utils/messageCleaner.js` on each entry.

---

### `modules/countMessagesPerDay.js`

#### `countMessagesPerDay(messages)`

Counts how many messages were sent/received each calendar day.

| Parameter | Type | Description |
|-----------|------|-------------|
| `messages` | array | Message objects with a valid `date` field |

Returns a chronologically sorted array of:
```json
{
  "date": "Mon, Jan 01, 2023",
  "isoDate": "2023-01-01",
  "message_count": 42
}
```

---

### `modules/messageFiltering.js`

Four standalone filter functions for slicing the message array.

#### `filterMessagesByParticipant(messages, phoneNumber)`

Returns only messages where `phoneNumber` appears in the participant list or as sender/receiver.

#### `filterMessagesByDateRange(messages, startDateStr, endDateStr)`

Returns messages whose `date` falls within the inclusive range `[startDateStr, endDateStr]`. Either bound may be `null` for an open-ended range.

#### `filterMessagesByText(messages, searchText)`

Case-insensitive substring search over `message_text`.

#### `getMessagesWithAttachments(messages)`

Returns only messages that have at least one entry in their `attachments` array.

---

### `modules/groupConversationsByTime.js`

#### `groupMessagesByInactivity(messages, dateStr, gapHours = 3)`

Groups a stream of messages into discrete conversations. A new conversation begins whenever the gap between consecutive messages exceeds `gapHours`.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `messages` | array | — | Messages with a `date` field, pre-sorted |
| `dateStr` | string | — | Label string used in logging |
| `gapHours` | number | `3` | Inactivity threshold in hours |

Returns:
```json
{
  "date": "2023-01-01",
  "conversations": [
    { "conversationID": 1, "conversationMsgs": [...] },
    { "conversationID": 2, "conversationMsgs": [...] }
  ]
}
```

---

### `modules/filterLargeConversations.js`

#### `filterGroupedConversations(groupedConversations, minMessages = 15)`

Filters out short conversations and reformats the result.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `groupedConversations` | array | — | Output from `groupMessagesByInactivity()` |
| `minMessages` | number | `15` | Minimum messages for a conversation to be included |

Returns conversations with at least `minMessages` messages, each formatted as:
```json
{
  "date": "Mon, Jan 01, 2023",
  "conversation_msgs": [...]
}
```

---

### `modules/highCharMessages.js`

#### `getHighCharMessages(messages)`

Extracts messages with a long body (≥ 300 characters).

| Parameter | Type | Description |
|-----------|------|-------------|
| `messages` | array | Cleaned message objects |

Returns:
```json
[
  {
    "date": "Mon, Jan 01, 2023",
    "timestamp": "2023-01-01T14:32:00.000Z",
    "sender": "+15551234567",
    "message_text": "...",
    "message_length": 450
  }
]
```

---

## Utilities (`utils/`)

### `utils/messageCleaner.js`

#### `cleanMessage(rawMsg)`

Validates and normalises a single raw message object into the standard schema.

| Parameter | Type | Description |
|-----------|------|-------------|
| `rawMsg` | object | Raw message from the converter or a file |

Returns a normalised object with guaranteed fields:

| Field | Default if missing |
|-------|--------------------|
| `_id` | New UUID v4 |
| `is_from_me` | `false` |
| `message_text` | `""` |
| `date` | `"Unknown Date"` |
| `sender` | `null` |
| `receiver` | `null` |
| `participants` | `[]` |
| `service` | `null` |
| `attachments` | `[]` |
| `message_segments` | `[]` |
| `sha` | `null` |
| `associated_sha` | `null` |
| `reply_to_guid` | `null` |
| `thread_originator_guid` | `null` |

---

### `utils/validationUtils.js`

General-purpose validation and helper utilities.

#### `isValidISODateTime(dateStr)`

Returns `true` if `dateStr` is a parseable ISO 8601 date-time string.

#### `parseISODateTime(dateStr)`

Parses `dateStr` and returns an ISO 8601 string, or `null` if invalid.

#### `generateUUID()`

Returns a new UUID v4 string.

#### `ensureDirectoryExistence(dirPath)`

Creates `dirPath` (and any missing parents) if it does not exist.

#### `validateMessageFields(message)`

Validates every field on a message object and fills missing values with safe defaults. Returns the sanitised object.

---

### `utils/dateHelpers.js`

A convenience re-export of commonly used `date-fns` functions. Always import date utilities from here rather than directly from `date-fns`.

| Export | Description |
|--------|-------------|
| `parseISO(dateString)` | Parse an ISO date string into a `Date` |
| `isValid(date)` | Check if a `Date` is valid |
| `isAfter(date1, date2)` | `date1 > date2` |
| `isBefore(date1, date2)` | `date1 < date2` |
| `startOfDay(date)` | Midnight of the given day |
| `startOfWeek(date)` | Start of the ISO week |
| `startOfMonth(date)` | First millisecond of the month |
| `startOfYear(date)` | First millisecond of the year |
| `format(date, formatStr)` | Format using a `date-fns` pattern string |
| `getHours(date)` | Hour component (0–23) |
| `getDay(date)` | Day of week (0 = Sunday) |
| `differenceInMinutes(date1, date2)` | Signed minute difference |
| `differenceInDays(date1, date2)` | Signed day difference |
| `addDays(date, amount)` | Returns a new date shifted by `amount` days |
| `parseAndValidateDate(dateStr)` | Returns `{date: Date, isValid: boolean}` |

---

### `utils/fileIO.js`

File I/O helpers for reading and writing JSON.

#### `readJsonFile(filePath)`

Synchronously reads and parses a JSON file at `filePath`. Throws on parse error.

#### `ensureDir(dirPath)`

Creates `dirPath` if it does not exist (equivalent to `mkdir -p`).

#### `saveJSON(data, filename, outputDir = './output')`

Serialises `data` to formatted JSON (2-space indent) and writes it to `outputDir/filename`.

---

### `utils/countOutputItems.js`

#### `countItemsInOutputFiles(dirPath)`

Counts items in every `.json` file found in `dirPath`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `dirPath` | string | Path to the output directory |

Returns an object mapping each filename to its item count. Arrays return their `.length`; objects return their key count. Returns `-1` for files with JSON parse errors.

---

### `utils/getConversationSummary.js`

#### `generateConversationCounts(inputFilePath)`

Reads a `conversations.json` file and summarises how many messages are in each conversation.

| Parameter | Type | Description |
|-----------|------|-------------|
| `inputFilePath` | string | Path to `conversations.json` |

Returns an array of `{conversationId, messageCount}` objects.

---

## Scripts (`scripts/`)

### `scripts/groupConversations.js`

Standalone script that reads `data/data.json`, simplifies and groups messages by inactivity, and saves the result to `output/conversations.json`.

**Run:** `node scripts/groupConversations.js`

**Steps:**
1. Reads `data/data.json`.
2. Calls `getSimplifiedMessages()` to clean and sort.
3. Calls `groupMessagesByInactivity()` to split into conversations.
4. Writes `output/conversations.json` with fields: `conversationId`, `date`, `conversationMsgs`, `messageCount`.

---

## Output Files

All outputs are written to `./output/` (gitignored).

| File | Produced by | Description |
|------|-------------|-------------|
| `simplified_messages.json` | `getSimplifiedMessages()` | All messages, cleaned and sorted chronologically |
| `conversations.json` | `groupMessagesByInactivity()` | Messages grouped into conversations by 3-hour inactivity gap |
| `daily_counts.json` | `countMessagesPerDay()` | Message counts per calendar day |
| `large_conversations.json` | `filterGroupedConversations()` | Conversations with ≥ 15 messages |
| `long_char_messages.json` | `getHighCharMessages()` | Messages with ≥ 300 characters |

---

## Message Schema

Defined in `data/schema.yaml` (JSON Schema Draft-07).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | string (UUID) | yes | Unique identifier, added by `cleanMessage()` |
| `is_from_me` | boolean | yes | Whether the device owner sent this message |
| `message_text` | string | yes | Plain text body |
| `date` | string (ISO 8601) | yes | Send timestamp |
| `date_read` | string (ISO 8601) | no | Read receipt timestamp |
| `sender` | string | no | Sender address (phone or email) |
| `receiver` | string | no | Receiver address |
| `participants` | string[] | no | All handles in the conversation |
| `service` | `"iMessage"` \| `"SMS"` | no | Delivery service |
| `attachments` | `{path, type}[]` | no | File attachments |
| `message_segments` | `{type, text, file_type, path, reaction_type}[]` | no | Ordered content segments |
| `sha` | string | no | Unique SHA1 for this message |
| `associated_sha` | string | no | SHA1 of the target message (reactions) |
| `reply_to_guid` | string | no | Apple GUID of parent message (threaded replies) |
| `thread_originator_guid` | string | no | Apple GUID of the thread root |

---

## iOS Version Support

| iOS Version | SQL File | Loader |
|-------------|----------|--------|
| iOS 4–5 | `queries/ios5_imessage.sql` | Direct in `index.js` |
| iOS 6–9 | `queries/ios10.sql` | `lib/load-from-modern-osx.js` |
| iOS 10–17+ | `queries/ios10.sql` | `lib/load-from-modern-osx.js` |

Version is detected at runtime via `lib/get-version.js` by reading `_ClientVersion` from the database.

> **Apple epoch note:** iMessage timestamps are seconds since 2001-01-01, not the Unix epoch. The `978307200` offset is applied inside the SQL queries — do not apply it again in JavaScript.
