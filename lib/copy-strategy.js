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

    function copy(cb, fullpath, fileStats) {
      var readStream
        , writeStream
        , checksum
        , tmppath
        , newpath
        ;

      function writeExtensionSymlinkIfNotExists() {

        function unlinkTmp(e) {
          if (e) {
            console.error('[ERROR] link failed', e.message);
            //console.error('[ERROR] cannot create symlink ' + fileStats.storepath + ' -> ' + newpath);
            console.error(e.stack);
            return;
          }

          fs.unlink(tmppath);
          cb(null, fileStats);
        }

        // preserve extensions as soft links (rsync-safe)
        function createExtensionSymlink(e) {
          // this extension already exists
          if (!e) {
            fs.unlink(tmppath);
            cb(null, fileStats);
            return;
          }

          // this extension doesn't exist yet
          // give relative path in same directory
          fs.symlink(fileStats.md5sum, newpath, unlinkTmp);
        }

        fs.lstat(newpath, createExtensionSymlink);
      }

      function move() {

        function writeExtensionSymlink(err) {
          if (err) {
            console.error('[ERROR] cannot create link ' + tmppath + ' -> ' + fileStats.storepath);
            console.error(err.message);
            console.error(err.stack);

            // TODO check return value?
            fs.unlink(tmppath);
            cb(err, fileStats);
            return;
          }

          if (newpath === fileStats.storepath) {
            // TODO check return value?
            fs.unlink(tmppath);
            cb(null, fileStats);
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
            var newname
              ;
             
            newpath = filesroot + '/' + fileStats.md5sum.substr(0, 3) + '/' + fileStats.md5sum;
            fileStats.storepath = newpath;

            if (-1 !== fileStats.name.indexOf('.')) {
              fileStats.ext = fileStats.name.substr(fileStats.name.lastIndexOf('.'));
              newpath += fileStats.ext;
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
                cb(null, fileStats);
              }

              // preserve extensions as soft links (rsync-safe)
              function createExtensionSymlink(e) {
                // this extension already exists
                if (!e) {
                  fs.unlink(tmppath);
                  cb(null, fileStats);
                  return;
                }

                // this extension doesn't exist yet
                // give relative path in same directory
                fs.symlink(fileStats.md5sum, newpath, unlinkTmp);
              }

              fs.lstat(newpath, createExtensionSymlink);
            }

            // XXX BUG TODO
            // what if there is a power failure in the middle
            // of a large write?
            fs.lstat(fileStats.storepath, function (err, stat) {
              // if the checksums are the same but the sizes
              // mismatch, then perhaps there was a power failure
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
              // TODO use newpath if fileStats.md5sum
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

        fileStats.uuid = uuid.v1();
        tmppath = tmproot + '/' + fileStats.uuid;
        fs.link(fullpath, tmppath, copyIfLinkingFailed);
      }

      copyAndChecksum();
    }

    return copy;
  }

  module.exports.create = create;
}());
