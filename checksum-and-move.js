#!/usr/bin/env node
(function () {
  "use strict";

  // TODO write error and success logs to json files line-by-line

  require('remedial');

  var MOVE_TO_PATH = '/data/MediaBox/db';
  var TYPES = ['.mp3', '.m4a'];
  var PATH = process.argv[2] || '.';

  var fs = require('fs')
    , walk = require('walk').walk
    , walker = walk(PATH)
    , util = require('util')
    , path = require('path')
    , exec = require('child_process').exec
    , md5regex = /^[0-9a-f]{32}\..{3}$/i; // md5sum with 3 char ext

  function errlog(err) {
    if (!err) {
      return;
    }
    util.debug(JSON.stringify(err));
  }

  function bashEscape(str) {
    return "'" + str.replace("'", "\\'") + "'";
  }

  function handleFile(root, stat, next) {
    var filename = path.join(root, stat.name)
      , extname = path.extname(stat.name);

    if (-1 === TYPES.indexOf(extname)) {
      return next();
    }

    // bail if the file is already md5summed
    // TODO bail if the file doesn't appear to be user-named
    if (md5regex.test(path.basename(filename))) {
      return next();
    }

    //exec('md5 -q "' + filename + '"', function (err, stdout, stderr) {
    // XXX retest escape mechanism i.e. "08 If I Had $1000000.m4a"
    exec('md5sum ' + bashEscape(filename) + ' | cut -d" " -f1', function (err, stdout, stderr) {
      var md5sum = stdout.replace(/[\n\r]+$/, '').toLowerCase()
        , ext = path.extname(filename).toLowerCase()
        , md5split = [
                        MOVE_TO_PATH,
                        md5sum.substr(0,3)
                      ]
        , md5path = path.join.apply(path, md5split);

      if (err || stderr || 32 !== md5sum.length) {
        util.debug('badfile: ' + filename);
        return next();
      }


      exec('mkdir -p ' + md5path, function (err) {
        if (err) {
          util.debug(JSON.stringify(err));
          return next();
        }

        var newpath = path.join(md5path, md5sum + ext);

        if (path.existsSync(newpath)) {
          // XXX this is a completely safe assumption
          // but does not guarantee de-duplication
          if (path.basename(newpath).toLowerCase() !== path.basename(filename).toLowerCase()) {
            util.log(md5sum + ' - ' + filename); // this was missing
            fs.unlink(filename, errlog);
          }
          return next();;
        }

        fs.link(filename, newpath, function (err) {
          if (err) {
            util.debug(JSON.stringify(err));
            return next();;
          }
          util.log(md5sum + ' - ' + filename);

          // XXX unlink files
          //fs.unlink(filename, function(err) {
          //  errlog(err)
            next();
          //});
        });
      });
    });
  }

  walker.on('file', handleFile);
}());
