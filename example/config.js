(function () {
  "use strict";

  var config
    , path = require('path')
    ;

  config =
    { dbroot: path.resolve(__dirname, '../tests/testdb/')
    // using the full dirname is too many chars for exec
    // dbroot: __dirname + '/' + '../tests/testdb/'
    //, tmproot: 'testdb/tmp'
    , filesroot: path.resolve(__dirname, '../tests/testdb/files/all')
    //, metaroot: 'testdb/meta'
    //, audioroot: 'testdb/audio'
    , automountDir: path.resolve(__dirname, '../tests/automounts')
    , remove: false
    , hardlink: true
    , softlink: false
    };

  module.exports = config;
}());
