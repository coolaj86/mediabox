(function () {
  "use strict";

  var DB = require('../lib/filedb')
    , audioDb = DB.create('testdb/audio')
    ;

  audioDb.init(function () {
    console.log('Initialized');
  });
}());
