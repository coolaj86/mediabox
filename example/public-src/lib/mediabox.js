var tags
(function () {
  "use strict";

  var asciify = require('./asciify')
    ;

      function basename(path, ext) {
        var b = path.lastIndexOf('/') + 1
          , e = path.lastIndexOf(ext || '.');

        return path.substr(b, e - b);
      }

      function dirname(path) {
        var b = path.lastIndexOf('/');
        return path.substr(0, b);
      }


      function getTagDb() {
        var xhr, json;

        xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function () { 
          if (4 !== xhr.readyState) {
            return;
          }
          console.log('saved global.tags');
          json = xhr.responseText;
          tags = JSON.parse(json).result;
          $('#loading').hide();
          $('#content').show();
        };

        xhr.open('get', '/api/audio', true);

        xhr.send();
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

          if (item.title && item.title.match(/\w+/)) {
            var track = item.track && item.track.match(/\s*(\d+).*/)[1];
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

          results.push([item.fileMd5sum, title, item]);
        }

        tags.forEach(find);

        return results;
      }

      getTagDb();


  $.domReady(function () {

    var g_results;
    function pathFromMd5sum(md5sum) {
      var md5split = [  
          '/api/files',
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

      g_results = results;

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
          , resource = pathFromMd5sum(md5sum) + extname(item[TITLE]);

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
          "<tr class='result'>" + 
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



// playlist events
    function isPlaying() {
      if ($('.playlistitem audio').length < 1) {
        return false;
      }
      if (!$('.playlistitem audio')[0].ended && !$('.playlistitem audio')[0].paused) {
        return true;
      }
      return false;
    }
    // TODO (audioEl.paused && audioEl.ended) isPlaying

    function onSongEnded(ev) {
      console.log('mediaEvent', ev);
      $($('.playlistitem')[0]).remove();
      // TODO nextTick
      playNext();
    }

// TODO create search results from global.tags
// TODO select random song from global.tags when playlist is empty
// TODO shuffle by default
// TODO add next just seconds before the first ends
    function playNext() {
      if (isPlaying()) {
        return;
      }
      if (!$('audio') || !$('audio')[0]) {
        console.log('no playlistitems, searching in results');
        // TODO get a better autoshuffle
        if ($('#search-results .result') && $('#search-results .result').length > 0) {
          var next = Math.floor(Math.random() * $('#search-results .result').length);
          console.log('auto selecting from list at random', $($('#search-results .result .add .ui-action')[next]));
          // prevent infinite recursion
          setTimeout(function () {
            $($('#search-results .result .add .ui-action')[next]).click();
            $($('#search-results .result')[next]).remove();
          }, 10);
        }
        return;
      }
      $('audio')[0].play();
      $('audio')[0].addEventListener('ended', onSongEnded, false);
      $('audio')[0].addEventListener('error', onSongEnded, false);
    }

    function onPlayNext(ev) {
      ev.preventDefault();
      if ($('.playlistitem') && $('.playlistitem').length > 0) {
        $($('.playlistitem')[0]).remove();
        console.log('has playlistitems, removing the current one');
      }
      // TODO
      //if (isEnded()) {
        playNext();
      //}
    }

    function onPlayNow(ev) {
      ev.preventDefault();
      var resource = $(ev.target).attr('href');
      if (!$('audio') || !$('audio')[0]) {
        return onAddToPlaylist(ev);
      }
      //$('audio')[0].pause();
      $($('.playlistitem')[0]).remove();
      $("#playlist").prepend("" +
        // if preload=none, can't auto-play
        "<div class='playlistitem'>" +
          "<audio preload='metadata' controls><source src='" + resource + "' /></audio> " + 
        "</div>"
      );
      $('audio')[0].addEventListener('ended', onSongEnded, false);
      $('audio')[0].addEventListener('error', onSongEnded, false);
      $('audio')[0].play();
    }

    function onAddToPlaylist(ev) {
      ev.preventDefault();
      console.log(ev.target);
      console.log(ev.target.href);
      var resource = $(ev.target).attr('href');
      console.log('href', resource);
      $("#playlist").append("" +
        // if preload=none, can't auto-play
      "<div class='playlistitem'>" +
        "<audio preload='metadata' controls><source src='" + resource + "' /></audio> " + 
      "</div>");
      playNext();
    }

    $('body').delegate('form#search-library', 'submit', handleSearch);
    $('body').delegate('form#search', 'submit', handleSearch);
    $('body').delegate('form#search', 'webkitspeechchange', handleSearch);
    $('body').delegate('.add .ui-action', 'click', onAddToPlaylist);
    $('body').delegate('.play .ui-action', 'click', onPlayNow);
    $('body').delegate('a.skiptonext', 'click', onPlayNext);
  });
}());
