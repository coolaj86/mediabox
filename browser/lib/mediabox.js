(function () {
  "use strict";

  var asciify = require('./asciify')
    , request = require('ahr2')
    , targetInfo = require('./target-info')
    , tags
    , playerSel = '.mb-player'
    , playlistItemSel = playlistSel + ' .playlistitem'
    , playlistItemAudio = playlistSel + ' audio'
    , strategy = require('./player-engine').create()
    , player = require('./player').create('.mb-player', strategy)
    , backupPlaylist = []
    , playlist = []
    , nowPlaying
    , playlistHistory = []
    , playlistSel = '.mb-playlist'
    , playlistHistorySel = '.mb-playlist-history'
    , queueMinimum = 3
    ;

  function basename(path, ext) {
    var b = path.lastIndexOf('/') + 1
      , e = path.lastIndexOf(ext || '.')
      ;

    return path.substr(b, e - b);
  }

  function dirname(path) {
    var b = path.lastIndexOf('/');
    return path.substr(0, b);
  }


  var MB_TITLES = 0
    , MB_PATHS = 1;

  var searchable = [
    "title",
    "artist",
    "album_artist",
    "album"
  ];

  function search(pattern) {
    var results = [];

    // TODO just give back the ids
    function find(item) {
      item.pathTags = item.pathTags || [""];
      var hasMatch = false
        , pathname = item.pathTags.join('/')
        , title;

      if (pathname.match(pattern)) {
        hasMatch = true;
      }

      searchable.forEach(function (key) {
        var val = item[key]
          ;
          
        if (!val) {
          return;
        }

        // TODO handle multiple tags better
        if (Array.isArray(val)) {
          val = val[0];
        }

        if (val.match(pattern)) {
          hasMatch = true;
        }
      });

      if (!hasMatch) {
        return;
      }

      // TODO handle multiple titles gracefully
      if (item.title && item.title.toString().match(/\w+/)) {
        var track = item.track && item.track.toString().match(/\s*(\d+).*/)[1];
        if (track) {
          if (track.length < 2) {
            track = '0' + track;
          }
          track += ' - ';
        }
        title = track + item.title + item.extname;
      } else {
        title = basename(item.pathTags[0]) + item.extname;
      }

      // doing this as an array to save memory
      results.push([item.fileMd5sum, title, item]);
    }

    tags.forEach(find);

    return results;
  }

    function pathFromMd5sum(md5sum) {
      var md5split = [  
          '/files',
          md5sum.substr(0,3),
          md5sum
        ];
      return md5split.join('/');
    }

    function extname(path) {
      var p = path.lastIndexOf('.');
      if (p > 0) {
        return path.substr(p);
      }
      return '';
    }

    function mimetype(ext) {
      if (/mp3$/i.test(ext)) {
        return 'audio/mpeg';
      }
    }

    function handleSearch(ev) {
      
      console.log('handling search');
      ev.preventDefault();

      var MD5SUM = 0
        , TITLE = 1
        , ITEM = 2; 

      var query = $('#search-library').val()
        , pattern = new RegExp(query, 'i')
        , results = search(pattern)
        , html = [];

      console.log(query);

      results.sort(function (a, b) {
        var atag = a[ITEM]
          , aartist = atag.artist || ''
          , aalbum = atag.album || ''
          , atitle = atag.title || ''
          , atrack = parseInt(atag.track || 0, 10)
          , btag = b[ITEM]
          , bartist = btag.artist || ''
          , balbum = btag.album || ''
          , btrack = parseInt(btag.track || 0, 10)
          , btitle = btag.title || '';

        // 1 means greater
        // we want to sort 0-9 a-z, so less is more in this case

        if (aartist > bartist) { return -1; }
        if (aartist < bartist) { return 1; }

        if (aalbum > balbum) { return -1; }
        if (aalbum < balbum) { return 1; }

        if (atrack > btrack) { return 1; }
        if (atrack < btrack) { return -1; }

        if (atitle > btitle) { return -1; }
        if (atitle < btitle) { return 1; }

        /*
        console.log('track: ', atrack, btrack);
        console.log('title: ', atitle, btitle);
        console.log('artist: ', aartist, bartist);
        console.log('album: ', aalbum, balbum);
        console.log(' ');
        */

        if (basename(a[TITLE]) > basename(b[TITLE])) { return 1; }
        if (basename(a[TITLE]) < basename(b[TITLE])) { return -1; }

        // this should be fairly unlikely
        return 0;
      });

      var resultItemRows = [];
      results.forEach(function (item) {
        var md5sum = item[MD5SUM]
          , tag = item[ITEM]
          , resource = targetInfo.getApiHref() + pathFromMd5sum(md5sum) + extname(item[TITLE])
          ;

        console.log("The droids you're looking for");
        console.log(item);

        var whattoshow = (item[ITEM].track || '').substr(0,2) + ' - ' + (item[ITEM].title || '') + ' - ' + (item[ITEM].artist || '');

        if (whattoshow.length < 8) {
          whattoshow = basename(item[TITLE]);
        }

        // TODO use PURE as template system
        if (!tag.title) {
          tag.title = basename(tag.pathTags[0]);
        }
        if (!tag.artist) {
          tag.artist = dirname(tag.pathTags[0]);
          tag.artist = tag.artist.split('/');
          tag.artist = tag.artist[tag.artist.length - 2];
        }
        if (!tag.album) {
          tag.album = dirname(tag.pathTags[0]);
          tag.album = tag.album.split('/');
          tag.album = tag.album[tag.album.length - 1];
        }
        resultItemRows.push("" +
          "<tr data-md5sum='" + md5sum + "' class='has-md5sum result'>" + 
            "<td class='add'>" + 
              "<a class='ui-action' href='" + resource + "'>[+]</a>   " + 
            "</td>" +
            "<td class='play'>" + 
              "<a class='ui-action' href='" + resource + "'>[play now]</a>   " + 
            "</td>" +
            "<td class='title'>" + tag.title + "</td>" +
            "<td class='artist'>" + tag.artist + "</td>" +
            "<td class='album'>" + tag.album + "</td>" +
            "</td>" +
          "</tr>" +
        "");
      });

      $('#results').html(html.join('\n'));
      $('#search-results')[0].innerHTML = resultItemRows.join('\n');
    }

    function createDomForTag(tag) {
      var md5sum = tag.fileMd5sum || tag.md5sum || tag.md5
        , ext = tag.extname || tag.ext || extname(String(tag.name || tag.paths || tag.pathTags || ""))
        , resource = targetInfo.getApiHref() + pathFromMd5sum(md5sum) + ext
        ;

      tag.fileMd5sum = md5sum;
      tag.href = resource;
      tag.audio = $('<audio src="' + resource + '" preload="metadata"></audio>')[0];
      // TODO use PURE template
      tag.el = $(
        "<tr data-md5sum='" + md5sum + "' class='has-md5sum playlistitem'>" +
          "<td class='add'>" +
            "<a class='ui-action' href='" + resource + "'>[+]</a>   " +
          "</td>" +
          "<td class='play'>" +
            "<a class='ui-action' href='" + resource + "'>[play now]</a>   " +
          "</td>" +
          "<td class='title'>" + tag.title + "</td>" +
          "<td class='artist'>" + tag.artist + "</td>" +
          "<td class='album'>" + tag.album + "</td>" +
          "</td>" +
        "</tr>"
      );
    }

    function addToPlaylist(tag) {
      createDomForTag(tag);
      playlist.push(tag);
      $(playlistSel).append(tag.el);
      tag.audio.preload = 'metadata';
    }

    function playNext(enque) {
      console.log('next was called from player-engine');
      var playlistEl = $(playlistSel)
        , playlistHistoryEl = $(playlistHistorySel)
        , playlistEls = $(playlistSel + ' ' + '.playlistitem')
        , tag
        ;

      if (!playlistEl || !playlistEl.length) {
        alert('could not find playlist in dom ' + playlistSel);
        return;
      }

      if (!playlistEls) {
        alert('found playlist, but couldn\'t select items in dom ' + playlistSel);
        return;
      }
      
      // the crossfade should finish before the next is loaded
      if (nowPlaying) {
        playlistHistoryEl.append(nowPlaying.el);
        // in case the memory from the file
        // doesn't get cleaned up automatically
        //delete nowPlaying.audio;
      }
      // this one just just started now
      nowPlaying = playlist.shift();
      if (nowPlaying) {
        playlistHistory.push(nowPlaying);
      }

      tags.sort(randomize);
      while ($(playlistSel + ' ' + '.playlistitem').length < queueMinimum) {
        tag = tags.pop();
        tags.unshift(tag);
        // adds el, audio, and md5sum
        addToPlaylist(tag);
      }

      // this is up next
      enque(playlist[0]);
      // and this is next next
      playlist[1].audio.preload = 'auto';
    }

    function onPlayNow(ev) {
      ev.preventDefault();

      var el = $(ev.target).closest('.has-md5sum')
        , md5sum = el[0].dataset.md5sum
        , inPlaylist
        ;

      inPlaylist = playlist.some(function (tag) {
        var result
          ;
        // this is already in the playlist
        if (md5sum === tag.md5sum) {
          console.log('item is in the playlist. yahoo');
          // TODO $('')
          result = true;
        }

        if (el[0] === tag.el[0]) {
          console.log('item is in the dom. yahoo');
          result = true;
        }

        return result;
      });

      if (!inPlaylist) {
        console.log("wasn't in playlist");
      } else {
        console.log("was in playlist");
      }
      console.log("not doing anything about it for now...");
    }

    function onAddToPlaylist(ev) {
      ev.preventDefault();

      var el = $(ev.target).closest('.has-md5sum')
        , md5sum = el[0].dataset.md5sum
        , inTags
        ;

      inTags = tags.some(function (tag) {
        if (tag.fileMd5sum === md5sum) {
          console.log('yahoo, found a search item');
          addToPlaylist(tag);
          return true;
        }
      });

      if (!inTags) {
        console.log('not in tags... way way way odd');
      } else {
        console.log('in tags, but ignoring for now');
      }
    }

  function randomize() {
    return (Math.round(Math.random()) - 0.5);
  }

  function getTagDb() {
    request.get(targetInfo.getApiHref() + '/audio').when(function (err, ahr, data) {
      if (err) {
        console.error(err);
        alert("error retreiving audio meta data");
        return;
      }

      if (data.error || !data.result) {
        console.error(data);
        alert("error retreiving audio meta data");
        return;
      }

      $('#loading').hide();
      $('#content').show();
      tags = data.result;
      tags.sort(randomize);
    });
  }

  function attachHandlers() {
    // TODO is it seriously not possible to delegate on media events?
    // Seriously?
    $('body').delegate('form#search-library', 'submit', handleSearch);
    $('body').delegate('form#search', 'submit', handleSearch);
    $('body').delegate('form#search', 'webkitspeechchange', handleSearch);
    $('body').delegate('.add .ui-action', 'click', onAddToPlaylist);
    $('body').delegate('.play .ui-action', 'click', onPlayNow);

    /*
    var tag = tags.pop()
      ;
    tags.unshift(tag);
    addToPlaylist(tag);
    player.enque(tag);
    */
  }

  getTagDb();
  $.domReady(attachHandlers);
  strategy.on('next', playNext);

  module.exports.getTags = function () {
    return tags;
  };
  module.exports.player = player;
}());
