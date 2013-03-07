/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true eqeqeq:true immed:true latedef:true*/
(function () {
  "use strict";

  var MD5SUM_RE = /[a-z0-9]{32}/i
    , path = require('path')
    , util = require('util')
    , fs = require('fs')
    , exec = require('child_process').exec
    , count = 0
    , mtagsMap = {
        ".mp3": "id3tags"
      , ".m4a": "m4atags"
    }
    ;

  /*
   * @param audioroot
   * @param caches
   */
  function create(options) {
    // TODO lookup mimetype by extension
    var audioroot = options.audioroot
      , caches = options.caches
      ;

    function handleFile(cb, fullpath, origname, md5sum) {
      var extname = path.extname(origname)
        , xyztags
        , xyzjson
        ;

      xyztags = mtagsMap[extname];

      if (!xyztags) {
        cb();
        return;
      }

      xyzjson = path.join(audioroot, md5sum.substr(0, 3), md5sum + extname + '.json');

      function saveTags(err, stdout, stderr) {
        var data;

        if (err) {
          util.debug(xyzjson + ' ' + err.message || err);
          return cb(err);
        }

        if (stderr) {
          // non-deathly warning messages pop out from time to time
          util.debug(xyzjson + ' ' + stderr);
        }

        try {
          data = JSON.parse(stdout);
        } catch(e) {
          util.debug(xyzjson);
          util.debug(stdout);
          return cb(e);
        }

        data.md5 = md5sum;

        function handleFileWrite(err) {
          if (err) {
            util.debug(xyzjson + ' ' + err.message);
          } else {
            // TODO handle any type
            caches.audio.add(data);
          }
          console.log(xyzjson) //, data);
          return cb(err);
        }

        fs.writeFile(xyzjson, JSON.stringify(data), handleFileWrite);
      }

      function handleExists(exists) {
        if (exists) {
          count += 1;
          console.log('Already Exists:', count, xyzjson);
          return cb();
        }
        exec(xyztags + ' --literal --with-md5sum ' + fullpath, saveTags);
      }

      fs.exists(xyzjson, handleExists);
    }
  
    return handleFile;
  }

  module.exports.create = create;
}());
