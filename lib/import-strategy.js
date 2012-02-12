/*

  Goals:
    * Reversable
    * Non-destructive in the event of power-failure
    * motivates me to complete mediabox

 */
(function () {
  "use strict";

  var fs = require('fs')
    , path = require('path')
    , forEachAsync = require('forEachAsync')
    , Store = require('./store-strategy')
    , Sync = require('./smart-sync')
    , UUID = require('node-uuid')
    , Mime = require('mime')
    ;

  function removeFile(cb, fullpath) {
    fs.unlink(fullpath, function (err) {
      if (err) {
        console.warn('[WARN] could not remove symlink', err.message);
      }

      cb();
    });
  }

  /*
   * Store
   *  Copy
   * @param filesroot
   * @param tmproot
   *  Meta
   * @param metaroot
   *  Tag
   * @param audioroot
   * @param caches
   *
   *
   * @param realroot
   * @param rootDeviceId
   */
  function createImporter(options, realroot, rootDeviceId) {
    var store = Store.create(options)
      , sizeLimit = 1024 * 1024 * 1024 // 1GB
      , countLimit = 1000 // 1,000 files
      , realRemove = options.realRemove
      , totalSize = 0
      , totalCount = 0
      , nodesToRemove = []
      ;

    function relinkFile(cb, fileStats) {
      // TODO path should be relative, root should be absolute
      //var fullpath = fileStats.root + '/' + fileStats.path + '/' + fileStats.name
      var fullpath = path.normalize(fileStats.path + '/' + fileStats.name)
        , bakfile = fullpath + '.mediabox-bak'
        ;

      // no use in trying to hard link files on different devices
      if (rootDeviceId && fileStats.dev !== rootDeviceId) {
        console.log('different devices');
        return cb();
      }

      // no need to hard link a soft link
      if ('symbolicLink' === fileStats.type) {
        return cb();
      }

      // TODO see if this is a read-only fs
      /*
      if (isReadOnly) {
        return cb()
      }
      */

      fs.rename(fullpath, bakfile, function (errorRenaming) {
        if (errorRenaming) {
          console.error('[rename failed]', errorRenaming.message);
          // TODO report some sort of error?
          return cb();
        }

        console.log('[storepath]', fileStats.storepath);
        fs.link(fileStats.storepath, fullpath, function (errorLinking) {
          if (errorLinking) {
            console.error('[link failed]', errorLinking.message);

            fs.rename(bakfile, fullpath, function (errorUnrenaming) {
              if (errorUnrenaming) {
                console.error('[ERROR unrenaming]', fullpath);
                console.error(errorUnrenaming.stack);
                return;
              }
            });
          }

          fs.unlink(bakfile, cb);
        });
      });
    }
      
    function syncAndRemoveOriginals(cb, toRemove) {
      function removeOriginalsIfSyncSucceeded(err) {
        var path
          , eachinate
          ;

        if (realRemove) {
          eachinate = removeFile;
        } else {
          eachinate = relinkFile;
        }

        // the 10 second wait is to account for internal caches of
        // the physical block devices, which sync has no control over
        // TODO removeLast
        setTimeout(function () {
          forEachAsync(toRemove, eachinate); //.then(sync);
        }, 10 * 1000);
        cb();
      }

      Sync.sync(removeOriginalsIfSyncSucceeded);
    }
    
    /*
     * @param betterFileStats
     * @param realRemove
     */
    // when used for an upload, the user can specify better
    // file stats than what the temporary file in the upload dir will
    function copyHelper(root, fileStats, next, betterFileStats) {
      // TODO ensure that root is relative
      var fullpath = path.normalize(root + '/' + fileStats.name)
        , relpath = root
        ;

      function enqueForRemoval() {
        fileStats.root = realroot;
        fileStats.path = relpath;
        // fileStats.name
        // fileStats.ext

        nodesToRemove.push(fileStats);

        if (totalSize < sizeLimit && totalCount < countLimit) {
          next();
          return;
        }

        syncAndRemoveOriginals(function () {
          nodesToRemove = [];
          totalSize = 0;
          totalCount = 0;
          next();
        }, nodesToRemove);
      }

      function copyIfRealpathIsInScope(realpath) {
        // TODO check that `dbroot` has enough space first

        // when walking a directory, we want to be careful not to import
        // files that live outside of the import path
        if (realroot && realroot !== realpath.substr(0, realroot.length)) {
          next();
          return;
        }

        totalSize += fileStats.size;
        totalCount += 1;
        if (!betterFileStats) {
          // this is coming from an import rather than an upload
          betterFileStats || {
              uuid: UUID.v1()
            , path: root
            , name: fileStats.name
            , mtime: fileStats.mtime
            , atime: fileStats.atime
            , ctime: fileStats.ctime
            , uid: fileStats.uid
            , gid: fileStats.gid
            , mode: fileStats.mode
            , size: fileStats.size
          };
        } else if (!betterFileStats.uuid) {
          // Note: md5sum is not yet available for an import
          betterFileStats.uuid = UUID.v1(); 
        }
        fileStats.uuid = betterFileStats.uuid;

        betterFileStats.name = betterFileStats.name || fileStats.name;
        // TODO sniff mimetype with magic
        betterFileStats.type = betterFileStats.type || Mime.lookup(betterFileStats.name);
        store(enqueForRemoval, realpath, fileStats, betterFileStats);
      }

      function resolveRealpath() {
        fs.realpath(fullpath, function (err, realpath) {
          if (err) {
            // ignore broken links
            next();
            return;
          }

          fs.lstat(realpath, function (e, stat) {
            if (err) {
              // probably a broken link
              next();
              return;
            }

            // realpath will not be a symlink
            // ignore blocks, directories, etc
            if (!stat.isFile()) {
              next();
              return;
            }

            copyIfRealpathIsInScope(realpath, stat);
          });
        });
      }

      // if it's not a "real" stats object
      // then we can assume that it's a file
      if (fileStats.isFile && fileStats.isFile()) {
        copyIfRealpathIsInScope(fullpath);
        return;
      }

      // is a symlink
      resolveRealpath();
    }

    function syncAndEnd(cb) {

      syncAndRemoveOriginals(function () {
        nodesToRemove = [];
        totalSize = 0;
        totalCount = 0;
        // TODO removeLast().then(sync)
        cb();
      }, nodesToRemove);
    }

    function importOne(cb, root, stat, stat2) {
      function next() {
        syncAndEnd(cb);
      }
      copyHelper(root, stat, next, stat2);
    }

    return {
        "copyHelper": copyHelper
      , "syncAndEnd": syncAndEnd
      , "importOne": importOne
    };
  }

  module.exports.create = createImporter;
}());
