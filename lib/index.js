(function () {
  "use strict";

  function create(options) {
    var mediabox = {}
      ;

    // TODO init should be plugin-like (connect-esque)
    mediabox.init = require('./copy-strategy').init;
    mediabox.import = require('./import-strategy').create(options);

    return mediabox;
  }

  module.exports.create = create;
}());
