/*
 So here's the thing:
 If you have two+ albums with the same song, for example:
   the single
   the extended
   the normal
 You technically should have two+ licenses to the same song.

 Two things:
   The albums will have different numbers of tracks
   You lose the license to the song

 The best solution is to keep the different tracks
*/
(function () {
  "use strict";

  var asciify = require('./asciify').asciify;

  var tagNames = [
    "track",
    "album",
    "title",
    "album_artist",
    "artist",
    "genre",
    "release_date",
    "compilation",
    // TODO move these elsewhere
    // TODO prefer purchased music
    // TODO Amazon.com Song ID: 219973758
    "extname",
    "owner"
  ];

  function tagsAreDifferent(oldTag, newTag, tagName) {
    newTag[tagName] = newTag[tagName] || '';

    if (!oldTag[tagName]) {
      return 1; // the same
    }
    if (!newTag[tagName]) {
      newTag[tagName] = oldTag[tagName];
      return 2; // better
    }
    if (newTag[tagName] === oldTag[tagName]) {
      return 1; // the same
    }

    if (asciify(newTag[tagName]) === asciify(oldTag[tagName])) {
      if (newTag[tagName].length === oldTag[tagName].length) {
        // take the one with more capitals?
        // who cares?
        return 1;
      } else {
        //console.log('diff lengths', tagName, '"', oldTag[tagName], '" | "', newTag[tagName], '"');
        if (oldTag[tagName] > newTag[tagName]) {
          newTag[tagName] = oldTag[tagName];
          return 2;
        }
        return 1;
      }
    }

    if ('release_date' === tagName) {
      if  (oldTag.release_date.length > newTag.release_date.length) {
        newTag.release_date = oldTag.release_date;
        return 2;
      }
      return 1;
    }

    if ('title' === tagName) {
      if (newTag.title.match(/^\s*track\s+\d+\s*$/i)) {
        newTag.title = oldTag.title;
        return 2;
      }
      if (oldTag.title.match(/^\s*track\s+\d+\s*$/i)) {
        oldTag.title = newTag.title;
        return 1;
      }
    }

    // TODO if both album and track are different, keep separate
    // otherwise, merge album
    //console.log('don\'t match "', tagName, oldTag[tagName], '" | "', newTag[tagName], '"');
    return 0;

    /*
    console.log('not equal "', oldTag[tagName], '" | "', newTag[tagName], '"');

    if (newTag[tagName].length < oldTag[tagName].length) {
      // take the one with more punctuation / special chars
      newTag[tagName] = oldTag[tagName];
      console.log('taking the longer one');
      return;
    } else if (newTag[tagName].length == oldTag[tagName].length) {
      console.log('very interesting that these are the same thing');
    }
    */
  }


  function dedupByStreamMd5sum(tags) {
    // see which streamMd5sumsMap match
    var streamMd5sumsMap = {}
      , streamMd5sumsKeys
      , streamMatchesMap = {}
      , streamMatchesKeys = []
      , merged = []
      , dupCount = 0;

    tags.forEach(function (tag) {
      // if a tag has already been added
      if (streamMd5sumsMap[tag.streamMd5sum]) {
        // if this is the first dup detection
        if (!streamMatchesMap[tag.streamMd5sum]) {
          // put in the original
          streamMatchesMap[tag.streamMd5sum] = [ streamMd5sumsMap[tag.streamMd5sum] ];
        }
        // and now put in this dup
        dupCount += 1;
        streamMatchesMap[tag.streamMd5sum].push(tag);
      } else {
        // put in the original
        streamMd5sumsMap[tag.streamMd5sum] = tag;
      }
    });
    streamMd5sumsKeys = Object.keys(streamMd5sumsMap);
    // console.log('total tags', tags.length, streamMd5sumsKeys.length);

    // get a list of keys
    streamMatchesKeys = Object.keys(streamMatchesMap);
    //console.log(streamMatchesKeys.length);
    merged = [];
    // For all of the streamMd5sumsMap that have duplicates
    streamMatchesKeys.forEach(function (key) {

      var newTag = {};
      // use the tag with the most tags as the base
      streamMatchesMap[key].forEach(function (oldTag) {
        if (Object.keys(oldTag).length > Object.keys(newTag).length) {
          newTag = JSON.parse(JSON.stringify(streamMatchesMap[key][0]));
        }
      });
      newTag.fileMd5sums = [];
      newTag.unmergedTags = [];

      // For each of the duplicates
      streamMatchesMap[key].forEach(function (oldTag) {

        // if all of these tags match when asciified,
        // then this is safe to delete
        var mergeValue
          , okayToMerge = -1;
        tagNames.forEach(function (tagName) {
          mergeValue = tagsAreDifferent(oldTag, newTag, tagName);
          if (mergeValue < 1) {
            okayToMerge = 0;
          } else if (mergeValue > 1 && 0 !== okayToMerge) {
            okayToMerge = 2;
          }
        });

        if (!okayToMerge) {
          // TODO recurse so that unmerged tags
          // aren't duplicates either
          newTag.unmergedTags.push(oldTag);
        } else {
          if (okayToMerge > 1) {
            // take the tag with more metadata
            newTag.fileMd5sum = oldTag.fileMd5sum;
          }
          newTag.fileMd5sums.push(oldTag.fileMd5sum);
        }
      });

      merged.push(newTag);
    });

    // TODO an editor to manually merge the unmerged
    merged.forEach(function (merge) {
      if (merge.unmergedTags.length > 0) {
        //console.log(merge);
      } else {
        delete merge.unmergedTags;
      }
      streamMd5sumsMap[merge.streamMd5sum] = merge;
    });

    tags.splice(0, tags.length);
    //assert.strictEqual(streamMd5sumsKeys.length, Object.keys(streamMd5sumsMap).length);
    streamMd5sumsKeys.forEach(function (streamMd5) {
      tags.push(streamMd5sumsMap[streamMd5]);
    });

    return tags;
  }

  module.exports = dedupByStreamMd5sum;
}());
