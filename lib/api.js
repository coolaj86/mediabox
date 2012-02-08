(function () {
  "use strict";

  var connect = require('steve')
    , path = require('path')
    , crypto = require('crypto')
    , Formaline = require('formaline')
    , fs = require('fs')
    ;

  function create(config) {

    // okay, this is a bit of an anti-pattern,
    // but `mediabox` passed on to the thing that requires it
    // which is where the magic methods are added
    var mediabox
      , formalineConfig
      , formalineHash
      , formaline
      ;

    formalineConfig = {
        "sha1sum": false
      , "listeners": {
            "fileprogress": function (ev, chunk) {
              formalineHash.update(chunk); 
            }
          , "loadstart": function () {
              formalineHash = crypto.createHash('md5');
            }
          , "load": function (json, res) {
              json.md5sum = formalineHash.digest('hex');
              // there may be another file afterwards
              formalineHash = crypto.createHash('md5');
              callback(json, res);
            }
        }
    };
    formaline = new Formaline(formalineConfig);

    function importFiles(json, res) {
      var responses = []
        ;

      function importSingleFile(next, fileObj) {
        //importFile
      }

      function respond() {
        res.end('TODO: give a list of imported files');
      }

      forEachAsync(json.files, importSingleFile)
        .then(respond);
    }

    function importUploads(req, res, next) {
      formaline.parse(req, res, importFiles);
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
        importAll(respond, {
            "pathname": pathname
        });
      });
    }

    function uploadRouter(app) {
      app.post('/upload', importUploads);
    }

    function formRouter(app) {
      app.get('/mounts', getAutoMountMedia);
      app.post('/import', importFromMedia);
    }

    mediabox = connect.createServer(
        connect.router(uploadRouter)
      , connect.bodyParser()
      , connect.router(formRouter)
    );

    return mediabox;
  }

  module.exports.create = create;
}());
