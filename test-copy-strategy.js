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
    , givenpath = './testroot/absolute/real';
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
    }, givenpath, fileStats);
  }

  function getStats(e, fileStats) {
    if (e) {
      console.error('[ERROR] cannot stat ' + givenpath, e.message);
      console.error(e.stack);
      cb(e);
      return;
    }
    
    // is this right?
    //fileStats.pathname = givenpath;
    fileStats.filepath = givenpath;
    fileStats.path = givenpath.substr(0, givenpath.lastIndexOf('/'));
    fileStats.name = givenpath.substr(givenpath.lastIndexOf('/') + 1);
    //copyAndChecksum();

    fs.realpath(path.resolve(process.cwd(), givenpath), function (err, realpath) {
      fileStats.realpath = realpath.substr(0, realpath.lastIndexOf('/'));
      fileStats.realname = realpath.substr(realpath.lastIndexOf('/') + 1);
      copy(saveMeta, givenpath, fileStats);
    });
  }

  fs.lstat(givenpath, getStats);
}());
