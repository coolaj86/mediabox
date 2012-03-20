(function () {
  "use strict";

  var config
    ;

  config = {
      dbroot: '/mnt/wd-large-1tb/MediaBox-storage/db/'
    // using the full dirname is too many chars for exec
    // dbroot: __dirname + '/' + '../tests/testdb/'
    //, tmproot: 'testdb/tmp'
    //, filesroot: 'testdb/files'
    //, metaroot: 'testdb/meta'
    //, audioroot: 'testdb/audio'
    //, automountDir: '../tests/automounts'
    , automountDir: '/mnt'
    , remove: false
    , hardlink: true
    , softlink: false
  };

  module.exports = config;
}());
