(function () {
  "use strict";

  var path = require('path');

  module.exports = {
    // permanently move files (the log may be used to revert changes)
    move: false,
    port: 80,
    dbRoot: path.join(__dirname, 'db'),
    metaRoot: path.join(__dirname, 'meta'),
    logRoot: path.join(__dirname, 'logs'),
    transferErr: 'transfer-log.err',
    // append-only log of files moved
    transferLog: 'transfer-log.txt',
    transferLogSorted: 'transfer-log-sorted.txt',
    // md5 map containing paths where files of that md5 were found
    transferJson: 'transfer-log.json',
    // after potentially thousands of tags are extracted file-by-file,
    // all of the tags are combined into a single file
    aggregatedTagsJson: 'aggregated-tags.json',
    // then the tags are reduced to a few tag properties
    normalizedJson: 'normalized-tags.json',
    // and then deduplicated by stream
    uniqueStreamsJson: 'unique-stream-tags.json',
    // and finally by songs
    uniqueSongsJson: 'unique-songs-tags.json'
  };
}());
