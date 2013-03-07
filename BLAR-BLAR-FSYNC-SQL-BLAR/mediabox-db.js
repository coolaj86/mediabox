/*jshint node:true es5:true laxcomma:true laxbreak:true*/
(function () {
  "use strict";

  var sqlite3 = require('sqlite3').verbose()
    , sqlitize = require('./sqlitize3')
    , future = require('future')()
    , directive = require('./couchy')
    , forEachAsync = require('forEachAsync')
    , path = require('path')
    , crypto = require('crypto')
    , Walk = require('walk')
    , fs = require('fs')
    , uuid = require('node-uuid')
    //, snappy = require('snappy')
    , zlib = require('zlib')
    ;

  function Db(dbpath, name) {
    this._dbpath = path.join(dbpath, name + '.sqlite3');
    this._name = name;
  }

  Db.prototype.init = function (cb) {
    var self = this
      ;

    self._cb = cb;
    self._db = new sqlite3.Database(this._dbpath, function (err) {
      if (err) {
        cb(err);
        return;
      }
      self.createTable();
    });
  };

  Db.prototype.createTable = function (err) {
    var self = this
      ;

    forEachAsync(directive.tables, function (next, table) {
      sqlitize.table(table, function (err, sql) {
        //console.log(sql);
        self._db.exec(sql, function (err) {
          if (err) {
            console.log('errorinated');
            return;
          }
          next();
        });
      });
    }).then(function () {
      self._cb();
    });
  };

  Db.create = function (a, b, c) {
    return new Db(a, b, c);
  };

  module.exports = Db;
  
  function run() {
    var db = Db.create('./', 'audio')
      , walk
      , values = []
      , count = 0
      ;

    db.init(function () {
      console.log('db initialized');
    });

    var sql = sqlitize.insert_many(directive.tables[0], [{
      id: "some id",
      uuid: "blar blar blar blar",
      file_md5: "d41d8cd98f00b204e9800998ecf8427e",
      content_md5: "d41d8cd98f00b204e9800998ecf8427e",
      file_sha1: "d41d8cd98f00b204e9800998ecf8427e",
      content_sha1: "d41d8cd98f00b204e9800998ecf8427e",
      created_at: Date.now(),
      updated_at: Date.now(),
      value: { "any key at all": "anynthing at all, doesn't even matter" }
    }], { resolve: 'ignore' });

    //console.log(sql);
    //db._db.exec(sql);

    walk = Walk.walk(process.argv[2]);
    walk.on('file', function (root, stat, next) {
      var rs
        , hash = crypto.createHash('sha1')
        , json = ''
        , value = {}
        , meta
        , sql
        ;

      //console.log(stat);
      rs = fs.createReadStream(path.join(root, stat.name), { encoding: 'utf8' });
      rs.on('data', function (chunk) {
        json += chunk;
        hash.update(chunk);
      });
      rs.on('end', function () {
        var meta_sha1sum = hash.digest('hex') // though base64 would be fun
          ;

        //console.log(meta_sha1sum);
        meta = JSON.parse(json);
        value.updated_at = stat.mtime.valueOf();
        value.created_at = stat.ctime.valueOf();
        //console.log(stat.name);
        value.file_md5 = stat.name.replace(/(.*?)\..*/, '$1');
        //console.log(value.file_md5);
        value.content_md5 = meta.stream && (meta.stream.md5 || meta.stream.md5sum);
        //console.log(value.content_md5);
        //value.file_sha1;
        //value.content_sha1;
        value.id = meta.uuid || meta_sha1sum;
        value.uuid = meta.uuid || uuid.v4();
        //console.log(meta);

        meta.stream = undefined;
        meta.uuid = undefined;
        meta.md5 = undefined;
        meta.md5sum = undefined;
        meta.filemd5 = undefined;
        meta.fileMd5 = undefined;

        value.value = JSON.stringify(meta);
        //console.log('about to compress');
        //snappy.compress(meta, function (err, snapped) {
        //zlib.gzip(JSON.stringify(meta), function (err, snapped) {
        //zlib.deflate(JSON.stringify(meta), function (err, snapped) {
        //  if (err) {
        //    console.error(err);
        //    return;
        //  }
        //  value.value = snapped.toString('base64');

        values.push(value);
        if (values.length >= 1000) {
          console.log('flush time', count, count * 1000);
          count += 1;
          flushSql(next);
        } else {
          next();
        }

        });
      //});

    });
    walk.on('end', flushSql);
    function flushSql(cb) {
      sql = sqlitize.insert_many(directive.tables[0], values, { resolve: 'ignore' });
      db._db.exec(sql, function (err) {
        if (err) {
          console.log(sql);
          console.log(err);
        }
        values = [];
        if ('function' === typeof cb) {
          cb();
        }
      });
    }
  }

  if (require.main === module) {
    run();
  }

}());
