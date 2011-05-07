#!/usr/bin/env node
(function () {
  "use strict";

  var PATH_TO_SEARCH = '/mnt/sda2/MediaBox/db';

  var fs = require('fs')
    , util = require('util')
    , path = require('path')
    , exec = require('child_process').exec
    , filename = process.argv[2]
    , md5regex = /^[0-9a-f]{32}\..{3}$/i; // md5sum with 3 char ext

  // bail if the file is already md5summed
  if (md5regex.test(path.basename(filename))) {
    return;
  }

  function errlog(err) {
    if (!err) {
      return;
    }
    util.debug(JSON.stringify(err));
  }

  //exec('md5 -q "' + filename + '"', function (err, stdout, stderr) {
  // TODO quote the file
  // XXX i.e. "08 If I Had $1000000.m4a"
  exec('md5sum "' + filename + '" | cut -d" " -f1', function (err, stdout, stderr) {
    var md5sum = stdout.replace(/[\n\r]+$/, '').toLowerCase()
      , ext = path.extname(filename).toLowerCase()
      , md5split = [
                      PATH_TO_SEARCH,
                      md5sum.substr(0,3), 
                      /*
                      md5sum.substr(2,2), 
                      md5sum.substr(4,2), 
                      md5sum.substr(6,2), 
                      md5sum.substr(8,4), 
                      md5sum.substr(12,4), 
                      md5sum.substr(16,8), 
                      md5sum.substr(24,8), 
                      */
                    ]
      , md5path = path.join.apply(path, md5split);

    if (err || stderr || 32 !== md5sum.length) {
      util.debug('badfile: ' + filename);
      return;
    }


    exec('mkdir -p ' + md5path, function (err) {
      if (err) {
        util.debug(JSON.stringify(err));
        return;
      }

      var newpath = path.join(md5path, md5sum + ext);

      if (path.existsSync(newpath)) {
        // XXX this is a completely safe assumption
        // but does not guarantee deduplication
        if (path.basename(newpath).toLowerCase() !== path.basename(filename).toLowerCase()) {
          console.log(md5sum + ' - ' + filename); // this was missing
          fs.unlink(filename, errlog); // crap! 
        }
        return;
      }

      fs.link(filename, newpath, function (err) {
        if (err) {
          util.debug(JSON.stringify(err));
          return;
        }
        console.log(md5sum + ' - ' + filename);
        fs.unlink(filename, errlog);
      });
    });
  });
  
}());
