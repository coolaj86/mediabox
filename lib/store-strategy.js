/*jshint node:true es5:true laxcomma:true laxbreak:true*/
/*
 * README
 *
 * This is to store a file in the "db".
 *
 * It checks that the file still exists, by a given path,
 * grabs file stats about it, and then moves the file to
 * the "db" filesystem.
 *
 * It calls Copy to actually move or copy the file
 *
 * It calls Meta and Tag to get file metadata and
 * content metadata, which are stored by the same
 */
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
    , Meta = require('./meta-strategy')
    , Tag = require('./tag-strategy')
    ;

  /*
   * Copy
   * @param filesroot
   * @param tmproot
   * Meta
   * @param metaroot
   * Tag
   * @param audioroot
   * @param caches
   */
  function create(options) {
    var copier = Copy.create(options)
      , metaStore = Meta.create(options)
      , tagStore = Tag.create(options)
      ;

    // TODO move givenpath to fileStats.xyz
    function storeFile(cb, _givenpath, fileStats, betterFileStats) {
      var givenpath
        , metapath
        ;

      function gotErDone(e, stat) {
        if (e) {
          console.error('[gotErDone Error]');
          console.error(e);
          return;
        }
        console.log('finished for', '  ' + givenpath);
        cb();
      }

      function saveMeta(e, fileStats) {
        if (e) {
          gotErDone(e, fileStats);
        }

        // At this point we know for sure that we have the correct md5sum
        if (betterFileStats.md5sum && betterFileStats.md5sum !== fileStats.md5sum) {
          console.log('very unexpected difference in md5sum');
        }
        betterFileStats.md5sum = fileStats.md5sum;

        metaStore(function (e, _metapath) {
          if (e) {
            gotErDone(e, fileStats);
            return;
          }

          metapath = _metapath;
          tagStore(function (e) {
            gotErDone(e, fileStats);
          }, fileStats.storepath, betterFileStats.name, betterFileStats.md5sum);
        }, givenpath, betterFileStats);
      }

      function getStats(e, fileStats) {
        if (e) {
          console.error('[getStat ERROR] cannot stat ' + givenpath, e.message);
          console.error(e.stack);
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
          copier.copy(saveMeta, givenpath, fileStats, betterFileStats);
        });
      }

      givenpath = _givenpath;
      if (!fileStats) {
        fs.lstat(givenpath, getStats);
      }
      copier.copy(saveMeta, givenpath, fileStats, betterFileStats);
    }

    return storeFile;
  }

  module.exports.create = create;
}());
