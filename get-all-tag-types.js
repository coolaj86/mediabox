(function () {
  "use strict";

  var fs = require('fs')
    , count = 0
    , m4a = {}
    , id3v1 = {}
    , id3v2 = {};

  function readId3v1(tag) {
    Object.keys(tag).forEach(function (key) {
      id3v1[key] = (id3v1[key] || 0) + 1;
    });
  }

  function readId3v2(tag) {
    Object.keys(tag).forEach(function (key) {
      id3v2[key] = (id3v2[key] || 0) + 1;
    });
  }

  fs.readFile('all-tags.json', function (err, data) {
    var tags = JSON.parse(data);
    tags.forEach(function (tag) {
      count += 1;
      readId3v1(tag.ID3v1 || []);
      delete tag.ID3v1;
      readId3v2(tag.ID3v2 || []);
      delete tag.ID3v2;
      Object.keys(tag).forEach(function (key) {
        m4a[key] = (m4a[key] || 0) + 1;
      });
    });
    console.log(JSON.stringify({
      count: count,
      m4a: m4a, 
      id3v1: id3v1, 
      id3v2: id3v2
    }, null, '  '));
  });

}());
