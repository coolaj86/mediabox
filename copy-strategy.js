(function () {
  "use strict";

  var fs = require('fs')
    , uuid = require('node-uuid')
    , crypto = require('crypto')
    ;

  // TODO occasionally clear out /tmp?

  // TODO also make tmproot
  function populateDbRoot(dbroot) {
    var hexchars = "0123456789abcef"
      , exec = require('child_process').exec
      , i
      , j
      , k
      , len = hexchars.length
      , paths = []
      ;

    paths.push('tmp');

    for (i = 0; i < len; i += 1) {
      for (j = 0; j < len; j += 1) {
        for (k = 0; k < len; k += 1) {
          paths.push('' + hexchars[i] + hexchars[j] + hexchars[k]);
        }
      }
    }

    // TODO use fs.mkdir
    exec("cd '" + dbroot + "'; mkdir -p " + paths.join(' '), function (err, stdout, stderr) {
      if (err) {
        console.error(err.message);
        console.error(err.stack)
      }

      if (stdout) {
        console.log(stdout);
      }

      if (stderr) {
        console.error(stderr);
      }
    });
  }

  function create(options) {
    options = options || {};

    var dbroot = options.dbroot || './testdb'
      , tmproot = options.tmproot || dbroot + '/tmp'
      ;

    function copy(cb, fullpath, fileStats) {
      var readStream
        , writeStream
        , checksum
        , tmppath
        , newpath
        ;

      function move() {
        fs.rename(tmppath, newpath, function (err) {
          if (err) {
            console.error('[ERROR] cannot create link ' + tmppath + ' -> ' + newpath + ': ' + err.message);
            console.error(err.stack);
          }

          // TODO check return value?
          fs.unlink(tmppath);

          cb(err, fileStats);
        });
      }

      function copyAndChecksum() {

        // NOTE: for the general case (a non-duplicate file) it's faster
        // to write and checksum at the same time. For duplicate files this
        // could waste many gigabytes of writes and hours of time
        // TODO have a first-run switch?
        // TODO quicksum first for files >= 10mb?
        function copyIfLinkingFailed(e) {
          // An error meanins that the file is not on the same filesystem

          var hash = crypto.createHash('md5')
            , hashStream
            , firstRun = true
            ;

          function getHashPath() {
            var newname
              ;
             
            newpath = dbroot + '/' + fileStats.md5sum.substr(0, 3) + '/' + fileStats.md5sum;
            if (-1 !== fileStats.name.indexOf('.')) {
              fileStats.ext = fileStats.name.substr(fileStats.name.lastIndexOf('.') + 1);
              newpath += '.' + fileStats.ext;
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

            fs.lstat(newpath, function (err, stat) {
              if (err) {
                writeIfNotExists();
                return;
              }
              
              fs.unlink(tmppath);
              cb(null, fileStats);
            });
          }

          function writeIfNotExists() {
            readStream = fs.createReadStream(fullpath);

            getHashPath();

            if (e) {
              // TODO use newpath if fileStats.md5sum
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

    populateDbRoot(dbroot);

    return copy;
  }

  module.exports.create = create;
}());
