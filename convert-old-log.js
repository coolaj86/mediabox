(function () {
  "use strict";

  // 29 Apr 00:59:55 - c40575a7a594ba2d109646d5a6c3ca8a - ./AJ/The All-American Rejects/Move Along/01 Dirty Little Secret.m4a
  var re = /- ([a-zA-Z0-9]{32}) - (.*)/
    , re2 = /(\.\/)?(.*)(\/)?/
    , forEachAsync = require('forEachAsync')
    , fs = require('fs')
    , path = require('path')
    ;

  function handleLine(next, teststr) {
    var match
      , betterFileStats
      , md5sum
      , fullpath
      , pathname
      , name
      , root
      , ext
      ;

    match = re.exec(teststr);
    md5sum = match[1];
    fullpath = match[2];
    fullpath = fullpath.split('/');
    name = fullpath.pop();
    fullpath = fullpath.join('/');
    pathname = fullpath.replace(re2, '$2')

    if ("." === pathname) {
      pathname = "";
    }

    betterFileStats = {
        "md5": md5sum
      , "path": pathname
      , "name": name
    }

    ext = path.extname(name);
    root = __dirname + '/../MediaBox-storage/db/' + md5sum.substr(0, 3) + '/';

    fs.lstat(root + '/' + md5sum + ext, function (err, stat) {
      if (err) {
        console.error(err);
        console.error(root + '/' + md5sum + ext);
        return;
      }

      betterFileStats.mode = stat.mode;
      betterFileStats.uid = stat.uid;
      betterFileStats.gid = stat.gid;
      betterFileStats.size = stat.size;
      betterFileStats.atime = stat.atime;
      betterFileStats.mtime = stat.mtime;
      betterFileStats.ctime = stat.ctime;

      stat.name = name;
      stat.md5sum = md5sum;
      stat.md5 = md5sum;
      stat.type = 'file';

      //mediabox.importStrategy(root, stat, next, betterFileStats);
      console.log(root, stat, null, betterFileStats);
      next();
    });
  }

  fs.readFile(__dirname + '/../MediaBox-storage/logs/db-all.txt', 'utf8', function (err, data) {
    /*
    forEachAsync([
        "29 Apr 00:59:55 - c40575a7a594ba2d109646d5a6c3ca8a - ./AJ/The All-American Rejects/Move Along/01 Dirty Little Secret.m4a"
      , "29 Apr 00:59:55 - c40575a7a594ba2d109646d5a6c3ca8a - ./a/01 Dirty Little Secret.m4a"
      , "29 Apr 00:59:55 - c40575a7a594ba2d109646d5a6c3ca8a - ./01 Dirty Little Secret.m4a"
      , "29 Apr 00:59:55 - c40575a7a594ba2d109646d5a6c3ca8a - 01 Dirty Little Secret.m4a"
      , "29 Apr 00:59:55 - c40575a7a594ba2d109646d5a6c3ca8a - 01 Dirty Little Secret"
    ], handleLine);
    */
    forEachAsync(data.split(/\n/), handleLine);
  });

}());
