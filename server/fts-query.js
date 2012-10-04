/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true eqeqeq:true immed:true latedef:true*/
(function () {
  "use strict";

  var sqlite = require('sqlite3')
    , path = require('path')
    , dbPath = path.join(__dirname, '..', 'var', 'meta-fts.sqlite3')
    , extPath = path.join(__dirname, '..', 'lib', 'fts4-rank.' + process.platform + '.sqlext')
    , db
    ;

  console.log(dbPath);
  db = new sqlite.Database(dbPath, function (err) {
    db.loadExtension(extPath);
  });

  function doQuery(cb, search) {
    console.log(search);
    var stmt
      //, results = []
      ;

    stmt = "SELECT name, path FROM fts WHERE fts MATCH '" + search.replace(/'/g, "''") + "' LIMIT 20;";
    //stmt = "SELECT 42";
    console.log(stmt);

    //stmt = db.prepare("SELECT name, path FROM fts WHERE fts MATCH '?' LIMIT 20");
    //stmt.run(search, function (err, results) {
    console.log('search', search.replace(/'/g, "''"));
    db.all(
        stmt
      , function (err, results) {
          if (err) {
            console.error(err);
          }
          console.log('results', results);
          cb(results);
        }
    );
  }

  module.exports.query = doQuery;
}());
