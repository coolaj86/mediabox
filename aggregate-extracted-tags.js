(function () {
  "use strict";

  var MD5SUM_RE = /[a-z0-9]{32}/i;
  var DB_ROOT = './db';

  var config = require('./config')
    , path = require('path')
    , fs = require('fs')
    , fwStream = fs.createWriteStream(config.aggregatedTagsJson, 'w')
    , walk = require('walk')
    , walker = walk.walk('./db')
    , allTags = [];

  function handleFile(root, stat, next) {
    var filename = path.join(root, stat.name)
      , extname = path.extname(stat.name);

    if ('.json' !== extname) {
      return next();
    }

    function handleJson(err, json) {
      var data;

      if (err) {
        return next();
      }

      //console.log(filename);

      data = JSON.parse(json);
      data.fileMd5sum = stat.name.substr(0, stat.name.indexOf('.'));
      allTags.push(data);

      next();
    }

    fs.readFile(filename, handleJson);
  }

  function handleEnd() {
    var first = true;
    console.log('[');
    allTags.forEach(function (item) {
      var str = JSON.stringify(item);
      if (!first) {
        str = ',' + str;
      } else {
        first = false;
      }
      console.log(str);
    });
    console.log(']');
    //fs.writeFile('all-tags.json', JSON.stringify(allTags));
  }

  walker.on('file', handleFile);
  walker.on('end', handleEnd);
}());
