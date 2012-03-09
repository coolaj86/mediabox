(function () {
  "use strict";

  var PlaylistItem = require('./playlist-item').PlaylistItem
    , localStorage = require('localStorage')
    , sessionStorage = require('sessionStorage')
    , JsonStorage = require('json-storage')
    , playQueueStore = JsonStorage.create(localStorage, 'pl')
    , playQueueSession = JsonStorage(sessionStorage, 'pls')
      // TODO decouple
    , createDomForTag
    , queueMinimum = 3
    , playlistSel = '.mb-playlist'
    , store = require('json-storage')(localStorage)
    , tags
    , nowPlaying
    ;

  function PlayQueue(name) {
    var self = this;

    if (!this || Object.keys(this).length) {
      return new PlayQueue(name);
    }
    this._name = name || 'queue';
    this._list = playQueueStore.get(this._name) || [];
    this._list.forEach(function (item) {
      createDomForTag(item);
    });

    // to keep multiple tabs updated
    // TODO or use SharedWorker
    function checkForUpdates() {
      var curList = playQueueSession.get(self._name) || []
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
    playQueueStore.set(this._name, this._list);
    playQueueSession.set(this._name, this._list);

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

    if (this._list[0] && this._list[0].enqued) {
      nowPlaying = this.remove(0);
    }

    console.log('queueLength');
    console.log(this._list.length);
    while (this._list.length < queueMinimum) {
      // TODO decouple, replace with a random function
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

  // TODO decouple
  PlayQueue.init = function (_t, _c) {
    tags = _t;
    createDomForTag = _c;
  }
  module.exports.PlayQueue = PlayQueue;
}());
