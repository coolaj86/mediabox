(function () {
  "use strict";

  function create (options) {
    options = options || {};
  
    function saveMeta(cb, fileStats) {
      // mtime, size
      cb();
    }

    return saveMeta;
  }

  module.exports.create = create;
}());
