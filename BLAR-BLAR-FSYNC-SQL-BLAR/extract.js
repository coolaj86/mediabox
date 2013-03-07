/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true eqeqeq:true immed:true latedef:true*/
(function () {
  "use strict";

  var sqlite = require('sqlite3')
    , fs = require('fs.extra')
    , sequence = require('sequence').create()
    , db
    ;

  function readyForQuery() {
    db.each("SELECT path, name, md5 FROM data WHERE path LIKE '%CURRENT%cluelist%';", function (err, record) {
      sequence.then(function (next, err) {
        var shortPath
          ;

        if (err) {
          console.error(err);
          //return;
        }

        /*
        if (!/ClueList/.test(record.path)) {
          next();
          return;
        }
        */

        shortPath = "ClueList/" + record.path.replace(/.*ClueList\//g, '');
        fs.mkdirp(shortPath, function (err) {
          var curPath
            , newPath
            ;

          if (err) {
            console.error(err);
            return;
          }

          curPath = "/Volumes/Seagate/MediaBox-storage/db/files/all/"
            + record.md5.substr(0 ,3)
            + '/'
            + record.md5
            ;

          newPath = shortPath + '/' + record.name;

          console.log(curPath, '->', newPath);

          fs.copy(
              curPath
            , newPath
            , next
          );
        });
        console.log(record);
      });
    });
  }

  db = new sqlite.Database("meta.sqlite3", readyForQuery);
}());
