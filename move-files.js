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
    , walker
    , sizeLimit = 1024 * 1024 * 1024 // 1GB
    , totalSize = 0
    , rootpath
    , exec = require('child_process').exec
    , relpath = path.normalize(process.argv[2] + '/')
    , forEachSync = require('forEachSync')
    , realRemove = false
    ;

  function removeFile(cb, fullpath) {
    // TODO
    // move to file.bak, link newpath file, unlink file.bak
    // if this is a symlink, nothing more needed
    fs.unlink(fullpath, function (err) {
      if (err) {
        console.warn('[WARN] could not remove symlink', err.message);
      }

      cb();
    });
  }

  function syncAndRemoveOriginals(cb, toRemove) {
    function removeOriginalsIfSyncSucceeded(err, stdout, stderr) {
        var path
          ;

        if (err) {
          console.error('[ERROR] How the heck can `sync` fail?', err.message);
          console.error(err.stack);
          return;
        }

        if (stderr) {
          console.error('[ERROR] How the heck can `sync` have errors?', stderr);
          return;
        }

        if (realRemove) {
          forEachAsync(toRemove, removeFile).then(cb);
        }
      });
    }

    exec('sync', removeOriginalsIfSyncSucceeded);
  }


  function copySymLinks(cb) {
    var symlinksToRemove = []
      ;

    walker = Walk.walk(rootpath + '/' + relpath);
    
    walker.on('symbolicLink', function (root, fileStats, next) {
      var sympath = root + '/' + fileStats.name
        ;

      fs.realpath(sympath, function (err, realpath) {
        var relpath
          , nextNext
          ;

        if (err) {
          //console.error('[ERROR]', err.message);
          next();
          return;
        }

        if (rootpath !== realpath.substr(0, rootpath.length)) {
          //console.log('[IGNORE] link outside of scope:', realpath);
          next();
          return;
        }

        relpath = realpath.substr(rootpath.length + 1);
        console.log(path.resolve(sympath), '->', relpath + relpath);


        fileStats.pathname = relpath;

        totalSize += fileStats.size;
        console.log(fileStats);

        function enqueForRemoval() {
          symlinksToRemove.push(sympath);

          if (totalSize < sizeLimit) {
            next();
            return;
          }

          syncAndRemoveOriginals(function () {
            symlinksToRemove = [];
            totalSize = 0;
            next();
          }, symlinksToRemove);
        }

        // TODO check that `dbroot` has enough space first
        copyFile(enqueForRemoval, realpath);
      });
    });

    walker.on('end', function () {
      console.log('Copied symlinks');

      syncAndRemoveOriginals(function () {
        symlinksToRemove = [];
        totalSize = 0;
        next();
      }, symlinksToRemove);

      cb && cb();
    });
  }

  function moveRealFiles(next) {
    walker = Walk.walk(rootpath + '/' + relpath);

    walker.on('file', function (root, fileStats, next) {
      //console.log('');
      //console.log(root + '/' + fileStats.name);

      next();
    });

    walker.on('end', function () {
      console.log('Moved Realfiles');
      next && next();
    });
  }

  if ('./' === relpath) {
    relpath = '';
  }

  fs.realpath(path.resolve(process.cwd(), relpath), function (err, pathname) {
    if (err) {
      console.error('[ERROR]', err.message);
      return;
    }

    rootpath = pathname;

    console.log('root:', rootpath);
    copySymLinks();
  });

}());
