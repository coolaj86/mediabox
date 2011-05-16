(function () {
  "use strict";

  var config = require('./config')
    , dedupByTagdata = require('./lib/dedup-by-tagdata')
    , fs = require('fs')
    , normalizedTags
    , writeStream
    , firstItem = true;

  normalizedTags = JSON.parse(fs.readFileSync(config.uniqueStreamsJson));
  console.log('read: ' + config.uniqueStreamsJson);
  console.log('streams: ' + normalizedTags.length);
  normalizedTags = dedupByTagdata(normalizedTags);
  console.log('unique songs: ' + normalizedTags.length);
  writeStream = fs.createWriteStream(config.uniqueSongsJson);

  writeStream.write('[');
  normalizedTags.forEach(function (tag) {
    if (!firstItem) {
      writeStream.write('\n,' + JSON.stringify(tag));
    } else {
      firstItem = false;
      writeStream.write(JSON.stringify(tag));
    }
    
  });
  writeStream.write('\n]');
  writeStream.end();
  console.log('wrote: ' + config.uniqueSongsJson);
}());

    /*
    artistKeys = Object.keys(artists);
    titleKeys = Object.keys(titles);

    function searchArtist(str) {
      var results = [];

      str = asciify(str);
      if (str.length < 3) {
        return;
      }

      artist_keys.forEach(function (artist_name) {
        if (artist_name.match(str)) {
          results = results.concat(artists[artist_name]);
        }
      });
      return results;
    }

    function searchTitles(str) {
      var results = [];

      str = asciify(str);
      if (str.length < 3) {
        return;
      }

      title_keys.forEach(function (title_name) {
        if (title_name.match(str)) {
          results = results.concat(titles[title_name]);
        }
      });
      return results;
    }
    */

