# messages-exporter — Implementation Roadmap

> Status legend: ✅ Done · 🔄 In-progress · ⬜ Pending
> Update this file as each task is completed.

---

## Epic 1 — Codebase Cleanup & Structural Repair ✅

> Remove dead code, fix broken imports, establish consistent conventions.

| # | Task | Status |
|---|------|--------|
| 1.1 | Audit all `require()` paths and fix broken references | ✅ |
| 1.2 | Remove `forever-chat-format` external dependency (not in npm, dead) | ✅ |
| 1.3 | Add `lib/debug-log.js` (conditional logger wrapping console) | ✅ |
| 1.4 | Fix `phone` library call-site (`normalizePhone(v)` → `normalizePhone(v).phoneNumber`) | ✅ |
| 1.5 | Add `uuid` package and wire into `messageCleaner.js` for `_id` generation | ✅ |
| 1.6 | Standardise all date operations through `utils/dateHelpers.js` | ✅ |
| 1.7 | Fix `commander` v2 option-parsing in `index.js` | ✅ |
| 1.8 | Clean `package.json` scripts (`import`, `run`) | ✅ |

---

## Epic 2 — Modern iMessage Database Support (iOS 14–17+) ✅

> Bring the SQL queries and conversion layer up to date with the current
> `chat.db` schema. Remove dead iOS ≤5 paths.

| # | Task | Status |
|---|------|--------|
| 2.1 | Add `m.attributedBody` to `ios10.sql` SELECT | ✅ |
| 2.2 | Fix `date_read` / `date_played` / `date_delivered` timestamps (÷ 1 000 000 000) | ✅ |
| 2.3 | Add `m.reply_to_guid` and `m.thread_originator_guid` to SELECT | ✅ |
| 2.4 | Extend `WHERE` clause to include `attributedBody IS NOT NULL` | ✅ |
| 2.5 | Add iOS 17 emoji tapback types (2006 / 3006) to reaction `CASE` | ✅ |
| 2.6 | Create `lib/parse-attributed-body.js` (NSKeyedArchiver → plain text) | ✅ |
| 2.7 | Update `lib/converter.js` — attributedBody fallback + thread fields | ✅ |
| 2.8 | Rewrite `lib/get-version.js` — remove dead iOS 4/5 branches | ✅ |
| 2.9 | Rewrite `data/schema.yaml` — array root, all new fields documented | ✅ |

---

## Epic 3 — Pipeline Unification & Final Cleanup ✅

> Consolidate the dual pipeline (main.js / run.js), remove broken files,
> and leave exactly one canonical path from DB → output.

| # | Task | Status |
|---|------|--------|
| 3.1 | Delete `generate-examples.js` (hardcoded paths to non-existent directory) | ✅ |
| 3.2 | Remove stale iOS 5 SQL comment block from top of `lib/converter.js` | ✅ |
| 3.3 | Extract shared `saveJSON` / `ensureOutputDir` into `utils/fileIO.js` | ✅ |
| 3.4 | Create `lib/pipeline.js` — ordered list of transform steps, returns results map | ✅ |
| 3.5 | Refactor `run.js` to use `lib/pipeline.js` (reads `data/data.json` → output/) | ✅ |
| 3.6 | Refactor `main.js` to use `lib/pipeline.js` (reads live DB → output/) | ✅ |
| 3.7 | Add `npm run analyze` script pointing at `main.js` with `system` path | ✅ |
| 3.8 | Verify `npm install` resolves `bplist-parser` and all existing deps cleanly | ✅ |

---

## Epic 4 — NLP Infrastructure ✅

> Build the natural-language analysis layer that all higher-level features
> depend on. Keep each module single-purpose and composable.

**New dependencies:** `natural` (tokenising, stemming, n-grams, AFINN sentiment),
`compromise` (POS tagging, named-entity recognition), `fuse.js` (fuzzy search).

| # | Task | Status |
|---|------|--------|
| 4.1 | Add `natural`, `compromise`, `fuse.js` to `package.json` | ✅ |
| 4.2 | Create `lib/nlp-engine.js` — initialises and exports configured NLP tools | ✅ |
| 4.3 | Create `modules/nlp/tokenizer.js` — normalise, lowercase, remove punctuation, return token array | ✅ |
| 4.4 | Create `modules/nlp/wordFrequency.js` — token → count map, sorted top-N list, stop-word filter | ✅ |
| 4.5 | Create `modules/nlp/phraseExtractor.js` — bigram + trigram frequency, returns top-N phrases | ✅ |
| 4.6 | Create `modules/nlp/posAnalysis.js` — POS distribution per message set via `compromise` | ✅ |
| 4.7 | Create `modules/nlp/entityExtractor.js` — people / places / organisations via `compromise` | ✅ |
| 4.8 | Create `modules/nlp/sentimentAnalysis.js` — AFINN score per message, aggregate per day/participant | ✅ |
| 4.9 | Create `modules/nlp/patternFinder.js` — regex + keyword scan, returns matching messages with context | ✅ |
| 4.10 | Create `modules/nlp/fuzzySearch.js` — `fuse.js` index over `message_text`, returns ranked results | ✅ |

---

## Epic 5 — Statistical Analysis ✅

> Pure-data modules; no NLP required. Each takes a simplified message array
> and returns a plain JS object suitable for JSON serialisation.

| # | Task | Status |
|---|------|--------|
| 5.1 | Create `modules/stats/messageVolume.js` — counts by day / week / month / year | ✅ |
| 5.2 | Create `modules/stats/timeOfDay.js` — hourly distribution (0–23), peak hour | ✅ |
| 5.3 | Create `modules/stats/dayOfWeek.js` — Mon–Sun distribution, most active day | ✅ |
| 5.4 | Create `modules/stats/participantStats.js` — message count, send ratio, first/last seen per participant | ✅ |
| 5.5 | Create `modules/stats/responseTime.js` — median + mean response time per participant pair | ✅ |
| 5.6 | Create `modules/stats/attachmentStats.js` — count + breakdown by MIME type | ✅ |
| 5.7 | Create `modules/stats/conversationStats.js` — distribution of conversation lengths, median size | ✅ |
| 5.8 | Create `modules/stats/emojiStats.js` — extract all emoji, frequency ranking | ✅ |
| 5.9 | Create `modules/stats/streaks.js` — longest consecutive active days, longest gap | ✅ |

---

## Epic 6 — Query Interface ✅

> A chainable query layer that sits between raw messages and analysis/reports.
> Exposed via `lib/query-engine.js` and wired into the CLI.

| # | Task | Status |
|---|------|--------|
| 6.1 | Create `lib/query-engine.js` — builder pattern: `.filter(fn).limit(n).run()` | ✅ |
| 6.2 | Add date-range filter (reuse `modules/messageFiltering.js`) | ✅ |
| 6.3 | Add participant filter | ✅ |
| 6.4 | Add exact-text search filter | ✅ |
| 6.5 | Add fuzzy-text search filter (delegates to `modules/nlp/fuzzySearch.js`) | ✅ |
| 6.6 | Add regex/pattern search filter | ✅ |
| 6.7 | Wire `--query` / `--fuzzy` / `--pattern` flags into `index.js` CLI | ✅ |
| 6.8 | Update `lib/load-query.js` search filter to also handle `attributedBody`-only messages | ✅ |

---

## Epic 7 — Report Generation ✅

> Three output formats: JSON (machine-readable), TXT (plain readable), and
> Markdown (structured, hierarchy-driven, human-presentable).
> All reporters receive the same data shape; the format is swappable.

**Design rules for Markdown reports:**
- H1 = report title + date range
- H2 = major sections (Overview, By Participant, Timeline, NLP, etc.)
- H3 = subsections
- Tables for tabular data; bullet lists for ranked items
- Callout blocks (`> **Insight:** …`) for key findings
- No inline HTML

| # | Task | Status |
|---|------|--------|
| 7.1 | Create `lib/reporters/base-reporter.js` — shared helpers: `formatDate`, `formatNumber`, `table`, `ranked-list` | ✅ |
| 7.2 | Create `lib/reporters/json-reporter.js` — wraps data with metadata envelope (generated_at, message_count, date_range) | ✅ |
| 7.3 | Create `lib/reporters/text-reporter.js` — fixed-width text, aligned columns | ✅ |
| 7.4 | Create `lib/reporters/markdown-reporter.js` — full Markdown output following design rules above | ✅ |
| 7.5 | Create `reports/summary-report.js` — total messages, date span, participant list, top day | ✅ |
| 7.6 | Create `reports/word-frequency-report.js` — top-50 words, top-20 phrases, stop-word-filtered | ✅ |
| 7.7 | Create `reports/participant-report.js` — per-participant breakdown (volume, ratio, response time) | ✅ |
| 7.8 | Create `reports/timeline-report.js` — monthly volume chart (ASCII sparkline in TXT/MD), daily heatmap data | ✅ |
| 7.9 | Create `reports/sentiment-report.js` — overall tone, per-participant sentiment, trend over time | ✅ |
| 7.10 | Create `reports/entity-report.js` — named people/places mentioned, frequency | ✅ |
| 7.11 | Add `--report <type>` and `--format <json\|txt\|md>` flags to CLI | ✅ |
| 7.12 | Write output to `./output/reports/` with timestamped filenames | ✅ |

---

## Epic 8 — Testing ✅

> Mocha + Chai + chai-as-promised. No Jest. Tests live in `test/`.
> Fixtures are static JSON files in `test/fixtures/`.

| # | Task | Status |
|---|------|--------|
| 8.1 | Create `test/fixtures/` with mock raw DB rows and simplified messages | ✅ |
| 8.2 | `test/utils/messageCleaner.test.js` — field defaults, UUID assignment, type coercion | ✅ |
| 8.3 | `test/lib/parse-attributed-body.test.js` — known bplist buffers → expected strings, null/corrupt input | ✅ |
| 8.4 | `test/lib/converter.test.js` — formatAddress, internalIdentifier, buildPayload with fixture rows | ✅ |
| 8.5 | `test/modules/nlp/wordFrequency.test.js` — frequency counts, stop-word filtering, top-N | ✅ |
| 8.6 | `test/modules/nlp/phraseExtractor.test.js` — bigram/trigram extraction from known sentences | ✅ |
| 8.7 | `test/modules/stats/*.test.js` — one test file per stats module, known-input assertions | ✅ |
| 8.8 | `test/lib/query-engine.test.js` — chained filters return correct subsets | ✅ |
| 8.9 | `test/reporters/*.test.js` — each reporter produces expected structure/keys | ✅ |

---

## Epic 9 — TF-IDF Module Family Expansion ✅

> Expand the single per-sender `modules/nlp/tfidf.js` into a family of
> analyses built on the same `natural.TfIdf` library and method (group texts
> into documents → build corpus → rank/compare terms). No new npm
> dependencies. Also carves the TF-IDF family out of the monolithic
> `scripts/analyze.js` into a standalone, independently-runnable suite —
> the first feature family to follow this pattern; later families can reuse
> `lib/analyze-shared.js` the same way.

| # | Task | Status |
|---|------|--------|
| 9.1 | Create `lib/tfidf-corpus.js` — shared corpus-building/ranking/similarity helper (`buildCorpus`, `rankTerms`, `getVector`, `cosineSimilarity`) | ✅ |
| 9.2 | Refactor `modules/nlp/tfidf.js` to delegate to `lib/tfidf-corpus.js` (behavior-preserving) | ✅ |
| 9.3 | Create `modules/nlp/tfidfByConversation.js` — distinctive terms per conversation | ✅ |
| 9.4 | Create `modules/nlp/tfidfByPeriod.js` — distinctive terms per day/week/month | ✅ |
| 9.5 | Create `modules/nlp/tfidfSimilarity.js` — pairwise cosine similarity between senders/conversations/custom groups | ✅ |
| 9.6 | Create `modules/nlp/tfidfKeywordTags.js` — per-message keyword tagging against the whole-corpus IDF | ✅ |
| 9.7 | Create `modules/nlp/tfidfDrift.js` — wraps `tfidfByPeriod`, diffs consecutive periods for rising/falling vocabulary | ✅ |
| 9.8 | Create `modules/nlp/tfidfSearch.js` — TF-IDF relevance search via `natural.TfIdf.tfidfs()`, distinct from `fuzzySearch.js` | ✅ |
| 9.9 | Add companion reports for all 6 new modules under `reports/tfidf-*-report.js` | ✅ |
| 9.10 | Create `lib/analyze-shared.js` — extract `saveReport`/`makeMeta`/`loadContext` out of `scripts/analyze.js` | ✅ |
| 9.11 | Create `scripts/tfidf-suite.js` — `runTfidfSuite(ctx, opts)` runs all 7 TF-IDF features | ✅ |
| 9.12 | Create `scripts/analyze-tfidf.js` — standalone entry point (`node scripts/analyze-tfidf.js [path] [--query]`) | ✅ |
| 9.13 | Update `scripts/analyze.js` to use `lib/analyze-shared.js` + `runTfidfSuite()` instead of inline TF-IDF logic | ✅ |
| 9.14 | Add `analyze:tfidf` and `analyze:full` npm scripts | ✅ |
| 9.15 | Add tests: `test/lib/tfidf-corpus.test.js` + one `test/modules/nlp/tfidf*.test.js` per module (including the previously-untested `tfidf.js`) | ✅ |

---

## Epic 10 — Question Detector Module Family Expansion ✅

> Expand the single `modules/nlp/questionDetector.js` (boolean `isQuestion()` +
> "next 3 messages" context) into a family of analyses, following the same
> pattern Epic 9 used for TF-IDF: pull the reusable core into a shared
> `lib/` helper, refactor the original module to delegate to it, then build
> sibling modules on top. No new npm dependencies — everything is built on
> `natural`/`compromise` (already installed) plus data already available on
> each message (`reply_to_guid`, `thread_originator_guid`, `date`, `sender`).
> Reuses `lib/tfidf-corpus.js` for topic tagging instead of re-implementing
> corpus/ranking logic.
>
> **Why these modules:** `questionDetector.js` currently answers one
> question — "is this a question, and what came right after it?" — with a
> boolean regex-ish check and a positional 3-message window. That window is
> a poor proxy for "was this actually answered, by whom, how fast, and was
> it even a real question in the first place (vs. rhetorical: `"why me?"`)."
> Each new module below answers one of those follow-up questions, reusing
> the same classification core rather than re-deriving it.

| # | Task | Status |
|---|------|--------|
| 10.1 | Create `lib/question-analysis.js` — shared core: `classifyQuestion(text)` → `{ isQuestion, type, confidence }` (types: `wh`, `yes-no`, `tag`, `choice`, `rhetorical-cue`), `linkConversationContext(simplified, conversations)` → per-message `{ conversationId, participants, indexInConvo, convoMsgs }` lookup (extracted from `questionDetector.js`'s inline `msgMeta` builder), `resolveSender(msg)` | ✅ |
| 10.2 | Refactor `modules/nlp/questionDetector.js` to delegate to `lib/question-analysis.js` (behavior-preserving — same `detectQuestions()` return shape) | ✅ |
| 10.3 | Create `modules/nlp/questionTypeClassifier.js` — applies `classifyQuestion()` across all messages, returns type distribution overall and per sender (wh vs. yes-no vs. tag vs. choice ratios) | ✅ |
| 10.4 | Create `modules/nlp/questionAnswerPairing.js` — pairs each detected question with its best-guess answer: prefers `reply_to_guid`/`thread_originator_guid` links (same grouping approach as `threadReconstructor.js`) when present, else falls back to the first following message from a *different* sender within a configurable message/time window | ✅ |
| 10.5 | Create `modules/nlp/unansweredQuestions.js` — filters `questionAnswerPairing` output to questions with no paired answer (dropped, ignored, or conversation ended); grouped by sender and by conversation | ✅ |
| 10.6 | Create `modules/nlp/questionResponseTime.js` — median/mean latency between a question and its paired answer (from 10.4), per sender-pair and overall, using `utils/dateHelpers.js` for diffs (distinct from the general-purpose `modules/stats/responseTime.js`, which isn't question-aware) | ✅ |
| 10.7 | Create `modules/nlp/rhetoricalQuestionDetector.js` — heuristic layer on `classifyQuestion()`'s `rhetorical-cue` type: flags self-answered questions (question + answer in the same message), common rhetorical phrasings, and questions that are habitually unanswered across the whole corpus — used to reduce false positives in 10.5 | ✅ |
| 10.8 | Create `modules/nlp/questionInitiationStats.js` — per participant: questions asked, questions answered when asked of them, ask/answer ratio, "curiosity index" (questions asked ÷ total messages sent) | ✅ |
| 10.9 | Create `modules/nlp/questionTopics.js` — tags each detected question with distinctive terms via `lib/tfidf-corpus.js` (`buildCorpus`/`rankTerms`, one "document" per question) and clusters similar questions via `cosineSimilarity` — reuses Epic 9's shared TF-IDF helper rather than duplicating it | ✅ |
| 10.10 | Add companion reports `reports/question-type-report.js`, `reports/question-pairing-report.js`, `reports/unanswered-questions-report.js`, `reports/question-response-time-report.js`, `reports/rhetorical-questions-report.js`, `reports/question-initiation-report.js`, `reports/question-topics-report.js` (one per 10.3–10.9, following the existing `question-report.js` structure) | ✅ |
| 10.11 | Create `scripts/question-suite.js` — `runQuestionSuite(ctx, opts)` runs all 8 question-family features (10.2's `detectQuestions` + 10.3–10.9) against a shared `ctx`, mirroring `scripts/tfidf-suite.js` | ✅ |
| 10.12 | Create `scripts/analyze-questions.js` — standalone entry point (`node scripts/analyze-questions.js [path]`), mirroring `scripts/analyze-tfidf.js` | ✅ |
| 10.13 | Update `scripts/analyze.js` to replace its inline question-detection block with a call into `runQuestionSuite()` | ✅ |
| 10.14 | Add `analyze:questions` npm script | ✅ |
| 10.15 | Add tests: `test/lib/question-analysis.test.js` + one `test/modules/nlp/question*.test.js` / `rhetoricalQuestionDetector.test.js` per new module (10.3–10.9), covering known question/non-question/rhetorical/unanswered fixtures | ✅ |

---

## Dependency additions across epics

| Package | Version | Added in |
|---------|---------|---------|
| `bplist-parser` | ^0.3.1 | Epic 2 ✅ |
| `natural` | ^6.x | Epic 4 |
| `compromise` | ^14.x | Epic 4 |
| `fuse.js` | ^7.x | Epic 4 |

---

## Notes & Decisions

- **iOS ≤ 5 support removed.** The `ios5_imessage.sql` file and its code path are
  gone. Only `ios10.sql` (iOS 6 through iOS 17+) is supported.
- **Bluebird** is kept in `lib/` (database layer) but new code uses native
  `async/await`. No Bluebird in modules/, utils/, or reporters/.
- **`main.js`** = live import from a DB path then run pipeline.
  **`run.js`** = run pipeline from a pre-saved `data/data.json`. Both will share
  the same `lib/pipeline.js` steps after Epic 3.
- **No environment variables.** All config via CLI flags. No `.env` support.
- **`output/` is gitignored.** Never commit generated files.
