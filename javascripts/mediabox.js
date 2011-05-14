var tags
(function () {
  "use strict";
      function basename(path, ext) {
        var b = path.lastIndexOf('/') + 1
          , e = path.lastIndexOf(ext || '.');

        return path.substr(b, e - b);
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
          tags = JSON.parse(json);
          $('#loading').hide();
          $('#content').show();
        };

        xhr.open('get', '/normalized-tags.json', true);

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
          var hasMatch = false
            , pathname = item.pathTags.join('/')
            , title;

          if (pathname.match(pattern)) {
            hasMatch = true;
          }

          searchable.forEach(function (key) {
            if (item[key] && item[key].match(pattern)) {
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
          '/db',
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

      var query = $('#query').val()
        , pattern = new RegExp(query, 'i')
        , results = search(pattern)
        , html = [];

      g_results = results;

      console.log(query);
      $('#results').html('');

      results.sort(function (a, b) {
        var atag = a[ITEM]
          , aartist = atag.artist || ''
          , aalbum = atag.album || ''
          , atitle = atag.title || ''
          , btag = b[ITEM]
          , bartist = btag.artist || ''
          , balbum = btag.album || ''
          , btitle = btag.title || '';

        if (aartist > bartist)
        if (basename(a[TITLE]) > basename(b[TITLE])) {
          return 1;
        }
        if (basename(a[TITLE]) < basename(b[TITLE])) {
          return -1;
        }
        return 0;
      });

      results.forEach(function (item) {
        var md5sum = item[MD5SUM]
          , resource = pathFromMd5sum(md5sum) + extname(item[TITLE]);

        var whattoshow = (item[ITEM].track || '').substr(0,2) + ' - ' + (item[ITEM].title || '') + ' - ' + (item[ITEM].artist || '');

        if (whattoshow.length < 8) {
          whattoshow = basename(item[TITLE]);
        }

        html.push("" + 
          "<div class='resultitem' >" +
            "<a class='addaudioitem' href='" + resource + "'>[+]</a>   " + 
            "<a class='playaudioitem' href='" + resource + "'>[play now]</a>   " + 
            whattoshow +
            ' [' + extname(item[TITLE]).substr(1) + '] ' +
            "<a class='encache' href='" + resource + "'>[Cache Locally]</a>   " + 
          "</div>"
        );
      });

      $('#results').html(html.join('\n'));
    }



// playlist events
    var playing = false;

    function onSongEnded(ev) {
      console.log('mediaEvent', ev);
      $($('.playlistitem')[0]).remove();
      playing = false;
      // TODO nextTick
      playNext();
    }

// TODO create search results from global.tags
// TODO select random song from global.tags when playlist is empty
// TODO shuffle by default
// TODO add next just seconds before the first ends
    function playNext() {
      if (playing) {
        return;
      }
      if (!$('audio') || !$('audio')[0]) {
        // TODO get a better autoshuffle
        //return $($('a.addaudioitem')[next]).click();
        if ($('.resultitem') && $('.resultitem').length > 0) {
          var next = Math.floor(Math.random() * $('.resultitem').length);
          console.log('auto selecting from list at random', $($('a.addaudioitem')[next]));
          setTimeout(function () {
            $($('.resultitem a.addaudioitem')[next]).click();
            $($('.resultitem')[next]).remove();
          }, 10);
        }
        return;
      }
      $('audio')[0].play();
      $('audio')[0].addEventListener('ended', onSongEnded, false);
      $('audio')[0].addEventListener('error', onSongEnded, false);
      playing = true;
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

    $('body').delegate('form#search', 'submit', handleSearch);
    $('body').delegate('form#search', 'webkitspeechchange', handleSearch);
    $('body').delegate('a.addaudioitem', 'click', onAddToPlaylist);
    $('body').delegate('a.playaudioitem', 'click', onPlayNow);
  });
}());
