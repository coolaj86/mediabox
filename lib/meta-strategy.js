(function () {
  "use strict";

  var crypto = require('crypto')
    , fs = require('fs')
    ;

  function create (options) {
    options = options || {};

    var dbroot = options.dbroot || './testdb'
      ;
  
    function getPath(fileHash, statsHash) {
      return dbroot + '/' + fileHash.substr(0, 3) + '/' + fileHash + '.meta.' + statsHash + '.json';
    }

    function saveMeta(cb, pathname, fileStats) {
      var hash = crypto.createHash('md5')
        , fileHash = fileStats.md5sum
        , statsHash
        , metapath
        ;

      // simple hash for symlinks and 
      hash.update(String(pathname));
      hash.update(String(fileStats.mtime.valueOf()));
      hash.update(String(fileStats.size));
      statsHash = hash.digest('hex');

      fileStats.stathash = statsHash;

      metapath = getPath(fileHash, statsHash);

      fs.lstat(metapath, function (error, stat) {
        if (stat) {
          // this file or symlink has been saved previously
          cb(null, metapath);
          return;
        }

        fs.writeFile(metapath, JSON.stringify(fileStats), function (e) {
          if (e) {
            console.error('[saveMeta ERROR]', metapath, e.message);
            console.error(e.stack);
            return;
          }
          cb(e, metapath);
        });
      })
    }

    return saveMeta;
  }

  module.exports.create = create;
}());
