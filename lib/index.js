(function () {
  "use strict";

  function create(options) {
    options = options || {};

    var mediabox = {}
      , dirs
      ;

    options.dbroot = options.dbroot || './db';
    options.tmproot = options.tmproot || options.dbroot + '/tmp';
    options.filesroot = options.filesroot || options.dbroot + '/files';
    options.metaroot = options.metaroot || options.dbroot + '/meta';
    options.audioroot = options.audioroot || options.dbroot + '/audio';
    options.videoroot = options.videoroot || options.dbroot + '/video';
    options.imageroot = options.imageroot || options.dbroot + '/image';

    dirs = [
        options.filesroot
      , options.metaroot
      , options.audioroot
      , options.videoroot
      , options.imageroot
    ];

    // TODO init should be plugin-like (connect-esque)
    mediabox.init = require('./init-md5-dirs').create(options.tmproot, dirs);
    mediabox.import = require('./import-strategy').create(options);

    return mediabox;
  }

  module.exports.create = create;
}());
