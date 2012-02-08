(function () {
  "use strict";

  var connect = require('steve')
    , path = require('path')
    , crypto = require('crypto')
    , Formaline = require('formaline')
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

      pathname = path.resolve(config.automountDir, req.body.path);
      if (
        (config.automountDir.length === pathname.length)
        ||
        (config.automountDir !== pathname.substr(0, config.automountDir.length))
      ) {
        res.error(
            "Unsafe path specified. "
          + "Path must not begin with '/' and "
          + "must be a direct relative path to an automounted volume"
        );
        res.json();
        return;
      }

      path.exists(pathname,function (err) {
        if (err) {
          res.error(err);
          res.json();
          return;
        }

        function respond(err, info) {
          if (err) {
            res.error(err);
          }
          res.json(info);
        }

        importAll(respond, {
            "pathname": pathname
        });
      });
    }

    function router(app) {
      app.post('/upload', importUploads);
      app.get('/media/mounts', getAutoMountMedia);
      app.post('/media/import', importFromMedia);
    }

    mediabox = connect.createServer(
        connect.router(router)
    );

    return mediabox;
  }

  module.exports.create = create;
}());
