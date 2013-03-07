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
    , cacheFile = 'cache.mediabox.tmp'
    , walker
    ;

  // this is for removing reference to the original
  // it's the same concept as Object.freeze, more or less
  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function create(dbroot, type) {
    var walker
      , arr = []
      , map = {}
      , updateWait = 1 * 60 * 60 * 1000
      , updateTimeout
      ;

    function init(cb) {
      fs.readFile(dbroot + '/' + cacheFile, 'utf8', function (err, text) {
        if (err) {
          update(cb);
          return;
        }

        try {
          arr = JSON.parse(text);
        } catch(e) {
          update(cb);
          return;
        }

        arr.forEach(function (tag) {
          // TODO
          //map[tag.uuid] = item;
          map[tag.md5] = tag;
        });
        cb(null, arr);
      });
    }

    function update(cb) {
      var arr2 = []
        , map2 = {}
        ;

      console.log('dbroot:', dbroot);
      walker = Walk.walk(dbroot);

      // TODO handle error
      walker.on('file', function (root, stat, next) {
        if (cacheFile === stat.name) {
          next();
          return;
        }
        // these files are expected to be in the range of a few hundred bytes to a few kb
        fs.readFile(path.join(root, stat.name), 'utf8', function (err, text) {
          var tag
            ;

          tag = JSON.parse(text);
          // get just the md5
          tag.md5 = stat.name.replace(/\..*/, '');
          // TODO
          //map2[tag.uuid];
          map2[tag.md5] = tag;
          arr2.push(tag);

          next();
        });
      });

      walker.on('end', function () {
        var stringified = []
          , first = true
          ;

        // atomic, FTW
        arr = arr2;
        map = map2;
        console.log('length', arr.length);

        stringified.push('[\n');
        arr.forEach(function (tag) {
          var comma = first ? ' ' : ','
            ;

          if (first) {
            first = false;
          }

          stringified.push(comma + JSON.stringify(tag) + '\n');
        });
        stringified.push(']\n');

        fs.writeFile(dbroot + '/' + cacheFile, stringified.join(''), function (err) {
          cb(null, arr);
        });
      });

    }

    function lazyUpdate() {
      clearTimeout(updateTimeout);

      fs.unlink(dbroot + '/' + cacheFile, function (err) {
        // ignore err
        setTimeout(function () {
          update(function () {});
        // waiting less than a minute just seems silly
        }, updateWait || 1 * 60 * 1000);
      });
    }

    function add(tag, md5sum) {
      tag.md5 = md5sum;
      /*
      if (map[tag.uuid]) {
        // the cake is a lie
        return;
      }
      map[tag.uuid] = tag;
      */
      if (!map[tag.md5]) {
        lazyUpdate();
        return;
      }
      map[tag.md5] = tag;
      // TODO move saveFile from tagStrategy to here
      //obj = clone(obj);
    }

    function all() {
      // TODO Object.freeze?
      return arr;
    }

    function allMap() {
      // TODO Object.freeze?
      return map;
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
      , allMap: allMap
      , init: init
    };
  }

  module.exports.create = create;
}());
