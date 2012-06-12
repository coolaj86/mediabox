/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true eqeqeq:true immed:true latedef:true*/
(function () {
  "use strict";

  var sqlite = require('sqlite3')
    , fs = require('fs.extra')
    , sequence = require('sequence').create()
    , db
    ;



  function readyForQuery() {
    db.exec('CREATE VIRTUAL TABLE docs USING fts3(title, body);', function () {
      db.exec(
          "INSERT INTO docs(docid, title, body) VALUES(1, 'bar', 'baz corge grault qux quux');"
        + "INSERT INTO docs(docid, title, body) VALUES(15, 'baz', 'bar corge grault qux quux');"
        + "INSERT INTO docs(docid, title, body) VALUES(37, 'bar', 'corge grault qux quux');"
        , function () {
        db.each("SELECT docid, title, body FROM docs WHERE docs MATCH 'baz';", function (err, record) {
          console.log('matching bazes');
          err && console.error(err);
          console.log(record);
        });
        db.each("SELECT docid, title, body FROM docs WHERE docs MATCH '*rault';", function (err, record) {
          console.log('matching rault');
          err && console.error(err);
          console.log(record);
        });
        db.each("SELECT docid, title, body FROM docs WHERE docs MATCH 'graul*';", function (err, record) {
          console.log('matching graul');
          err && console.error(err);
          console.log(record);
        });
      });
    });
  }

  db = new sqlite.Database(":memory:", readyForQuery);
}());
