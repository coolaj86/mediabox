(function () {
  "use strict";

  var MD5SUM_RE = /[a-z0-9]{32}/i;

  var path = require('path')
    , util = require('util')
    , fs = require('fs')
    , exec = require('child_process').exec
    , walk = require('walk')
    , count = 0
    , walker = walk.walk('./db');

  function fixm4a(stdout, xyzjson) {
    // WARN " can be part of a name (but very rare)
    var m = stdout.match(/\\"(.*)\\" contains: (.*?)"(.*)"(.*)\n/);
    if (!m) {
      return stdout;
    }
    // strip trailing whitespace as part of fix
    m[2] = m[2].match(/(.*?)\s*$/)[1];
                                                                                  //name            // attr
    stdout = stdout.replace(/\\n.*?Atom.* \\"(.*)\\" contains: (.*?)"(.*)\n/, '"' + m[1] + '": "' + m[2] + '",\n "' + m[3] + '",\n');
    return stdout;
  }

  function handleFile(root, stat, next) {
    var name = stat.name
      , extname = path.extname(name)
      , md5sum = name.substr(0, name.indexOf('.'))
      , md5pre = './db/' + md5sum.substr(0, 3)
      , xyztags
      , xyzjson = md5pre + '/' + md5sum + '.json';

    if (/mp3$/.test(extname)) {
      xyztags = 'id3tags';
    } else {
      xyztags = 'm4atags';
    }

    function saveTags(err, stdout, stderr) {
      var data;

      if (err || stderr) {
        stderr = err && err.message || stderr;
        util.debug(xyzjson + ' ' + stderr);
        return next();
      }

      if (/m4a$/.test(extname)) {
        stdout = fixm4a(stdout, xyzjson);
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

  walker.on('file', handleFile);
}());
