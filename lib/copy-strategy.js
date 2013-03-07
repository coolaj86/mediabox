(function () {
  "use strict";

  var fs = require('fs')
    , uuid = require('node-uuid')
    , crypto = require('crypto')
    , path = require('path')
    ;

  /*
   *
   * @param filesroot
   * @param tmproot
   */
  function create(options) {
    var filesroot = options.filesroot
      , tmproot = options.tmproot
      ;

    // betterFileStats is used only to determine the extension
    // fileStats.storepath is created
    // fileStats.md5sum may be appended
    function copy(finishedCopyCallback, fullpath, fileStats, betterFileStats) {
      var readStream
        , writeStream
        , checksum
        , tmppath
        , storePathPlusExt
        ;

      function writeExtensionSymlinkIfNotExists() {

        function unlinkTmp(e) {
          if (e) {
            console.error('[ERROR] link failed', e.message);
            //console.error('[ERROR] cannot create symlink ' + fileStats.storepath + ' -> ' + storePathPlusExt);
            console.error(e.stack);
            return;
          }

          fs.unlink(tmppath);
          finishedCopyCallback(null, fileStats);
        }

        // preserve extensions as soft links (rsync-safe)
        function createExtensionSymlink(doesntExist) {
          var exists = !doesntExist
            ;

          // this extension already exists
          if (exists) {
            unlinkTmp(null);
            return;
          }

          // this extension doesn't exist yet
          // give relative path in same directory
          fs.symlink(fileStats.md5sum, storePathPlusExt, unlinkTmp);
        }

        fs.lstat(storePathPlusExt, createExtensionSymlink);
      }

      function move() {

        function writeExtensionSymlink(err) {
          if (err) {
            console.error('[ERROR] cannot create link ' + tmppath + ' -> ' + fileStats.storepath);
            console.error(err.message);
            console.error(err.stack);

            // TODO check return value?
            fs.unlink(tmppath);
            finishedCopyCallback(err, fileStats);
            return;
          }

          if (storePathPlusExt === fileStats.storepath) {
            // TODO check return value?
            fs.unlink(tmppath);
            finishedCopyCallback(null, fileStats);
            return;
          }

          writeExtensionSymlinkIfNotExists();
        }
        
        fs.rename(tmppath, fileStats.storepath, writeExtensionSymlink);
      }

      function copyAndChecksum() {
        // NOTE: for the general case (a non-duplicate file) it's faster
        // to write and checksum at the same time. For duplicate files this
        // could waste many gigabytes of writes and hours of time
        // TODO have a first-run switch?
        // TODO quicksum first for files >= 10mb?
        function copyIfLinkingFailed(errorLinking) {
          // An error meanins that the file is not on the same filesystem

          var hash = crypto.createHash('md5')
            , hashStream
            , firstRun = true
            ;

          function getHashPath() {
            storePathPlusExt = filesroot + '/' + fileStats.md5sum.substr(0, 3) + '/' + fileStats.md5sum;
            fileStats.storepath = storePathPlusExt;

            // TODO use path.extname
            if (-1 !== betterFileStats.name.indexOf('.')) {
              fileStats.ext = betterFileStats.name.substr(betterFileStats.name.lastIndexOf('.'));
              storePathPlusExt += fileStats.ext;
            }
          }

          function preHash() {
            hashStream = fs.createReadStream(fullpath)
            hashStream.on('data', function (chunk) {
              hash.update(chunk);
            });

            hashStream.on('end', function () {
              fileStats.md5sum = hash.digest('hex');

              checkIfExists();
            });
          }

          function checkIfExists() {
            getHashPath();

            if (!fileStats.md5sum) {
              writeIfNotExists();
              return;
            }

            // checkIfExtensionExists
            function symlinkify() {

              function unlinkTmp(e) {
                if (e) {
                  console.error('[ERROR] link failed', e.message);
                  console.error(e.stack);
                  return;
                }

                fs.unlink(tmppath);
                finishedCopyCallback(null, fileStats);
              }

              // preserve extensions as soft links (rsync-safe)
              function createExtensionSymlink(e) {
                // this extension already exists
                if (!e) {
                  fs.unlink(tmppath);
                  finishedCopyCallback(null, fileStats);
                  return;
                }

                // this extension doesn't exist yet
                // give relative path in same directory
                fs.symlink(fileStats.md5sum, storePathPlusExt, unlinkTmp);
              }

              fs.lstat(storePathPlusExt, createExtensionSymlink);
            }

            // XXX BUG TODO
            // what if there is a power failure in the middle
            // of a large write?
            fs.lstat(fileStats.storepath, function (err, stat) {
              // if the checksums are the same but the sizes
              // mismatch, then perhaps there was a power failure
              // TODO check the full md5sum again to be sure?
              if (err || fileStats.size !== stat.size) {
                writeIfNotExists();
                return;
              }
              
              writeExtensionSymlinkIfNotExists();
            });
          }

          function writeIfNotExists() {
            readStream = fs.createReadStream(fullpath);

            getHashPath();

            // we don't use fs.copy because we can hash while copying
            // if we're using the stream
            if (errorLinking) {
              // TODO use storePathPlusExt if fileStats.md5sum
              // TODO listen to error events on writes
              writeStream = readStream.pipe(fs.createWriteStream(tmppath));
            }

            if (!fileStats.md5sum) {
              readStream.on('data', function (chunk) {
                hash.update(chunk);
              });
            }

            readStream.on('end', function () {
              if (!fileStats.md5sum) {
                fileStats.md5sum = hash.digest('hex');
              }

              // meaning that the file is not on the same filesystem
              if (writeStream) {
                writeStream.on('close', move);
              } else {
                move();
              }
            })
          }

          if (firstRun) {
            preHash();
          } else {
            writeIfNotExists();
          }
        }

        fileStats.uuid = fileStats.uuid || uuid.v1();
        tmppath = tmproot + '/' + fileStats.uuid;
        fs.link(fullpath, tmppath, copyIfLinkingFailed);
      }

      copyAndChecksum();
    }

    return copy;
  }

  module.exports.create = create;
}());
