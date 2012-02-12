(function () {
  "use strict";

  var connect = require('steve')
    , path = require('path')
    , crypto = require('crypto')
    , Formaline = require('formaline')
    , fs = require('fs')
    , UUID = require('node-uuid')
    //, tmpDb = require('./tmpdb').create(1 * 60 * 1000)
    , metaDb = {}
    ;

  function create(config) {
    // okay, this is a bit of an anti-pattern,
    // but `mediabox` passed on to the thing that requires it
    // which is where the magic methods are added
    var mediabox
      ;


    function createFormaline(req, res) {
      var lastFileInfo
        , formalineHash
        , formalineConfig
        , formaline
        ;
        
      lastFileInfo = {
          name: ""
        , value: {
              name: ""
            , size: 0
          }
      };

      function filestart(fileInfo, chunk) {
        var meta
          ;

        req.session.touch();

        meta = req.fileMetas[fileInfo.name];
        if (!meta) {
          console.error("Error: unexpected file");
          console.error(fileInfo);
          req.pause();
          res.error("unexpected file: ", fileInfo.name, fileInfo.value.name);
          res.json();
          return;
        }

        //meta.name = fileInfo.value.name;
        formalineHash = crypto.createHash('md5');
        formalineHash.update(chunk); 
      }

      // https://github.com/rootslab/formaline
      formalineConfig = {
          "sha1sum": false
        , "uploadRootDir": (config.tmproot || "/tmp") + '/'
        , "removeIncompleteFile": true
        , "listeners": {
              "loadstart": function () {
                req.session.touch();
              }
            , "fileprogress": function (fileInfo, chunk) {
                req.session.touch();

                if (
                     lastFileInfo.name !== fileInfo.name
                  || lastFileInfo.value.name !== fileInfo.value.name
                  || !(lastFileInfo.value.size >= fileInfo.value.size)
                ) {
                  filestart(fileInfo);
                }

                formalineHash.update(chunk); 
              }
            , "load": function (fileInfo) {
                var meta
                  ;

                req.session.touch();

                if (!fileInfo.value || !fileInfo.value.path) {
                  // this isn't a file, no biggie, skip
                  return;
                }

                lastFileInfo.name = '';
                lastFileInfo.value.name = '';
                lastFileInfo.value.size = 0;

                fileInfo.value.md5sum = formalineHash.digest('hex');
                console.log(fileInfo);
                // name: <field-name>
                // value:
                //    name: <original filename>
                //    path: <current path>
                //    type: <mimetype>
                //    size: <number of bytes>
                //    lastModifiedDate: <Date>???
                //    sha1checksum: <null or checksum>
                //    md5sum: <as added above>

                meta = req.fileMetas[fileInfo.name];
                meta.md5sum = fileInfo.value.md5sum;
                if (meta.size && meta.size !== fileInfo.value.size) {
                  console.log('odd... the size is a lie');
                }
                meta.size = fileInfo.value.size;

                // TODO how to 
                /*
                mediabox.copyHelper(
                    fileInfo.value.path.replace(/\/\w{40}/, '') // root
                  , {
                        name: fileInfo.value.path.replace(/.*\//, '')
                    }
                  , function () {}
                  , {
                        name: meta.name
                      , path: meta.path
                      , size: meta.size
                      , mtime: meta.mtime
                    }
                );
                */

                if (!meta) {
                  // note: a bug in some 0.6.x versions breaks req.pause()
                  console.error("Error: unexpected file");
                  console.error(fileInfo);
                }
              }
            , "loadend": function (formInfo, res, callback) {
                req.session.touch();
                //callback(formInfo, res);
                mediabox.syncAndEnd(function () {
                  res.end('TODO: give a list of imported files');
                });
              }
          }
      };
      formaline = new Formaline(formalineConfig)
        .parse(req, res, importFiles);
      //return formaline;
    }

    function importFiles(info, res) {
      var responses = []
        ;

      function importSingleFile(next, fileObj) {
        // TODO be sure to be smart about betterStat
        mediabox.copyHelper(root, stat, next, betterStat);
        //importFile
      }

      function respond() {
        mediabox.syncAndEnd(function () {
          res.end('TODO: give a list of imported files');
        });
      }

      // TODO send md5sum first as a separate request, just
      // like with mediabox
      console.log('fields:');
      console.log(info.fields);

      console.log('files:');
      console.log(info.files);
      info.files.forEach(function (file) {
        var meta = res.fileMetas[file.name]
          ;

        if (!meta) {
          res.error('error: no meta for ', file.name);
        } else {
          // 
        }
      });
      res.json(info);
      console.warn('quitting early for debugging');
      return;

      forEachAsync(info.files, importSingleFile)
        .then(respond);
    }

    function importUploads(req, res, next) {
      var metas
        ;

      if ('new' === req.params.id) {
        next();
        return;
      }

      res.fileMetas = req.session.corsStore.get(req.params.id);

      if (!res.fileMetas) {
        res.error("no matching upload batch");
        res.json();
        return;
      }

      createFormaline(req, res, importFiles);
    }

    function validateMeta(stat) {
      if (!stat || !stat.name) {
        return "missing name";
      }

      stat.mtime = new Date(stat.mtime || stat.lastModifiedDate);
      if (!stat.mtime) {
        return "neither mtime or lastModifiedDate parsed"
      }

      if (stat.size && 'number' !== typeof stat.size) {
        return "size should be a number";
      }
      // else, maybe it was finished being generated yet

      if (stat.type && ('string' !== typeof stat.type || !(stat.type.length <= 256))) {
        return "type should be a string shorter than 256 chars (and probably shorter)";
      }

      stat.path = stat.path || stat.relativePath;
      delete stat.relativePath;
      if (stat.path && ('string' !== typeof stat.type || !(stat.type.length <= 256))) {
        return "path should be a string shorter than 256 chars (and probably shorter)";
      }
    }

    // TODO limit upload size for this resource
    // TODO if md5sum is present
    // if the file exists and the size matches, reject the file
    // if the file exists and the size doesn't match, ignore the md5sum
    // if the file doesn't exist, ignore the md5sum
    function importMeta(req, res, next) {
      var metas = req.body
        , invalid
        , uuid
        ;

      if (!metas || 'object' !== typeof metas || Array.isArray(metas)) {
        req.error("body should be an object");
        //req.error("body should be an array, not " + typeof metas);
        req.json();
        return;
      }

      // validate metadata
      Object.keys(metas).some(function (key) {
        var meta = metas[key]
          ;

        invalid = validateMeta(meta);
        return invalid;
      });

      if (invalid) {
        res.error(invalid);
        res.json();
        return;
      }

      uuid = UUID.v4();
      req.session.corsStore.set(uuid, metas);
      res.json(uuid);
    }

    function getAutoMountMedia(req, res, next) {
      fs.readdir(config.automountDir, function (err, nodes) {
        // TODO res.json(err, data); ?
        if (err) {
          res.error(err);
        }
        res.json(nodes);
      });
    }

    function importFromMedia(req, res, next) {
      var pathname
        ;

      if (!req.body) {
        // TODO res.error(err, true); ?
        res.error("no body received");
        res.json();
        return;
      }

      if (!req.body.path) {
        res.error("no path selected");
        res.json();
        return;
      }

      // TODO move this elsewhere, probably in index
      config.automountDir = path.resolve(config.automountDir);
      pathname = path.resolve(config.automountDir, req.body.path);
      if (
        (config.automountDir.length === pathname.length)
        ||
        (config.automountDir !== pathname.substr(0, config.automountDir.length))
      ) {
        res.error(
            "Unsafe path specified. "
          + "Path must NOT begin with '/' and "
          + "must be a direct relative path to an automounted volume"
        );
        res.json();
        return;
      }

      path.exists(pathname, function (exists) {
        if (!exists) {
          res.error(pathname + " doesn't exist");
          res.json();
          return;
        }

        function respond(err, info) {
          if (err) {
            res.error(err);
          }
          res.json(info);
        }

        // TODO make this work
        mediabox.importAll(respond, pathname);
      });
    }

    function uploadRouter(app) {
      app.post('/upload/:id', importUploads);
    }

    function formRouter(app) {
      app.post('/upload/new', importMeta);
      app.get('/mounts', getAutoMountMedia);
      app.post('/import', importFromMedia);
    }

    // delete connect.bodyParser.parse['multipart/form-data'];
    mediabox = connect.createServer(
        connect.router(uploadRouter)
      , connect.bodyParser()
      , connect.router(formRouter)
    );

    return mediabox;
  }

  module.exports.create = create;
}());
