(function () {
  "use strict";

  var DB = require('./lib/filedb')
    , audioDb = DB.create({ dbroot: 'testdb/audio' })
    ;

  audioDb.update(function () {
    console.log('updated');
  });
}());
