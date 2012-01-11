(function () {
  "use strict";

  var fs = require('fs')
    , uuid = require('node-uuid')
    , crypto = require('crypto')
    ;

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
        ;

      function move() {
        var newpath
          , newname
          ;
         
        newpath = dbroot + '/' + fileStats.md5sum.substr(0, 3) + '/' + fileStats.md5sum;
        if (-1 !== fileStats.name.indexOf('.')) {
          fileStats.ext = fileStats.name.substr(fileStats.name.lastIndexOf('.') + 1);
          newpath += '.' + fileStats.ext;
        }

        fs.rename(tmppath, newpath, function (err) {
          if (err) {
            console.error('[ERROR] cannot create link ' + tmppath + ' -> ' + newpath + ': ' + err.message);
            console.error(err.stack);
          }

          cb(err, fileStats);
        });
      }

      function getChecksums() {
          ;

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

          function preHash() {
            hashStream = fs.createReadStream(fullpath)
            hashStream.on('data', function (chunk) {
              hash.update(chunk);
            });

            hashStream.on('end', function () {
              fileStats.md5sum = hash.digest('hex');

              writeIfNotExists();
            });
          }

          function writeIfNotExists() {
            // TODO check if the file already exists
            if (fileStats.md5sum) {
              if (false /* fileExists */) {
                cb();
                return;
              }
            }

            readStream = fs.createReadStream(fullpath);

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

      function getStats(e, stats) {
        if (e) {
          console.error('[ERROR] cannot stat ' + fullpath, e.message);
          console.error(e.stack);
          cb(e);
          return;
        }
        
        fileStats = stats;
        // is this right?
        fileStats.filepath = fullpath.substr(0, fullpath.lastIndexOf('/'));
        fileStats.name = fullpath.substr(fullpath.lastIndexOf('/') + 1);
        copyAndChecksum();
      }

      if (!fileStats) {
        fs.lstat(fullpath, getStats);
      } else {
        copyAndChecksum();
      }
    }

    populateDbRoot(dbroot);

    return copy;
  }

  module.exports.create = create;

  function gotErDone() {
    console.log('All Done');
  }

  create()(gotErDone, './testroot/absolute/real');

}());
