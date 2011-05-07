(function () {
  "use strict";

  var MD5SUM_RE = /[a-z0-9]{32}/i;

  var path = require('path')
    , fs = require('fs')
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

      console.log(filename);

      data = JSON.parse(json);
      allTags.push(data);

      next();
    }

    fs.readFile(filename, handleJson);
  }

  function handleEnd() {
    fs.writeFile('all-tags.json', JSON.stringify(allTags));
  }

  walker.on('file', handleFile);
  walker.on('end', handleEnd);
}());
