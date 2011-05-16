(function () {
  "use strict";

  var asciify = require('./asciify').asciify
    , ukn = /^unknown$/
    , uknart = /^unknownartist$/
    , uknalb = /^unknownalbum$/;

  function dedupByTagdata(tags) {
    var artists
      , artistKeys
        //, albums
          //, tracks
      , unknownTracks = [];

    function sortTagsByArtistAndTrack(tag) {

      function createSearchArtist() {
        var artist = tag.artist || tag.album_artist || ''; // parse stuff

        artist = asciify(artist);

        // various, variousartists
        if (artist.match(ukn) || artist.match(uknart) || 0 === artist.length) {
          delete tag.artist;
          return;
          //artist = '';
        }

        tag.search_artist = artist;
        return artist;
      }

      function createSearchTitle() {
        var title = tag.title || '';

        title = asciify(title);

        if (title.match(ukn) || 0 === title.length) {
          delete tag.title;
          return;
          // title = '';
        }

        tag.search_title = title;
        return title;

        //titles[title] = titles[title] || [];
        //titles[title].push(tag);
      }

      //
      // artists
      //
      function groupByArtist() {
        var artist
          , artistname
          , track
          , trackname;
        if (artistname = createSearchArtist()) {
          artist = artists[artistname] = artists[artistname] || {};
          if (trackname = createSearchTitle()) {
            if (track = artist[trackname]) {
              // TODO prefer higher quality and purchased songs
              track.unmergedStreams = track.unmergedStreams || [];
              track.unmergedStreams.push(tag);
            } else {
              artist[trackname] = tag;
            }
          } else {
            // TODO parse tag
            artist.unknownTracks = artist.unknownTracks || [];
            artist.unknownTracks.push(tag);
          }
        } else {
          // TODO parse tag
          unknownTracks.push(tag)
        }
      }

      groupByArtist();

      //
      // TODO compilations (sound tracks, hits, etc)
      //
    }

    // create search tags
    artists = {};
    //titles = {};
    //compilations = {};
    var date = new Date().valueOf();
    tags.forEach(sortTagsByArtistAndTrack);
    console.log(new Date().valueOf() - date);

    //
    // rebuild the reduced set of tags
    tags.splice(0, tags.length);
    Object.keys(artists).forEach(function (artistname) {
      var artist = artists[artistname]
        , artUnknownTracks = artist.unknownTracks || [];

      delete artist.unknownTracks;
      Object.keys(artist).forEach(function (trackname) {
        var track = artist[trackname];
        tags.push(track);
      });
      
      artUnknownTracks.forEach(function (track) {
        tags.push(track);
      });
    });
    unknownTracks.forEach(function (track) {
      tags.push(track);
    });

    return tags;
  }

  module.exports = dedupByTagdata;
}());
