/*jshint node:true es5:true laxcomma:true laxbreak:true*/
(function () {
  "use strict";

  var sqlite3 = require('sqlite3').verbose()
    , sqlitize = require('./sqlitize3')
    , future = require('future')()
    , directive = require('./files-table')
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

  Db.prototype.createTable = function () {
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
  
  function run(fileMetaDir, outputSqlite) {
    var db = Db.create('./', outputSqlite.replace(/\.sqlite.*/g, ''))
      , walk
      , values = []
      , count = 0
      ;

    db.init(function () {
      console.log('db initialized');

    walk = Walk.walk(fileMetaDir);
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

        /*
            uuid: true,
            md5sum: true,
            path: true,
            name: true,
            mtime: true,
            atime: true,
            ctime: true,
            uid: true,
            gid: true,
            mode: true,
            size: true,
            type: true,
            importedAt: true,
        */

        meta = JSON.parse(json);

        value.id = meta.uuid || meta_sha1sum;
        value.updated_at = stat.mtime.valueOf();
        value.created_at = stat.ctime.valueOf();

        value.uuid = meta.uuid || uuid.v4();
        value.md5 = meta.md5sum || stat.name.replace(/(.*?)\..*/, '$1');
        // value.sha1 = 
        value.path = meta.path;
        value.name = meta.name;
        value.ctime = meta.ctime;
        value.mtime = meta.mtime;
        value.atime = meta.atime;
        value.uid = meta.uid;
        value.gid = meta.gid;
        value.mode = meta.mode;
        value.size = meta.size;
        value.type = meta.type;
        value.imported_at = meta.importedAt || stat.mtime.valueOf();

        values.push(value);
        if (values.length >= 1000) {
          console.log('flush time', count, count * 1000);
          count += 1;
          flushSql(next);
        } else {
          next();
        }

      });
    });

    walk.on('end', flushSql);
    });

    function flushSql(cb) {
      var sql = sqlitize.insert_many(directive.tables[0], values, { resolve: 'ignore' })
        ;

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
    run(process.argv[2], process.argv[3] || 'meta');
  }
  /*
    //stathash: true,
    //dev: true,
    //ino: true,
    //nlink: true,
    //rdev: true,
    //blksize: true,
    //blocks: true,

    //storepath: true,
    //ext: true }
  */
}());
