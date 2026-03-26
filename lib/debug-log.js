var enabled = false;

module.exports = {
  setEnabled: function (flag) {
    enabled = !!flag;
  },
  log: function () {
    if (enabled) console.log.apply(console, arguments);
  },
  warn: function () {
    if (enabled) console.warn.apply(console, arguments);
  },
  error: function () {
    console.error.apply(console, arguments);
  }
};
