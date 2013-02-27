/*jshint strict:true node:true es5:true jquery:true browser:true
indent:2 onevar:true laxcomma:true laxbreak:true
eqeqeq:true immed:true latedef:true*/
(function () {
  "use strict";

  var asciify = require('./asciify')
    , request = require('ahr2')
    , targetInfo = require('./target-info')
    , tags
    , playerSel = '.mb-player'
    , strategy = require('./player-engine').create()
    , Player = require('./player')
    , player = Player.create(playerSel, strategy)
    // TODO previewer
    , playHistorySel = '.mb-playlist-history'
    , localStorage = require('localStorage')
    , store = require('json-storage')(localStorage)
    , historyStore = require('json-storage')(localStorage, 'h')
    , PlayQueue = require('./play-queue').PlayQueue
    , playQueue
    , MB_TITLES = 0
    , MB_PATHS = 1
    , searchable
    , playQueueSel = '.mb-playlist'
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


  MB_TITLES = 0;
  MB_PATHS = 1;

  searchable = [
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
        , track
        , title
        ;

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
        track = item.track && item.track.toString().match(/\s*(\d+).*/)[1];
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
        md5sum.substr(0, 3),
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
      , ITEM = 2
      , query = $('#search-library').val()
      , pattern = new RegExp(query, 'i')
      , results = search(pattern)
      , html = []
      , resultItemRows = []
      ;

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

    results.forEach(function (item) {
      var md5sum = item[MD5SUM]
        , tag = item[ITEM]
        , resource = targetInfo.getApiHref() + pathFromMd5sum(md5sum) + extname(item[TITLE])
        , whattoshow
        ;

      console.log("The droids you're looking for");
      console.log(item);

      whattoshow = (item[ITEM].track || '').substr(0, 2) + ' - ' + (item[ITEM].title || '') + ' - ' + (item[ITEM].artist || '');

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
    // BUG only a limited number of audio tags (across all pages) can be buffering / playing
    tag.audio = $('<audio src="' + resource + '" preload="metadata"></audio>')[0];
    // TODO use PURE template
    tag.el = $(
      "<tr data-md5sum='" + md5sum + "' class='has-md5sum playlistitem'>" +
        "<td class='add'>" +
          "<button class='ui-action'>+</button>   " +
        "</td>" +
        "<td class='play'>" +
          "<button class='ui-action'>|></button>   " +
        "</td>" +
        "<td class='promote'>" +
          "<button class='ui-action'>&uarr;</button>   " +
        "</td>" +
        "<td class='demote'>" +
          "<button class='ui-action'>&darr;</button>   " +
        "</td>" +
        "<td class='title'>" + tag.title + "</td>" +
        "<td class='artist'>" + tag.artist + "</td>" +
        "<td class='album'>" + tag.album + "</td>" +
        "<td class='remove'>" +
          "<button class='ui-action'>X</button>   " +
        "</td>" +
      "</tr>"
    );
  }

  function playNext(enque) {
    // preserve this-ness
    console.log('next was called from player-engine');
    playQueue.enque(enque);
  }

  function onPlayNow(ev) {
    ev.preventDefault();

    var el = $(ev.target).closest('.has-md5sum')
      , md5sum = el[0].dataset.md5sum
      ;

    console.log("not doing anything about it for now...");
  }

  function onPromoteInPlaylist(ev) {
    ev.preventDefault();

    var el = $(ev.target).closest('.has-md5sum')
      , md5sum = el[0].dataset.md5sum
      ;

    el.previous().after(el);
  }

  function onDemoteInPlaylist(ev) {
    ev.preventDefault();

    var el = $(ev.target).closest('.has-md5sum')
      , md5sum = el[0].dataset.md5sum
      ;

    el.after(el.previous());
  }

  function onRemoveFromPlaylist(ev) {
    ev.preventDefault();

    var el = $(ev.target).closest('.has-md5sum')
      , md5sum = el[0].dataset.md5sum
      ;

    el.remove();
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
        playQueue.add(tag);
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
        window.alert("error retreiving audio meta data");
        return;
      }

      if (data.error || !data.result) {
        console.error(data);
        window.alert("error retreiving audio meta data");
        return;
      }

      $('#loading').hide();
      $('#content').show();
      tags = data.result;
      tags.sort(randomize);
      PlayQueue.init(tags, createDomForTag);
      playQueue = new PlayQueue();
      playQueue.on('update', function () {
        // TODO only update current list
        // TODO this._list
        $(playQueueSel).find('.has-md5sum').remove();
        this._list.forEach(function (item, i) {
          if (!item.el) {
            // adds el, audio, and md5sum
            createDomForTag(item);
          }
          console.log(item);
          $(playQueueSel).append(item.el);
        });
      });
    });
  }

  function attachHandlers() {
    // TODO is it seriously not possible to delegate on media events?
    // Seriously?
    $('body').delegate('form#search-library', 'submit', handleSearch);
    $('body').delegate('form#search', 'submit', handleSearch);
    $('body').delegate('form#search', 'webkitspeechchange', handleSearch);
    $('body').delegate('.promote .ui-action', 'click', onPromoteInPlaylist);
    $('body').delegate('.demote .ui-action', 'click', onDemoteInPlaylist);
    $('body').delegate('.remove .ui-action', 'click', onRemoveFromPlaylist);
    $('body').delegate('.add .ui-action', 'click', onAddToPlaylist);
    $('body').delegate('.play .ui-action', 'click', onPlayNow);
  }

  module.exports.create = function () {
    module.exports.init();
  };
  module.exports.init = function () {
    getTagDb();
    $.domReady(attachHandlers);
    strategy.on('next', playNext);
  };
  module.exports.getTags = function () {
    return tags;
  };
  module.exports.player = player;
}());
