#!/usr/bin/env node
(function () {
  "use strict";

  var fs = require('fs')
    , walk = require('walk').walk
    , path = require('path')
    , exec = require('child_process').exec
    , md5regex = /^[0-9a-f]{32}\..{3}$/i; // md5sum with 3 char ext

  // normal quotes would fail for names such as
  // If I had $1000000 (I'd be rich).mp3
  // Hounddog - Elvis aka "The King".m4a
  function bashEscape(str) {
    return "'" + str.replace("'", "\\'") + "'";
  }

  // creates the appropriate directory structure something like
  // 000, 001, ..., cef, ..., ffe, fff
  function createAllDirsCmd(basepath) {
    var hex = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f']
      , hexes = [];

    // 4096 dirs should be sufficient for fast file access for at least
    // 1,048,576 or so files (~256 per dir), and probably even 16 million
    hex.forEach(function (a) {
      hex.forEach(function (b) {
        hex.forEach(function (c) {
          // force stringiness with leading empty string ''
          hexes.push(path.join(basepath, '' + a + b + c));
        });
      });
    });

    return'mkdir -p ' + hexes.join(' ');
  }

  function create(options, callback) {
    var TYPES = options.types
      , PATH = options.path
      , MOVE_TO_PATH = options.dbPath
      , logger = {};

    logger.log = options.logHandler;
    logger.error = options.errorHandler;

    function handleFile(root, stat, next) {
      var filename = path.join(root, stat.name)
        , extname = path.extname(stat.name);

      // only move supported file types
      if (-1 === TYPES.indexOf(extname)) {
        return next();
      }

      // bail if the file is already md5summed
      // TODO bail if the file doesn't appear to be user-named
      // there's little use in indexing thumbnail caches and such
      if (md5regex.test(path.basename(filename))) {
        return next();
      }

      // TODO this function is way too long
      // add `filename` as argument and remove indentation
      function handleMd5sum(err, stdout, stderr) {
        var md5sum = stdout.replace(/[\n\r]+$/, '').toLowerCase()
          , ext = path.extname(filename).toLowerCase()
          , md5subdir = md5sum.substr(0, 3)
          , md5path = path.join(MOVE_TO_PATH, md5subdir)
          , targetFilename = path.join(md5path, md5sum + ext);

        // XXX use actual md5sum match
        if (err || stderr || 32 !== md5sum.length) {
          err = err || stderr && new Error(stderr) || new Error("32 !== md5sum.length");
          err.filename = filename;
          err.comment = "md5sum of the file failed";
          logger.error(err);
          return next();
        }

        // a safe true / false boolean
        if (path.existsSync(targetFilename)) {
          // XXX this is a completely safe assumption
          // but does not guarantee de-duplication
          if (path.basename(targetFilename).toLowerCase() === path.basename(filename).toLowerCase()) {
            return next();
          }

          logger.log(md5sum + '\t' + filename);

          next();

          if (!options.move) {
            return;
          }

          // safeguarded by options.move
          fs.unlink(filename, function (err) {
            if (!err) {
              return;
            }
            err.comment = "unlink failure";
            err.filename = filename;
            err.targetPath = targetFilename;
            logger.error(err);
          });

          return;
        }

        fs.link(filename, targetFilename, function (err) {
          if (err) {
            err.comment = "link failure";
            err.filename = filename;
            err.targetPath = targetFilename;
            logger.error(err);
            return next();;
          }

          // TABs are pretty safe in this case
          logger.log(md5sum + '\t' + filename);

          next();

          if (!options.move) {
            return;
          }

          // safeguarded by options.move
          fs.unlink(filename, function(err) {
            if (!err) {
              return;
            }
            err.comment = "unlink failure";
            err.filename = filename;
            err.targetPath = targetFilename;
            logger.error(err);
          });
        });
      }

      // TODO force OSX to use md5 in binary mode
      //exec('md5 -q ' + bashEscape(filename), handleMd5sum);
      // XXX retest escape mechanism i.e. "08 If I Had $1000000.m4a"
      exec('md5sum ' + bashEscape(filename) + ' | cut -d" " -f1', handleMd5sum);
    }

    exec(createAllDirsCmd(MOVE_TO_PATH), function (err, stdout, stderr) {
      console.log("Created directory structure");
      var walker = walk(PATH);
      walker.on('file', handleFile);
      walker.on('end', callback);
    });
  }

  exports.create = create;
}());
