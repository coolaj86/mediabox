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
    , Player = require('./player')
    , player = Player.create('.mb-player', strategy)
    // TODO previewer
    , nowPlaying
    , playlistSel = '.mb-playlist'
    , playHistorySel = '.mb-playlist-history'
    , queueMinimum = 3
    , localStorage = require('localStorage')
    , store = require('json-storage')(localStorage)
    , playlistStore = require('json-storage')(localStorage, 'pl')
    , playlistSession = require('json-storage')(sessionStorage, 'pls')
    , historyStore = require('json-storage')(localStorage, 'h')
    , playQueue = new PlayQueue();
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

    function PlaylistItem(tag) {
      Object.keys(tag).forEach(function (key) {
        this[key] = tag[key];
      }, this);
      this._el;
    }
    PlayQueue.prototype.toJSON = function () {
      var json = {}
        ;

      this.href = this.audio && this.audio.src;
      // TODO DOM id

      Object.keys(this).forEach(function (key) {
        json[key] = this[key];
      }, this);

      delete json.el;
      delete json.audio;
      return json;
    }

    function PlayQueue(name) {
      var self = this;

      if (!this || Object.keys(this).length) {
        return new PlayQueue(name);
      }
      this._name = name || 'queue';
      this._list = playlistStore.get(this._name) || [];
      this._list.forEach(function (item) {
        createDomForTag(item);
      });

      // to keep multiple tabs updated
      // TODO or use SharedWorker
      function checkForUpdates() {
        var curList = playlistSession.get(self._name) || []
          , i
          , len = Math.max(curList.length, self._list.length)
          ;

        for (i = 0; i < len; i += 1) {
          if (curList[i] === self._list[i]) {
            continue;
          }
          self._list = curList;
          self.save();
          self.refresh();
          break;
        }
      }
      //this._intervalToken = setInterval(checkForUpdates, 1000);
    }
    PlayQueue.create = function (name) {
      return new PlayQueue(name);
    };
    PlayQueue.prototype.save = function () {
      playlistStore.set(this._name, this._list);
      playlistSession.set(this._name, this._list);

      if (!this._list.length) {
        return;
      }

      this._list.forEach(function (item) {
        var audio = item.audio;
        audio.preload = 'metadata'
        audio.pause();
      });
      this._list[0].audio.preload = 'auto';
      /*
      this._list[0].audio.mute = true;
      this._list[0].audio.playbackRate = 1.5;
      this._list[0].audio.play();
      */
    };
    PlayQueue.prototype.refresh = function () {
      // TODO only update current list
      // TODO this._list
      $(playlistSel).find('.has-md5sum').remove();
      this._list.forEach(function (item, i) {
        if (!item.el) {
          // adds el, audio, and md5sum
          createDomForTag(item);
        }
        console.log(item);
        $(playlistSel).append(item.el);
      });
    };
    PlayQueue.prototype.add = function (tag) {
      // TODO check if is already in playlist
      tag = new PlaylistItem(tag);
      if (!tag.audio && (tag.href || tag.src)) {
        tag.audio = new Audio();
        tag.audio.src = tag.href || tag.src;
      }
      createDomForTag(tag);
      // adds el, audio, and md5sum
      tag.audio.preload = 'metadata';
      this._list.push(tag);
      this.save();
      this.refresh();
    };
    PlayQueue.prototype.remove = function (index) {
      var item = this._list.splice(index || 0, 1);
      this.save();
      this.refresh();
      return item;
    };
    PlayQueue.prototype.move = function (index, newIndex) {
      var item = this._list.splice(index, 1)
        ;

      this._list.splice(newIndex, 0, item);
      this.save();
      this.refresh();
    };
    PlayQueue.prototype.peek = function (index) {
      return this._list[index || 0];
    };
    PlayQueue.prototype.enque = function (enque) {
      var tag
        ;

      if (this._list[0] && this._list[0].enqued) {
        nowPlaying = this.remove(0);
      }

      console.log('queueLength');
      console.log(this._list.length);
      while (this._list.length < queueMinimum) {
        tag = tags.pop();

        // just play unrated songs for now
        tag.extent = store.get(tag.fileMd5sum);
        if (tag.extent) {
          Object.keys(tag.extent).forEach(function (key) {
            tag[key] = tag.extent[key];
          });
          if ('rating' in tag.extent) {
            console.log('took already-rated song out of random');
            continue;
          }
          if ('category' in tag.extent && 'music' !== tag.extent.category) {
            console.log('took not-music song out of random');
            continue;
          }
          if ('style' in tag.extent && '~special' === tag.extent.style) {
            console.log('took specialty song out of random');
            continue;
          }
        }

        this.add(tag);
        // so that it remains searchable
        tags.unshift(tag);
      }

      this._list[0].enqued = true;
      enque(this._list[0]);
    };

    function playNext(enque) {
      // preserve this-ness
      console.log('next was called from player-engine');
      playQueue.enque(enque)

      // the crossfade should finish before the next is loaded
      return;
      if (nowPlaying) {

        nowPlaying.extent = store.get(nowPlaying.fileMd5sum) || { playCount: 0, plays: [] };
        // TODO check playranges
        nowPlaying.extent.playCount += 1;
        nowPlaying.extent.plays = nowPlaying.extent.plays || [];
        nowPlaying.extent.plays.push(Date.now());
        // TODO add location
        nowPlaying.extent.rating = nowPlaying.rating;
        nowPlaying.extent.category = nowPlaying.category;
        nowPlaying.extent.style = nowPlaying.style;
        store.set(nowPlaying.fileMd5sum, nowPlaying.extent);

        // in case the memory from the file
        // doesn't get cleaned up automatically
        // TODO player-engine should make a copy of the object
        //delete nowPlaying.audio;
      }

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
    $('body').delegate('.promote .ui-action', 'click', onPromoteInPlaylist);
    $('body').delegate('.demote .ui-action', 'click', onDemoteInPlaylist);
    $('body').delegate('.remove .ui-action', 'click', onRemoveFromPlaylist);
    $('body').delegate('.add .ui-action', 'click', onAddToPlaylist);
    $('body').delegate('.play .ui-action', 'click', onPlayNow);
  }

  getTagDb();
  $.domReady(attachHandlers);
  strategy.on('next', playNext);

  module.exports.getTags = function () {
    return tags;
  };
  module.exports.player = player;
}());
