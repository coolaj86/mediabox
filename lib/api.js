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

    function createFormaline(req, res) {
      // https://github.com/rootslab/formaline
      formalineConfig = {
          "sha1sum": false
        , "uploadRootDir": (config.tmproot || "/tmp") + '/'
        , "removeIncompleteFile": true
        , "listeners": {
              "loadstart": function () {
                req.session.touch();
                formalineHash = crypto.createHash('md5');
              }
            , "fileprogress": function (ev, chunk) {
                req.session.touch();
                formalineHash.update(chunk); 
              }
            , "load": function (json) {
                console.log('load:');
                // here's a file
                if (json.value && json.value.path) {
                  json.value.md5sum = formalineHash.digest('hex');
                  // name: <field-name>
                  // value:
                  //    name: <original filename>
                  //    path: <current path>
                  //    type: <mimetype>
                  //    size: <number of bytes>
                  //    lastModifiedDate: <Date>???
                  //    sha1checksum: <null or checksum>
                  //    md5sum: <as added above>
                }
                //mediabox.importOne();
                console.log(json);
                // there may be another file afterwards
                formalineHash = crypto.createHash('md5');
              }
            , "loadend": function (json, res, callback) {
                req.session.touch();
                callback(json, res);
              }
          }
      };
      formaline = new Formaline(formalineConfig)
        .parse(req, res, importFiles);
      //return formaline;
    }

    // okay, this is a bit of an anti-pattern,
    // but `mediabox` passed on to the thing that requires it
    // which is where the magic methods are added
    var mediabox
      , formalineConfig
      , formalineHash
      , formaline
      ;

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
    }

    // TODO limit upload size for this resource
    // TODO if md5sum is present, inform user (and reject duplicates)
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
