// update the old mediabox to the new format
//
// cd MediaBox/db
// mkdir ../testdb
//
// mkdir audio
// tar xf empty-md5-children-dirs.tgz -C audio/
// find [0-9a-f][0-9a-f][0-9a-f] -name '*.m4a.json' -or -name '*.mp3.json' -exec ln "{}" "audio/{}" \;
// mv audio ../testdb/
//
// mkdir files
// tar xf empty-md5-children-dirs.tgz -C files/
// find [0-9a-f][0-9a-f][0-9a-f] -name '*.m4a' -or -name '*.mp3' -exec ln "{}" "files/{}" \;
// mv files ../testdb/
// 
(function () {
  "use strict";

  var Walk = require('walk')
    , fs = require('fs')
    , path = require('path')
    , walker
    ;

  // this is for removing reference to the original
  // it's the same concept as Object.freeze, more or less
  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function create(options) {
    var walker
      , arr = []
      , map = {}
      , dbroot = options.dbroot
      ;
    
    function update(cb) {
      var arr2 = []
        , map2 = {}
        ;

      walker = Walk.walk(dbroot);

      // TODO handle error
      walker.on('file', function (root, stat, next) {
        // these files are expected to be in the range of a few hundred bytes to a few kb
        fs.readFile(path.join(root, stat.name), 'utf8', function (err, buf) {
          var tag
            ;

          tag = JSON.parse(buf);
          // TODO
          //map2[tag.uuid];
          arr2.push(tag);

          next();
        });
      });

      walker.on('end', function () {
        // atomic, FTW
        arr = arr2;
        map = map2;
        console.log('length', arr.length);
        cb();
      });

    }

    function add(tag, md5sum) {
      /*
      if (map[tag.uuid]) {
        // the cake is a lie
        return;
      }
      map[tag.uuid] = tag;
      fs.saveFile
      */
      obj = clone(obj);
    }

    function all() {
      return clone(arr);
    }

    function sync() {
      // noop, let the upper layer exec sync
      // TODO use a shared sync module
      return false;
    }

    function onSync(cb) {
    }

    return {
        update: update
      , sync: sync
      , onSync: onSync
      , add: add
      , all: all
    };
  }

  module.exports.create = create;
}());
