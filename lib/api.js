/*jshint strict:true node:true es5:true
onevar:true laxcomma:true laxbreak:true
eqeqeq:true immed:true latedef:true undef:true unused:true*/
(function () {
  "use strict";

  var connect = require('connect')
    , steve = require('./steve')
    , path = require('path')
    , Formaline = require('formaline').Formaline
    , fs = require('fs')
    , UUID = require('node-uuid')
    , toRfc822String = require('./rfc822')
    //, tmpDb = require('./tmpdb').create(1 * 60 * 1000)
    ;

  if (!connect.router) {
    connect.router = require('connect_router');
  }

  function create(config) {
    // okay, this is a bit of an anti-pattern,
    // but `mediabox` passed on to the thing that requires it
    // which is where the magic methods are added
    var mediabox
      , staticServer
      , audioLen
      ;


    function createFormaline(req, res, formCompleteCallback) {
      var form
        ;
        
      function onProgress() {
        req.session.touch();
      }

      function onFileLoad(fieldName, formFile) {
        var meta
          ;

        meta = res.fileMetas[fieldName];
        if (!meta) {
          console.error("Error: unexpected file");
          console.error(formFile);
          req.pause();
          res.error("unexpected file: ", formFile.fieldname, formFile.name);
          //res.json();
          if (formCompleteCallback) {
            formCompleteCallback();
          }
          return;
        }

        formFile.on('end', function () {

          // name: <field-name>
          // value:
          //    name: <original filename>
          //    path: <current path>
          //    type: <mimetype>
          //    size: <number of bytes>
          //    lastModifiedDate: <Date>???
          //    sha1checksum: <null or checksum>
          //    md5sum: <as added above>

          meta.md5sum = formFile.md5;
          if (meta.size && meta.size !== formFile.size) {
            console.warn('odd... the size is a lie');
          }
          meta.size = formFile.size;

          console.log('importing file as:');
          console.log(formFile);

          mediabox.importStrategy.copyHelper(
              // TODO make safe for windows backwards paths
              formFile.path.replace(/(.*\/).*/, '$1') // pathname only
            , { name: formFile.path.replace(/.*\//, '') // filename only
              , size: meta.size
              }
            , function () { /* TODO */ }
            , { name: meta.name
              // uuid would need proper validation, but probably isn't useful anyway
              //uuid: meta.uuid
              , path: meta.path
              // size could be used to make guesstimates on upload optimization?
              //, size: meta.size
              , mtime: meta.mtime
              , atime: meta.atime
              , ctime: meta.ctime
              , uid: meta.uid
              , gid: meta.gid
              , mode: meta.mode
              }
          );

          if (!meta) {
            // note: a bug in some 0.6.x versions breaks req.pause()
            console.error("Error: unexpected file");
            console.error(formFile);
          }
        });
      }

      function onLoadEnd(fields, files) {
        mediabox.importStrategy.syncAndEnd(function () {
          // TODO only show files that uploaded
          // show md5sum for uploaded files
          res.json(files);
          if (formCompleteCallback) {
            formCompleteCallback();
          }
        });
      }

      // See docs at https://github.com/rootslab/formaline
      form = Formaline.create(req, { hashes: ["md5", "sha1"], tmp: config.tmproot, arrayFields: [] });
      form.on('progress', onProgress);
      form.on('field', function (key, val) {
        console.error('Unexpected non-file Field', key, val);
      });
      form.on('file', onFileLoad);
      form.on('end', onLoadEnd);
    }

    function importUploads(req, res, next) {
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
        return "neither mtime or lastModifiedDate parsed";
      }

      if (stat.size && 'number' !== typeof stat.size) {
        return "size should be a number";
      }
      // else, maybe it was finished being generated yet

      //stat.type = stat.type || "";
      if (stat.type && ('string' !== typeof stat.type || stat.type.length > 256)) {
        return "type should be a string shorter than 256 chars (and probably shorter)";
      }

      stat.path = stat.path || stat.relativePath || stat.webkitRelativePath;
      delete stat.relativePath;
      delete stat.webkitRelativePath;
      if (stat.path && ('string' !== typeof stat.path || stat.path.length > 256)) {
        return "path should be a string shorter than 256 chars (and probably shorter)";
      }
    }

    // TODO limit upload size for this resource
    // TODO if md5sum is present
    // if the file exists and the size matches, reject the file
    // if the file exists and the size doesn't match, ignore the md5sum
    // if the file doesn't exist, ignore the md5sum
    function importMeta(req, res) {
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

    function getAutoMountMedia(req, res) {
      fs.readdir(config.automountDir, function (err, nodes) {
        // TODO res.json(err, data); ?
        if (err) {
          res.error(err);
        }
        res.json(nodes);
      });
    }

    function importFromMedia(req, res) {
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

      fs.exists(pathname, function (exists) {
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

        mediabox.importAll(respond, pathname, req.body.remove);
      });
    }

    function uploadRouter(app) {
      app.post('/upload/:id', importUploads);
    }

    function getAudioMeta(req, res) {
      var normalizeTags = require('./normalize-tags')
        , audioCache = mediabox.caches.audio
        , metas = mediabox.caches.meta.all()
        , audioMap
        , audioArr = audioCache.all()
        , result
        , modified
        , nowDate = new Date()
        , now = Date.now()
        ;

      if (true || audioLen && audioLen !== audioArr.length) {
        modified = true;
        audioCache.eTag = UUID.v4().replace('-', '').substr(0, 24);
        audioCache.lastModified = now;
      }
      // TODO add sane caching
      //audioCache.eTag = audioCache.eTag || UUID.v4().replace('-', '').substr(0,24);
      //audioCache.lastModified = audioCache.lastModified || now;
      audioCache.lastModified = now;
      //audioLen = audioArr.length;

      res.setHeader('ETag', audioCache.eTag);
      res.setHeader('Date', toRfc822String(nowDate));
      res.setHeader(
          'Last-Modified'
        , audioCache.lastModified
        //, toRfc822String(new Date(Date.now() - (24 * 60 * 60 * 1000)))
      );
      res.setHeader(
          'Expires'
        , toRfc822String(new Date(now + (5 * 60 * 1000)))
        //, toRfc822String(new Date(Date.now() + (180 * 24 * 60 * 60 * 1000)))
      );
      if (!modified && req.headers['if-modified-since']) {
        res.setHeader('Age', parseInt((now - audioCache.lastModified) / 1000, 10));
        res.statusCode = 304;
        res.end();
        return;
      }

      audioMap = audioCache.allMap();

      metas.forEach(function (meta) {
        var audioMeta = audioMap[meta.md5]
          ;

        if (audioMeta) {
          audioMeta.paths = audioMeta.paths || [];
          audioMeta.paths.push(meta.path);
        }
      });

      result = normalizeTags(audioArr);

      //res.setHeader('Cache-Control', 'max-age=' + (60 * 60));
      res.json(result);
      //res.json(audioArr);
    }

    function formRouter(app) {
      app.post('/upload/new', importMeta);
      app.get('/mounts', getAutoMountMedia);
      app.post('/import', importFromMedia);
      app.get('/audio', getAudioMeta);
    }

    staticServer = connect.createServer();
    // TODO fix 'all' postfix
    console.log('FILES AT', path.resolve(config.filesroot));
    staticServer.use('/files', connect.static(config.filesroot));

    // delete connect.bodyParser.parse['multipart/form-data'];
    mediabox = connect.createServer();
    mediabox.use(steve);
    mediabox.use(staticServer);
    mediabox.use(connect.router(uploadRouter));
    mediabox.use(connect.json());
    mediabox.use(connect.urlencoded());
    mediabox.use(connect.router(formRouter));

    return mediabox;
  }

  module.exports.create = create;
}());
