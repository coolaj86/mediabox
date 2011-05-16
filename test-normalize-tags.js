(function () {
  "use strict";

  var config = require('./config')
    , normalizeTags = require('./lib/normalize-tags')
    , fs = require('fs')
    , pathTags
    , aggregatedTags
    , normalizedTags
    , writeStream
    , firstItem = true;

  console.log('reading ' + config.transferJson);
  pathTags = JSON.parse(fs.readFileSync(config.transferJson));
  console.log('read ' + Object.keys(pathTags).length + ' unique files');
  console.log('reading ' + config.aggregatedTagsJson);
  aggregatedTags = JSON.parse(fs.readFileSync(config.aggregatedTagsJson));
  console.log('read ' + aggregatedTags.length + 'tags');

  console.log('renaming requested tags, stripping all others');
  normalizedTags = normalizeTags(aggregatedTags, pathTags);

  console.log('writing ' + normalizedTags.length + ' tags to ' + config.normalizedJson);
  writeStream = fs.createWriteStream(config.normalizedJson);

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

  console.log('done writing, waiting for buffers to clear');
}());
