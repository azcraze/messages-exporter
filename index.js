#!/usr/bin/env node

(function () {
  var logger = require("./lib/debug-log");
  var Promise = require("bluebird");
  var fs = require("fs");
  var path = require("path");
  var expandHomeDir = require("expand-home-dir");
  var getVersion = require("./lib/get-version");
  var loadFromModernOSX = require("./lib/load-from-modern-osx");
  var openDB = require("./lib/open-db");
  var bfj = require("bfj");
  var { ensureDir } = require("./utils/fileIO");

  let exporter = {
    importData: function (filePath, options) {
      if (!options) options = {};
      logger.setEnabled(!!options.debug);

      var promise = new Promise((resolve, reject) => {
        var dbPath = null;

        try {
          if (fs.lstatSync(filePath).isDirectory()) {
            logger.log(
              "Found directory, looking for /3d0d7e5fb2ce288813306e4d4636395e047a3d28",
            );
            dbPath =
              filePath + "/3d0d7e5fb2ce288813306e4d4636395e047a3d28";
          } else if (fs.lstatSync(filePath).isFile()) {
            dbPath = filePath;
          } else {
            reject("Not a file or directory: " + filePath);
            return;
          }

          openDB(dbPath).then(
            (db) => {
              return getVersion(db)
                .then(function (version) {
                  logger.log("Found database version " + version);
                  if (version && version > 0) {
                    return loadFromModernOSX(db, version, options);
                  } else {
                    reject(
                      "Opened the database but couldn't detect a supported iMessage schema " +
                        "(no _ClientVersion found). Is " +
                        dbPath +
                        " a valid chat.db?",
                    );
                  }
                })
                .then((messages) => {
                  resolve(messages);
                })
                .finally(() => {
                  db.close();
                });
            },
            function (err) {
              var message =
                "Couldn't open the database at " +
                dbPath +
                (err && err.message ? " (" + err.message + ")" : "") +
                ".";
              if (process.platform === "darwin") {
                message +=
                  "\nOn macOS this is usually caused by missing Full Disk Access permission. " +
                  "Grant it via System Settings → Privacy & Security → Full Disk Access, " +
                  "add your terminal app (Terminal/iTerm2/etc.), then restart it and try again.";
              }
              reject(message);
            },
          );
        } catch (e) {
          reject(
            e && e.code === "ENOENT"
              ? "File not found: " + filePath
              : "Couldn't open selected database" +
                  (e && e.message ? ": " + e.message : ""),
          );
        }
      });

      return promise;
    },
  };

  module.exports = { importData: exporter.importData };

  // Resolves the -w/--save option to an output path: a string value is
  // resolved relative to the caller's cwd; no value (boolean true) falls
  // back to the existing default location.
  function resolveSavePath(saveOption) {
    if (typeof saveOption === "string") return path.resolve(saveOption);
    return path.join(__dirname, "data", "data.json");
  }

  if (!module.parent) {
    const program = require("commander");

    let filePath = process.argv[2];
    if (!filePath) {
      console.log(
        "USAGE: forever-chat-imessage-export [path] [options]",
      );
      return;
    } else if (filePath === "system") {
      filePath = "~/Library/Messages/chat.db";
    }

    let options = program
      .version("0.0.1")
      .option("-d, --debug", "Turn on debugging")
      .option("-l, --limit [value]", "Only return the last X records")
      .option("-i, --ids [value]", "Only return messages with ids")
      .option(
        "-s, --sinceDate [YYYY-MM-DD]",
        "Only return records since date",
      )
      .option(
        "-f, --search [value]",
        "Only return records containing text",
      )
      .option(
        "-p, --phone [value]",
        "Only return records to/from number",
      )
      .option("-w, --save [value]", "write to file")
      .option(
        "-q, --query [value]",
        "Exact text filter applied after import (case-insensitive)",
      )
      .option(
        "--fuzzy [value]",
        "Fuzzy text search applied after import",
      )
      .option(
        "--pattern [value]",
        "Regex pattern filter applied after import (case-insensitive)",
      )
      .option(
        "-r, --report [value]",
        "Generate report: summary|words|participants|timeline|sentiment|entities|all",
      )
      .option(
        "--format [value]",
        "Report output format: json|txt|md (default: json)",
      )
      .parse(process.argv);

    if (options.debug) console.log("- debugging on");
    if (options.limit) console.log(`limited to ${options.limit}`);
    if (options.sinceDate)
      console.log(`only getting entries since ${options.sinceDate}`);
    if (options.search)
      console.log(`only getting entries containing ${options.search}`);
    if (options.ids)
      console.log(`only getting message ids ${options.ids}`);
    if (options.phone)
      console.log(`only getting to/from ${options.phone}`);
    if (options.save)
      console.log(`writing to ${resolveSavePath(options.save)}`);

    options.showProgress = true; // don't do this for when using this not on the command line

    exporter
      .importData(expandHomeDir(filePath), options)
      .then((data) => {
        // Post-import query filtering (--query / --fuzzy / --pattern)
        var hasPostFilter = options.query || options.fuzzy || options.pattern;
        if (hasPostFilter) {
          var QueryEngine = require('./lib/query-engine');
          var qe = new QueryEngine(data);
          if (options.query)   qe.search(options.query);
          if (options.pattern) qe.pattern(options.pattern);

          if (options.fuzzy) {
            qe.fuzzy(options.fuzzy);
            return qe.runAsync().then(function(filtered) {
              console.log('Filtered to ' + filtered.length + ' messages.');
              return filtered;
            });
          }

          data = qe.run();
          console.log('Filtered to ' + data.length + ' messages.');
        }
        return data;
      })
      .then((data) => {
        if (options.save) {
          let outPath = resolveSavePath(options.save);
          ensureDir(path.dirname(outPath));
          bfj
            .write(outPath, data, { space: 4 })
            .then(() => {
              console.log(`Saved ${data.length} messages to ${outPath}`);
            })
            .catch((e) => {
              console.error("Failed to write output:", e);
            });
        } else {
          console.log(`Imported ${data.length} messages.`);
        }

        // Report generation (--report / --format)
        if (options.report) {
          generateReports(data, options);
        }
      })
      .catch((err) => {
        console.error(err && err.message ? err.message : err);
        process.exit(1);
      });
  }

  // ---------------------------------------------------------------------------
  // Report generation helper
  // ---------------------------------------------------------------------------
  function generateReports(messages, options) {
    var fmtArg   = (options.format || 'json').toLowerCase();
    var reportArg= (options.report === true ? 'all' : options.report || 'summary').toLowerCase();

    var REPORT_MAP = {
      summary:      require('./reports/summary-report'),
      words:        require('./reports/word-frequency-report'),
      participants: require('./reports/participant-report'),
      timeline:     require('./reports/timeline-report'),
      sentiment:    require('./reports/sentiment-report'),
      entities:     require('./reports/entity-report'),
    };

    var REPORTER_MAP = {
      json: require('./lib/reporters/json-reporter'),
      txt:  require('./lib/reporters/text-reporter'),
      md:   require('./lib/reporters/markdown-reporter'),
    };

    var reporter = REPORTER_MAP[fmtArg] || REPORTER_MAP.json;
    var ext      = fmtArg === 'md' ? 'md' : (fmtArg === 'txt' ? 'txt' : 'json');

    var toRun = reportArg === 'all' ? Object.keys(REPORT_MAP) : [reportArg];
    toRun = toRun.filter(function(r) { return REPORT_MAP[r]; });

    if (toRun.length === 0) {
      console.error('Unknown report type: ' + reportArg + '. Valid: ' + Object.keys(REPORT_MAP).join(', ') + ', all');
      return;
    }

    // Ensure output/reports/ directory exists
    var outDir = path.join(__dirname, 'output', 'reports');
    if (!fs.existsSync(path.join(__dirname, 'output'))) fs.mkdirSync(path.join(__dirname, 'output'));
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

    var timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    // Build vol meta once (shared across all reports)
    var volMeta = null;
    try {
      var { messageVolume } = require('./modules/stats/messageVolume');
      var vol = messageVolume(messages);
      volMeta = {
        message_count: messages.length,
        date_range: vol.dateRange ? { first: vol.dateRange.first, last: vol.dateRange.last } : null,
      };
    } catch (e) { /* non-fatal */ }

    toRun.forEach(function(name) {
      try {
        var report = REPORT_MAP[name].build(messages);
        var meta   = Object.assign({ title: name + ' report' }, volMeta);
        var output;

        if (fmtArg === 'json') {
          output = reporter.render(report.data, meta);
        } else {
          // text and markdown reporters take sections + meta
          output = reporter.render(report.sections, meta);
        }

        var filename = name + '-' + timestamp + '.' + ext;
        var outPath  = path.join(outDir, filename);
        fs.writeFileSync(outPath, output, 'utf8');
        console.log('Report written: ' + outPath);
      } catch (e) {
        console.error('Failed to generate ' + name + ' report:', e.message);
      }
    });
  }
})();
