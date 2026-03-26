var Promise = require("bluebird");

function getClientVersion(db) {
  var promise = new Promise(function (resolve) {
    db.serialize(function () {
      var clientVersion;
      db.each(
        "SELECT value from _SqliteDatabaseProperties WHERE key = '_ClientVersion'",
        function (error, row) {
          clientVersion = row.value;
        },
        function () {
          resolve(clientVersion);
        }
      );
    });
  });

  return promise;
}

// _ClientVersion examples:
// 17xxx - iOS 17 / macOS Sonoma
// 16xxx - iOS 16 / macOS Ventura
// 15xxx - iOS 15 / macOS Monterey
// 14xxx - iOS 14 / macOS Big Sur
// 13xxx - iOS 13 / macOS Catalina
// 12xxx - iOS 12
// 11xxx - iOS 11
// 10013 - iOS 10
// 9005  - iOS 9
// 8008  - iOS 8
// 7006  - iOS 7
// 6100  - iOS 6.1.2
// 36    - iOS 6

function getOSVersionForClientVersion(version) {
  version = String(version);

  if (version.length === 5) {
    // e.g. 17000 → 17.0, 10013 → 10.1
    return parseFloat(version.slice(0, 2) + "." + version.slice(2, 3));
  } else if (version.length === 4) {
    // e.g. 9005 → 9.0
    return parseFloat(version.slice(0, 1) + "." + version.slice(1, 2));
  } else {
    // 2- or 3-digit legacy versions (iOS 6 and below)
    var intVersion = parseInt(version);
    if (intVersion >= 36) return 6;
  }

  return -1;
}

module.exports = function (db) {
  return getClientVersion(db).then(function (clientVersionString) {
    return getOSVersionForClientVersion(clientVersionString);
  });
};
