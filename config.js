(function () {
  "use strict";

  var path = require('path');

  module.exports = {
    // permanently move files (the log may be used to revert changes)
    move: false,
    port: 80,
    dbRoot: path.join(__dirname, 'db'),
    metaRoot: path.join(__dirname, 'meta'),
    logRoot: path.join(__dirname, 'logs'),
    transferErr: 'transfer-log.err',
    transferLog: 'transfer-log.txt',
    transferLogSorted: 'transfer-log-sorted.txt',
    transferJSON: 'transfer-log.json'
  };
}());
