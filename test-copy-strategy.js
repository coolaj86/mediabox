(function () {
  "use strict";

  /*
    Cases that need testing:
    
    a new file is added // most common
    a symlink to a new file is added
    a symlink to an existing file is added
    an existing (md5 match) file is added
  */

  var fs = require('fs')
    , path = require('path')
    , Copy = require('./copy-strategy')
    , copy = Copy.create()
    , Meta = require('./meta-strategy')
    , metaStore = Meta.create()
    ;

  function gotErDone(e, stat) {
    console.error('[error]');
    console.error(e);
    console.log('All Done');
    console.log(stat);
  }

  function saveMeta(e, fileStats) {
    if (e) {
      gotErDone(e, fileStats);
    }

    metaStore(function (e) {
      gotErDone(e, fileStats);
    });
  }

  function getStats(e, fileStats) {
    if (e) {
      console.error('[ERROR] cannot stat ' + fullpath, e.message);
      console.error(e.stack);
      cb(e);
      return;
    }
    
    // is this right?
    fileStats.filepath = fullpath.substr(0, fullpath.lastIndexOf('/'));
    fileStats.name = fullpath.substr(fullpath.lastIndexOf('/') + 1);
    //copyAndChecksum();
    copy(saveMeta, fullpath, fileStats);
  }

  var fullpath = './testroot/absolute/real';
  fs.realpath(path.resolve(process.cwd(), fullpath), function (err, pathname) {
    fullpath = pathname;
    fs.lstat(pathname, getStats);
  });
}());
