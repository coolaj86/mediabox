/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true eqeqeq:true immed:true latedef:true*/
(function () {
  "use strict";

  var Cache = require('./cache-strategy')
    , path = require('path')
    , forEachAsync = require('forEachAsync')
    // http://en.wikipedia.org/wiki/Internet_media_type
    , rootTypes = [
          "audio"
        , "video"
        , "image"
        // "application" is used for pdf, doc, odt, etc
        // but we'll use text because, well, that's what it is
        , "text"
        , "meta"
      ]
    , DirInit = require('./init-md5-dirs')
    , WalkStrategy = require('./walk-strategy')
    , ImportStrategy = require('./import-strategy')
    , Api = require('./api')
    , server
    ;

  function create(options) {
    options = options || {};

    var mediabox
      , caches = {}
      , dirs
      ;

    console.log('dbroot', process.cwd(), options.dbroot);
    options.dbroot = options.dbroot || path.join(__dirname,'db');
    options.tmproot = options.tmproot || options.dbroot + '/tmp';
    console.error('BUG /files/all still here');
    options.filesroot = options.filesroot || options.dbroot + '/files';
    options.metaroot = options.metaroot || options.dbroot + '/meta';
    options.audioroot = options.audioroot || options.dbroot + '/audio';
    options.videoroot = options.videoroot || options.dbroot + '/video';
    options.imageroot = options.imageroot || options.dbroot + '/image';
    options.textroot = options.textroot || options.dbroot + '/text';
    // for documents the mime-type is application
    options.caches = caches;

    dirs = [
        options.filesroot
      , options.metaroot
      , options.audioroot
      , options.videoroot
      , options.imageroot
      , options.textroot
    ];

    rootTypes.forEach(function (type) {
      caches[type] = Cache.create(options[type + 'root'], type);
    });


    mediabox = Api.create(options);
    // TODO init should be plugin-like (connect-esque)
    mediabox.caches = caches;
    mediabox.init = function (cb) {
      var populate
        ;

      cb = cb || function () {};

      populate = DirInit.create(options.tmproot, dirs);
      console.info('Populating media directories');
      populate(function () {
        forEachAsync(Object.keys(caches), function (next, key) {
          var cache = caches[key]
            ;

          console.log('Initialize Cache for', key);
          cache.init(next);
        }).then(cb);
      });
    };
    mediabox.import = WalkStrategy.create({
        "realRemove": options.realRemove
      , "filesroot": options.filesroot
      , "tmproot": options.tmproot
      , "metaroot": options.metaroot
      , "audioroot": options.audioroot
      , "caches": options.caches
    });
    mediabox.importAll = mediabox.import;

    // the root device is the import directory,
    // which should be with the `filesroot`
    mediabox.importStrategy = ImportStrategy.create({
        "realRemove": true
      , "filesroot": options.filesroot
      , "tmproot": options.tmproot
      , "metaroot": options.metaroot
      , "audioroot": options.audioroot
      , "caches": options.caches
    });

    return mediabox;
  }

  module.exports.create = create;
}());
