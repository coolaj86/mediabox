/*

  Goals:
    * Reversable
    * Non-destructive in the event of power-failure
    * motivates me to complete mediabox

 */
(function () {
  "use strict";

  var Walk = require('walk')
    , fs = require('fs')
    , path = require('path')
    , exec = require('child_process').exec
    , forEachAsync = require('forEachAsync')
    , Store = require('./store-strategy')
    ;

  function create(options) {
    var store = Store.create(options)
      // could be arguments
      , sizeLimit = 1024 * 1024 * 1024 // 1GB
      , countLimit = 1000 // 1,000 files
      , totalSize = 0
      , totalCount = 0
      , walker
      , realroot
      , relroot
      // TODO test if read-only filesystem
      , realRemove
      , rootDeviceId
      , callback
      ;

    function removeFile(cb, fullpath) {
      fs.unlink(fullpath, function (err) {
        if (err) {
          console.warn('[WARN] could not remove symlink', err.message);
        }

        cb();
      });
    }

    function relinkFile(cb, fileStats) {
      // TODO path should be relative, root should be absolute
      //var fullpath = fileStats.root + '/' + fileStats.path + '/' + fileStats.name
      var fullpath = path.normalize(fileStats.path + '/' + fileStats.name)
        , bakfile = fullpath + '.mediabox-bak'
        ;

      // no use in trying to hard link files on different devices
      if (fileStats.dev !== rootDeviceId) {
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

      fs.rename(fullpath, bakfile, function (e) {
        if (e) {
          console.error('[rename failed]', e.message);
          // TODO report some sort of error?
          return cb();
        }

        console.log('[storepath]', fileStats.storepath);
        fs.link(fileStats.storepath, fullpath, function (e) {
          if (e) {
            console.error('[link failed]', e.message);

            fs.rename(bakfile, fullpath, function (e) {
              if (e) {
                console.error('[ERROR unrenaming]', fullpath, e.message);
                console.error(e.stack);
                return;
              }
            });
          }

          fs.unlink(bakfile, cb);
        });
      });
    }

    function sync(cb) {
      exec('sync', function (err, stdout, stderr) {

        if (err) {
          console.error('[ERROR] How the heck can `sync` fail?', err.message);
          console.error(err.stack);
          return;
        }

        if (stderr) {
          err = new Error(stderr);
          console.error('[ERROR] How the heck can `sync` have errors?', stderr);
          return;
        }

        cb(err || stderr);
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

        forEachAsync(toRemove, eachinate).then(sync).then(cb);
      }

      sync(removeOriginalsIfSyncSucceeded);
    }

    function moveNodes(cb, eventName) {
      var nodesToRemove = []
        ;

      function copyHelper(root, fileStats, next) {
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

          if (realroot !== realpath.substr(0, realroot.length)) {
            next();
            return;
          }

          totalSize += fileStats.size;
          totalCount += 1;
          // TODO check that `dbroot` has enough space first
          store(enqueForRemoval, realpath, fileStats);
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

        if (fileStats.isFile()) {
          copyIfRealpathIsInScope(fullpath);
          return;
        }

        // is a symlink
        resolveRealpath();
      }

      function syncAndEnd() {
        console.log('Copied ', (eventName || 'file') + 's');

        syncAndRemoveOriginals(function () {
          nodesToRemove = [];
          totalSize = 0;
          cb();
        }, nodesToRemove);
      }

      walker = Walk.walk(realroot);
      walker.on(eventName || 'file', copyHelper);
      walker.on('end', syncAndEnd);
    }

    function getTargetDeviceId(e, stat) {

      if (e) {
        console.error('[realroot ERROR]', err.message);
        console.error(e.stack);
        return;
      }
      
      rootDeviceId = stat.dev; 

      console.log('root:', realroot);
      moveNodes(function () {
        moveNodes(function () {
          callback();
        })
      }, 'symbolicLink');
    }

    function init(_callback, _relroot) {
      callback = _callback;

      relroot = _relroot;
      if ('./' === relroot) {
        relroot = '';
      }

      fs.realpath(path.resolve(process.cwd(), relroot), function (e, _realroot) {
        if (e) {
          console.error('[realroot ERROR]', e.message);
          console.error(e.stack);
          return;
        }

        realroot = _realroot;
        fs.lstat(realroot, getTargetDeviceId);
      });
    }

    realRemove = options.realRemove || false

    return init;
  }

  module.exports.create = create;
}());
