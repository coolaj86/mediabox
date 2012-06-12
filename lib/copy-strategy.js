/*jshint node:true es5:true laxcomma:true laxbreak:true*/
(function () {
  "use strict";

  var fs = require('fs')
    , uuid = require('node-uuid')
    , crypto = require('crypto')
    , path = require('path')
    , mime = require('mime')
    ;

  function getContent(name) {
    // audio, image, video, text
    return mime.lookup(name).split('/')[0];
  }

  // Porter Robinson
  function Copier(finishedCopyCallback, filesroot, tmproot, fullpath, fileStats, betterFileStats) {
    var me = this
      ;

    if (true !== this instanceof Copier) {
      return new Copier(finishedCopyCallback, fullpath, fileStats, betterFileStats);
    }

    me._filesroot = filesroot;
    me._tmproot = tmproot;

    me._cb = finishedCopyCallback;
    me._fullpath = fullpath;
    me._fileStats = fileStats;
    me._betterFileStats = betterFileStats;

  }

  Copier.prototype.writeExtensionSymlinkIfNotExists = function () {
    var me = this
      ;
  };

  Copier.prototype.copyAndChecksum = function () {
    var me = this
      ;
  };

  Copier.prototype.move = function () {
    var me = this
      ;
  };

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
        , storePathPlusContent
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

          if (storePathPlusContent) {
            fs.symlink(fileStats.md5sum, storePathPlusContent);
          }

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

          function addChunkToHash(chunk) {
            hash.update(chunk);
          }

          function getHashPath() {
            var md5Prefix = fileStats.md5sum.substr(0, 3)
              , contentTypeBase = mime.lookup(String(fileStats.ext||'')).split('/')[0]
              ;

            storePathPlusContent = undefined;
            storePathPlusExt = filesroot + '/all/' + md5Prefix + '/' + fileStats.md5sum;
            fileStats.storepath = storePathPlusExt;

            // TODO use path.extname
            if (-1 !== betterFileStats.name.indexOf('.')) {
              fileStats.ext = betterFileStats.name.substr(betterFileStats.name.lastIndexOf('.'));
              storePathPlusExt += (fileStats.ext||'');
            }

            // excludes application, model, message, and multipart
            if (-1 !== ['audio','image','text','video'].indexOf(contentTypeBase)) {
              storePathPlusContent = filesroot + '/' + contentTypeBase + '/' + md5Prefix + '/'
                + fileStats.md5sum + (fileStats.ext||'');
            }
          }

          function digestHash() {
            fileStats.md5sum = hash.digest('hex');

            checkIfExists();
          }

          function preHash() {
            hashStream = fs.createReadStream(fullpath);
            hashStream.on('data', addChunkToHash);
            hashStream.on('end', digestHash);
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
                /*
                if (!e) {
                  fs.unlink(tmppath);
                  finishedCopyCallback(null, fileStats);
                  return;
                }
                */

                // this extension doesn't exist yet
                // give relative path in same directory
                fs.symlink(fileStats.md5sum, storePathPlusExt, function (e) {
                  if (storePathPlusContent) {
                    fs.symlink(fileStats.md5sum, storePathPlusContent, unlinkTmp);
                  } else {
                    unlinkTmp(null);
                  }
                });
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
            });
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
