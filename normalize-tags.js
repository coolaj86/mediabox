(function () {
  "use strict";

  var PATH_TAGS_JSON = 'md5-paths-map.json';

  var fs = require('fs')
    , pathTags = JSON.parse(fs.readFileSync(PATH_TAGS_JSON))
    , empty = /^\s+$/
    , id3v1TagMap
    , id3v2TagMap
    , m4aTagMap
    , ctags = [];

  // TODO normalize tag fields after all tag keys and add search name
  // I.E. " -  Some Artist" -> "Some Artist" -> "someartist"

  // http://en.wikipedia.org/wiki/ID3 
  id3v1TagMap = {
    "Title": "title",
    "Artist": "artist",
    "Album": "album",
    "Genre": "genre",
    "Track": "track",
    "Year": "release_date"
  };

  // http://musicbrainz.org/doc/MusicBrainz_Tag
  id3v2TagMap = {
    "TPE1": "artist",
    "TPE2": "album_artist",
    "TALB": "album",
    "TIT2": "title",
    "TRCK": "track",
    "TDRC": "release_date",
    "TCMP": "compilation"
  };


  m4aTagMap = {
    "©ART": "artist",
    "aART": "album_artist",
    "©alb": "album",
    "©nam": "title",
    "trkn": "track",
    "©day": "release_date",
    "cpil": "compilation"
  };


  function reassoc(map, ctag, tag) {
    Object.keys(map).forEach(function (key) {
      if(tag[key] && !tag[key].match(empty)) {
        ctag[map[key]] = tag[key];
      }
    });
  }

  fs.readFile('all-tags.json', function (err, data) {
    var tags = JSON.parse(data);

    tags.forEach(function (tag) {
      var ctag = { extname: '.mp3' };

      ctag.streamMd5sum = tag.stream && tag.stream.md5sum;
      delete tag.stream;

      ctag.fileMd5sum = tag.fileMd5sum;
      delete tag.fileMd5sum;

      if (tag.ID3v1 || tag.ID3v2) {
        if (tag.ID3v1) {
          reassoc(id3v1TagMap, ctag, tag);
        }
        delete tag.ID3v1;

        if (tag.ID3v2) {
          reassoc(id3v2TagMap, ctag, tag);
        }
        delete tag.ID3v2;
      } else {
        reassoc(m4aTagMap, ctag, tag);
        ctag.extname = '.m4a';
      }

      ctag.pathTags = pathTags[ctag.fileMd5sum];

      ctags.push(ctag);
    });

    console.log(JSON.stringify(ctags));
  });

}());
