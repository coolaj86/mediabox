(function () {
  "use strict";

  var MD5SUM_RE = /[a-z0-9]{32}/i;

  var path = require('path')
    , util = require('util')
    , fs = require('fs')
    , exec = require('child_process').exec
    , count = 0
    , mtagsMap = {
        ".mp3": "id3tags"
      , ".m4a": "m4atags"
    }
    ;

  function handleFile(root, stat, next) {
    var name = stat.name
      , extname = path.extname(name)
      , md5sum = name.substr(0, name.indexOf('.'))
      , md5pre = './db/' + md5sum.substr(0, 3)
      , xyztags
      , xyzjson = path.join(md5pre, md5sum + extname + '.json');

    xyztags = mtagsMap[extname];

    if (!xyztags) {
      next();
      return;
    }

    function saveTags(err, stdout, stderr) {
      var data;

      if (err || stderr) {
        stderr = err && err.message || stderr;
        util.debug(xyzjson + ' ' + stderr);
        return next();
      }

      try {
        data = JSON.parse(stdout);
      } catch(e) {
        util.debug(xyzjson);
        util.debug(stdout);
        return next();
      }

      function handleFileWrite(err) {
        if (err) {
          util.debug(xyzjson + ' ' + err.message);
        }
        console.log(xyzjson) //, data);
        return next();
      }

      fs.writeFile(xyzjson, JSON.stringify(data), handleFileWrite);
    }

    function handleExists(exists) {
      if (exists) {
        count += 1;
        console.log('!', count, xyzjson);
        return next();
      }
      exec(xyztags + ' --literal --with-md5sum ' + path.join(root, stat.name), saveTags);
    }

    path.exists(xyzjson, handleExists);
  }

}());
