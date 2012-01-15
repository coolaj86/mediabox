(function () {
  "use strict";

  var config
    ;

  config = {
      dbroot: 'testdb/'
    , tmproot: 'testdb/tmp'
    , remove: false
    , hardlink: true
    , softlink: false
  };

  module.exports = config;
}());
