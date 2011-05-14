(function () {
  "use strict";
      function basename(path, ext) {
        var b = path.lastIndexOf('/') + 1
          , e = path.lastIndexOf(ext || '.');

        return path.substr(b, e - b);
      }
}());
(function () {
      "use strict";

      var tags;

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
}());
(function () {
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
        , TITLE = 1; 

      var query = $('#query').val()
        , pattern = new RegExp(query, 'i')
        , results = search(pattern)
        , html = [];

      g_results = results;

      console.log(query);
      $('#results').html('');

      results.sort(function (a, b) {
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

        html.push("" + 
          "<a class='audioitem' href='" + resource + "'>Add to playlist</a>   " + 
          basename(item[TITLE]) + ' [' + extname(item[TITLE]).substr(1) + '] ' + 
          "<a class='encache' href='" + resource + "'>[Cache Locally]</a>   " + 
          "\n");
      });

      $('#results').html(html.join('\n'));
    }

    var playing = false;
    function playNext() {
      if (playing) {
        return;
      }
      $('audio')[0].play();
      $('audio')[0].addEventListener('ended', function (ev) {
        console.log('mediaEvent', ev);
        $($('audio')[0]).remove();
        playing = false;
        // TODO nextTick
        playNext();
      }, false);
      playing = true;
    }

    function handleAddToPlayList(ev) {
      ev.preventDefault();
      console.log(ev.target);
      console.log(ev.target.href);
      var resource = $(ev.target).attr('href');
      console.log('href', resource);
      $("#playlist").append("" +
        "<audio preload='none' controls><source src='" + resource + "' /></audio> " + 
      "\n<br/>");
      playNext();
    }

    $('body').delegate('form#search', 'submit', handleSearch);
    $('body').delegate('a.audioitem', 'click', handleAddToPlayList);
  });
}());
