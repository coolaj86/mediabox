(function () {
  "use strict";

  var config
    ;

  config = {
      dbroot: '../tests/testdb/'
    //, tmproot: 'testdb/tmp'
    //, filesroot: 'testdb/files'
    //, metaroot: 'testdb/meta'
    //, audioroot: 'testdb/audio'
    , remove: false
    , hardlink: true
    , softlink: false
  };

  module.exports = config;
}());
