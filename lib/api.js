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
      , staticServer
      ;


    function createFormaline(req, res, formCompleteCallback) {
      var lastFileInfo
        , formalineHash
        , formalineConfig
        , formaline
        , quitAlready
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

        meta = res.fileMetas[fileInfo.name];
        if (!meta) {
          quitAlready = true;
          console.error("Error: unexpected file");
          console.error(fileInfo);
          req.pause();
          res.error("unexpected file: ", fileInfo.name, fileInfo.value.name);
          //res.json();
          return;
        }

        //meta.name = fileInfo.value.name;
        formalineHash = crypto.createHash('md5');
        formalineHash.update(chunk); 
      }

      function checkFilestart(fileInfo, chunk) {
        if (
             lastFileInfo.name !== fileInfo.name
          || lastFileInfo.value.name !== fileInfo.value.name
          || !(lastFileInfo.value.size >= fileInfo.value.size)
        ) {
          if (!chunk) {
            chunk = fs.readFileSync(fileInfo.value.path);
          }
          filestart(fileInfo, chunk);
        }
      }

      function onLoadStart () {
        req.session.touch();
      }

      function onFileProgress(fileInfo, chunk) {
        req.session.touch();

        checkFilestart(fileInfo);

        formalineHash.update(chunk); 
      }

      function onFieldLoad(fileInfo) {
        var meta
          ;

        req.session.touch();

        if (!fileInfo.value || !fileInfo.value.path) {
          // this isn't a file, no biggie, skip
          return;
        }
        checkFilestart(fileInfo);

        if (quitAlready) {
          return;
        }

        lastFileInfo.name = '';
        lastFileInfo.value.name = '';
        lastFileInfo.value.size = 0;

        fileInfo.value.md5sum = formalineHash.digest('hex');
        // name: <field-name>
        // value:
        //    name: <original filename>
        //    path: <current path>
        //    type: <mimetype>
        //    size: <number of bytes>
        //    lastModifiedDate: <Date>???
        //    sha1checksum: <null or checksum>
        //    md5sum: <as added above>

        meta = res.fileMetas[fileInfo.name];
        meta.md5sum = fileInfo.value.md5sum;
        if (meta.size && meta.size !== fileInfo.value.size) {
          console.log('odd... the size is a lie');
        }
        meta.size = fileInfo.value.size;

        console.log('importing file as:');
        console.log(fileInfo.value);
        mediabox.importStrategy.copyHelper(
            fileInfo.value.path.replace(/\/\w{40}/, '') // root
          , {
                name: fileInfo.value.path.replace(/.*\//, '')
            }
          , function () {
              // TODO 
            }
          , {
              // uuid would need proper validation, but probably isn't useful anyway
              //uuid: meta.uuid
                name: meta.name
              , path: meta.path
              // size could be used to make guesstimates on upload optimization?
              //, size: meta.size
              , mtime: meta.mtime
              , atime: meta.atime
              , ctime: meta.ctime
              , uid: meta.uid
              , gid: meta.gid
              , mode: meta.mode
              //
            }
        );

        if (!meta) {
          // note: a bug in some 0.6.x versions breaks req.pause()
          console.error("Error: unexpected file");
          console.error(fileInfo);
        }
      }

      function onLoadEnd(formInfo, res, callback) {
        req.session.touch();
        //callback(formInfo, res);
        mediabox.importStrategy.syncAndEnd(function () {
          // TODO only show files that uploaded
          // show md5sum for uploaded files
          res.json(formInfo.files);
        });
      }

      // https://github.com/rootslab/formaline
      formalineConfig = {
          "sha1sum": false
        , "uploadRootDir": (config.tmproot || "/tmp") + '/'
        , "removeIncompleteFile": true
        , "listeners": {
              "loadstart": onLoadStart
            , "fileprogress": onFileProgress
            , "load": onFieldLoad
            , "loadend": onLoadEnd
          }
      };

      formaline = new Formaline(formalineConfig)
        .parse(req, res, formCompleteCallback);
      //return formaline;
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

      createFormaline(req, res, function () {
        // this is handled by the events
      });
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

      stat.path = stat.path || stat.relativePath || stat.webkitRelativePath;
      delete stat.relativePath;
      delete stat.webkitRelativePath;
      if (stat.path && ('string' !== typeof stat.path || !(stat.path.length <= 256))) {
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

    function getAudioMeta(req, res, next) {
      var normalizeTags = require('./normalize-tags');
      var metas = mediabox.caches.meta.all()
        , audioMap
        , audioArr = mediabox.caches.audio.all()
        , result
        ;

      audioMap = mediabox.caches.audio.allMap();

      metas.forEach(function (meta) {
        var audioMeta = audioMap[meta.md5]
          ;

        if (audioMeta) {
          audioMeta.paths = audioMeta.paths || [];
          audioMeta.paths.push(meta.path);
        }
      });

      result = normalizeTags(audioArr);

      // TODO gzip-cache this output
      res.json(result);
      //res.json(audioArr);
    }

    function formRouter(app) {
      app.post('/upload/new', importMeta);
      app.get('/mounts', getAutoMountMedia);
      app.post('/import', importFromMedia);
      app.get('/audio', getAudioMeta)
    }

    staticServer = connect.createServer();
    staticServer.use('/files', connect.static(config.filesroot));

    // delete connect.bodyParser.parse['multipart/form-data'];
    mediabox = connect.createServer(
        staticServer
      , connect.router(uploadRouter)
      , connect.bodyParser()
      , connect.router(formRouter)
    );

    return mediabox;
  }

  module.exports.create = create;
}());
