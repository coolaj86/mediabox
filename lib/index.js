(function () {
  "use strict";

  var Cache = require('./filedb')
    , forEachAsync = require('forEachAsync')
    // http://en.wikipedia.org/wiki/Internet_media_type
    , rootTypes = [
          "audio"
        , "video"
        , "image"
        // "application" is used for pdf, doc, odt, etc
        // but we'll use text because, well, that's what it is
        , "text"
      ]
    , DirInit = require('./init-md5-dirs')
    //, ImportStrategy = require('./import-strategy')
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

    options.dbroot = options.dbroot || './db';
    options.tmproot = options.tmproot || options.dbroot + '/tmp';
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
      caches[type] = Cache.create(options[type + 'root']);
    });


    mediabox = Api.create(options);
    // TODO init should be plugin-like (connect-esque)
    mediabox.caches = caches;
    mediabox.init = function (cb) {
      var populate
        ;

      populate = DirInit.create(options.tmproot, dirs);
      console.info('Populating media directories');
      populate(function () {
        forEachAsync(Object.keys(caches), function (next, key) {
          var cache = caches[key]
            ;

          console.info('Initialize', key);
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
