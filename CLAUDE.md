# CLAUDE.md — AI Assistant Guide for messages-exporter

## Project Overview

`messages-exporter` (published as `forever-chat-imessage-export`) is a Node.js CLI tool that reads Apple iMessage/SMS data from iOS SQLite backup databases and converts it to a standardized JSON format compatible with the `forever-chat-format` schema. It supports iOS 5 (Madrid format) through iOS 10+.

---

## Repository Structure

```
/
├── index.js                    # CLI entry point (Commander.js)
├── main.js                     # Alternative pipeline runner
├── run.js                      # Full processing pipeline (reads data.json)
├── generate-examples.js        # Mock data generator for manual testing
├── package.json
├── data/
│   └── schema.yaml             # JSON Schema (Draft-07) for message format
├── lib/                        # Core database-access and conversion logic
│   ├── converter.js            # Main message converter class (~481 lines)
│   ├── open-db.js              # SQLite DB opener (promisified, read-only)
│   ├── get-version.js          # Detects iOS version from _ClientVersion
│   ├── load-query.js           # Loads SQL files, injects dynamic filters
│   └── load-from-modern-osx.js # Entry for iOS 10+ database loading
├── modules/                    # Pure data-transformation modules
│   ├── getSimplifiedMessages.js
│   ├── countMessagesPerDay.js
│   ├── messageFiltering.js
│   ├── groupConversationsByTime.js
│   ├── filterLargeConversations.js
│   └── highCharMessages.js
├── utils/                      # Shared utilities
│   ├── messageCleaner.js       # Validates/normalizes raw message rows
│   ├── validationUtils.js      # ISO date validation, UUID gen, field checks
│   ├── dateHelpers.js          # date-fns re-exports + parseAndValidateDate
│   ├── fileIO.js               # readJsonFile with error handling
│   ├── countOutputItems.js     # Counts items in output JSON files
│   └── getConversationSummary.js
├── queries/                    # Raw SQL queries
│   ├── ios10.sql               # iOS 10+ (current schema)
│   └── ios5_imessage.sql       # iOS 5 Madrid format
└── scripts/
    └── groupConversations.js   # Standalone conversation-grouping script
```

---

## Data Flow

```
iOS iMessage SQLite backup
        ↓
openDB()  →  getVersion()
        ↓
Route:  iOS ≤ 5  →  ios5_imessage.sql
        iOS ≥ 6  →  ios10.sql  (via load-from-modern-osx.js)
        ↓
Converter.prepareRow()  →  buildPayload()
        ↓
forever-chat-format.prepare()   ← external package normalisation
        ↓
Standard Message Array (JSON)
        ↓
Processing pipeline (modules/):
  ├── getSimplifiedMessages()
  ├── groupConversationsByTime()
  ├── countMessagesPerDay()
  ├── filterLargeConversations()
  └── highCharMessages()
        ↓
./output/*.json
```

---

## Development Setup

```bash
# Install dependencies
npm install

# Run tests
npm test   # mocha with 90-second timeout

# Run the CLI on an iOS backup
node index.js /path/to/ios/backup [options]

# Run the full post-import pipeline
node run.js   # reads ./data/data.json, writes ./output/
```

---

## CLI Options (`index.js`)

| Flag | Description |
|------|-------------|
| `-d, --debug` | Verbose/debug logging |
| `-l, --limit <n>` | Limit number of results |
| `-i, --ids <ids>` | Filter by message IDs (comma-separated) |
| `-s, --sinceDate [YYYY-MM-DD]` | Only messages since this date |
| `-f, --search <text>` | Full-text search filter |
| `-p, --phone <number>` | Filter by participant phone number |
| `-t, --test` | Validation/test mode |
| `-w, --save` | Write output to file |

---

## Key Conventions

### Module System
- **CommonJS only** — all files use `require()`/`module.exports`. No ES modules.
- No TypeScript, no transpilation step.

### Async Patterns
- **Bluebird Promises** (`bluebird`) for async database operations.
- `lib/` files typically return Bluebird promise chains.
- `run.js` and `main.js` use `async/await`.

### Utility Libraries
- **lodash** for collection manipulation (`_.groupBy`, `_.map`, `_.filter`, etc.).
- **date-fns v4** for all date operations — import via `utils/dateHelpers.js`, not directly.
- **phone** library for E.164 phone number normalisation.

### Message Deduplication
Two hash strategies in `lib/converter.js`:
- `internalIdentifier(row)` — deduplication key during import (address + date + text + service).
- `uniqueId(message)` — final SHA1 stored on message (sender + receiver + date + text + service).

### Address Normalisation
Phone/email addresses go through `formatAddress()` in `converter.js`:
- `E:user@example.com` prefix → strip prefix, keep email.
- `P:+15551234567` prefix → strip prefix, normalise via `phone` library.
- Plain strings → pass through as-is.

### Participant Separator
Group chat participants are stored in SQL as a pipe-delimited string using the sentinel `|*--*|`. Split on this to get individual handles.

### Attachment Handling
A single message with multiple attachments arrives as multiple SQL rows with the same message ID. `converter.js` merges these via `attachmentMap` keyed on internal ID.

### Reaction Messages
Reactions use `associated_message_guid` to reference the original message. The `reaction_type` field is decoded to human-readable names: `loved`, `liked`, `disliked`, `laughed`, `emphasized`, `questioned`.

### Output Files
All pipeline outputs are written to `./output/` as JSON. Do not commit this directory (it is gitignored).

---

## Message Schema

Defined in `data/schema.yaml` (JSON Schema Draft-07). Key fields:

| Field | Type | Required |
|-------|------|----------|
| `_id` | string (UUID) | yes (added by messageCleaner) |
| `is_from_me` | boolean/integer | yes |
| `message_text` | string | yes |
| `date` | string (ISO 8601) | yes |
| `sender` | string | no |
| `receiver` | string | no |
| `participants` | array of strings | no |
| `service` | `"iMessage"` \| `"SMS"` | no |
| `attachments` | array of `{ path, type }` | no |
| `message_segments` | array of `{ type, text, file_type, path, reaction_type }` | no |
| `sha` | string | no |
| `associated_sha` | string | no |

---

## iOS Version Support

| iOS Version | SQL Query | Loader |
|-------------|-----------|--------|
| iOS 4–5 | `ios5_imessage.sql` | direct in `index.js` |
| iOS 6–9 | `ios10.sql` | `load-from-modern-osx.js` |
| iOS 10+ | `ios10.sql` | `load-from-modern-osx.js` |

Version detection reads `_ClientVersion` from the SQLite database (`lib/get-version.js`).

---

## Testing

- Framework: **Mocha** (`npm test`)
- Assertions: **Chai** + **chai-as-promised** for promise-based assertions
- Timeout: 90 seconds (database I/O can be slow)
- Test files: expected in `test/` directory (not committed in this repo)
- No test coverage tooling configured

When adding tests, follow the Mocha + Chai pattern and use `chai-as-promised` for any async assertions. Do not use Jest or other frameworks.

---

## Dependencies to Know

| Package | Purpose |
|---------|---------|
| `sqlite3` | SQLite3 bindings (native module — requires build tools) |
| `forever-chat-format` | External schema normalisation (called after import) |
| `bluebird` | Promise library used in lib/ |
| `lodash` | Data manipulation utilities |
| `date-fns` | Date parsing and formatting |
| `commander` v2 | CLI argument parsing (note: v2 API, not v7+) |
| `bfj` | Big-file JSON streaming writer |
| `phone` | Phone number normalisation to E.164 |
| `ts-progress` | Console progress bars during import |
| `crypto` | Built-in Node module, used for SHA1 hashing |

---

## Important Gotchas

1. **`sqlite3` is a native module.** `npm install` requires `node-gyp` and C++ build tools. On Linux, ensure `build-essential` and `python3` are available.

2. **`commander` v2 API** — option parsing differs from modern Commander (v7+). Do not upgrade without testing all CLI flag behaviour.

3. **Apple epoch offset** — iMessage timestamps are seconds since 2001-01-01, not the Unix epoch. The SQL queries apply the `978307200` offset. Do not apply it again in JavaScript.

4. **Read-only DB access** — `open-db.js` opens SQLite in read-only mode (`OPEN_READONLY`). Never change this; the source file is a user's backup.

5. **No environment variables** — all configuration is via CLI flags. There is no `.env` support.

6. **`output/` and `data/data.json` are gitignored** — do not try to commit processed data files.

---

## Common Tasks

### Add a new SQL filter
1. Add the filter logic to `lib/load-query.js` in the `buildQuery()` function.
2. Thread the new option through `index.js` CLI parsing.
3. Pass the option object into `loadFromModernOSX()` or the iOS 5 loader.

### Add a new processing module
1. Create `modules/yourModule.js` exporting a single function.
2. Keep modules pure: input array → output array.
3. Add the module call to `run.js` and/or `main.js` as appropriate.
4. Save output via `fileIO` to `./output/yourOutput.json`.

### Modify the message schema
1. Update `data/schema.yaml`.
2. Update `utils/messageCleaner.js` to handle new fields with defaults.
3. Update `utils/validationUtils.js` `validateMessageFields()` if field is required.
