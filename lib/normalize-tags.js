(function () {
  "use strict";

  var empty = /^\s+$/
    , id3v1TagMap
    , id3v2TagMap
    , m4aTagMap;

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
    "cpil": "compilation",
    "apID": "owner",
    "----[com.apple.iTunes;MusicBrainzArtistId]": "musicbrainz_artist_id",
    "----[com.apple.iTunes;MusicBrainzAlbumArtistId]": "musicbrainz_album_artist_id",
    "----[com.apple.iTunes;MusicBrainzAlbumId]": "musicbrainz_album_id",
    "----[com.apple.iTunes;MusicBrainzTrackId]": "musicbrainz_track_id",
    //"----[com.apple.iTunes;MusicBrainzAlbumReleaseCountry]": "XE",
    "----[com.apple.iTunes;MusicBrainzAlbumType]": "musicbrainz_album_type",
    "----[com.apple.iTunes;MusicBrainzAlbumStatus]": "musicbrainz_album_status",
    "----[com.apple.iTunes;MusicIPPUID]":"musicip_puid"
  };

  function reAssoc(map, ctag, tag) {
    Object.keys(map).forEach(function (curtag) {
      var newtag = map[curtag]
        ;

      if(tag[curtag] && !empty.exec(tag[curtag])) {
        ctag[newtag] = tag[curtag];
      }
    });
  }

  function normalizeTags(aggregatedTags) {
    var tags = aggregatedTags
      , ctags = [];

    tags.forEach(function (tag) {
      var ctag = { extname: '.mp3' };

      ctag.streamMd5sum = tag.stream && tag.stream.md5sum;
      //delete tag.stream;

      ctag.fileMd5sum = tag.md5 || tag.md5sum || tag.fileMd5sum;
      //delete tag.fileMd5sum;

      if (tag.ID3v1 || tag.ID3v2) {
        if (tag.ID3v1) {
          reAssoc(id3v1TagMap, ctag, tag.ID3v1);
        }
        //delete tag.ID3v1;

        if (tag.ID3v2) {
          reAssoc(id3v2TagMap, ctag, tag.ID3v2);
        }
        //delete tag.ID3v2;
      } else {
        reAssoc(m4aTagMap, ctag, tag);
        ctag.extname = '.m4a';
      }

      ctag.paths = tag.paths;

      ctags.push(ctag);
    });

    return ctags;
  }

  module.exports = normalizeTags;
}());
