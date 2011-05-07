(function () {
  "use strict";

  var MD5SUM_RE = /[a-z0-9]{32}/i;

  var path = require('path')
    , fs = require('fs')
    , exec = require('child_process').exec
    , walk = require('walk')
    , count = 0
    , walker = walk.walk('./db');

  walker.on('file', function (root, stat, next) {
    var name = stat.name
      , md5sum = name.substr(0, name.indexOf('.'))
      , md5pre = './db/' + md5sum.substr(0, 3);

    exec('mkdir -p ' + md5pre, function (err, stdout, stderr) {
      if (err || stderr) {
        throw err || stderr;
      }

      var newpath = path.join(md5pre, md5sum + path.extname(name))
        , oldpath = path.join(root, name);

      path.exists(newpath, function (yes) {
        if (yes) {
          count += 1;
          console.log(count);
          return next();
        }
        fs.link(oldpath, newpath, function (err) {
          if (err) {
            throw err;
          }
          console.log(newpath);
          next();
        });
      });
    });
  });

}());
