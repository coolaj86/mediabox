(function () {
  "use strict";

  var config = require('./config')
    , dedupByStreamMd5sum = require('./lib/dedup-by-stream')
    , fs = require('fs')
    , normalizedTags
    , writeStream
    , firstItem = true;

  normalizedTags = JSON.parse(fs.readFileSync(config.normalizedJson));
  console.log('read: ' + config.normalizedJson);
  console.log('streams: ' + normalizedTags.length);
  normalizedTags = dedupByStreamMd5sum(normalizedTags);
  console.log('unique streams: ' + normalizedTags.length);
  writeStream = fs.createWriteStream(config.uniqueStreamsJson);

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
  console.log('wrote: ' + config.uniqueStreamsJson);
}());
