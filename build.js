(function () {
  "use strict";

  var config = require('./config')
    , exec = require('child_process').exec
    , path = require('path')
    , fs = require('fs')
    , transfer = require('./checksum-and-move');

  // TODO repeat this only once per dir by default
  function moveFiles() {
    var errStream = fs.createWriteStream(path.join(config.metaRoot, config.transferErr), { flags: 'a' })
      , logStream = fs.createWriteStream(path.join(config.metaRoot, config.transferLog), { flags: 'a' });

    transfer.create({
      types: ['.mp3', '.m4a'],
      //move: false,
      move: config.move,
      path: process.argv[2] || '.',
      dbPath: '/data/MediaBox/db',
      logHandler: function (str) {
        // TODO truncate dbPath (save it to a different location)
        console.log(str);
        logStream.write(new Date().valueOf() + '\t' + str + '\n');
      },
      errorHandler: function (err) {
        console.log(err);
        errStream.write(new Date().valueOf() + ': ' + JSON.stringify(err) + '\n');
      }
    }, function () {
      logStream.end();
      errStream.end();
      parseLog();
    });
  }

  function parseLog() {
    var transferLog = path.join(config.metaRoot, config.transferLog)
      , transferLogSorted = path.join(config.metaRoot, config.transferLogSorted)
      , cmd = 'cat ' 
          + transferLog 
          + ' | cut -f2-99 | sort -u > '
          + transferLogSorted;

    function handleSortResult(err, stdout, stderr) {
      console.log(arguments);
    }
    exec(cmd, handleSortResult);
  }

  moveFiles();
  //parseLog();
}());
