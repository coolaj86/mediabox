(function () {
  "use strict";

  var PlaylistItem = require('./playlist-item').PlaylistItem
    , localStorage = require('localStorage')
    , sessionStorage = require('sessionStorage')
    , JsonStorage = require('json-storage')
    , playQueueStore = JsonStorage.create(localStorage, 'pl')
    , playQueueSession = JsonStorage.create(sessionStorage, 'pls')
      // TODO decouple
    , createDomForTag
    , store = require('json-storage')(localStorage)
    , tags
    , EventEmitter = require('events').EventEmitter
    ;

  function PlayQueue(name, len) {
    var self = this;

    // to keep multiple tabs updated
    // TODO use storage event
    function checkForUpdates() {
      var updatedAt = playQueueSession.get('updatedAt')
        , len
        , i
        , curList
        ;

      // if we're the same age or newer (a save is in progress) return
      // Note: in a superhuman world where someone can switch tabs in 
      // less than 50ms and make changes, this may not be sufficient protection.
      // Consider socket.io
      if (updatedAt <= self._updatedAt) {
        return;
      }
      clearTimeout(self._storeTimeoutToken);

      self._updatedAt = updatedAt;
      curList = playQueueStore.get(self._name) || [];
      len = Math.max(curList.length, self._list.length);

      console.log('newer list exists in db:');
      console.log(curList, self._list);

      for (i = 0; i < len; i += 1) {
        if (curList[i] === self._list[i]) {
          continue;
        }

        // TODO reassoc elements and audio
        self._list[i] = PlaylistItem.create(curList[i]);
        //if (self.list[i]) {
        createDomForTag(self._list[i]);
        //} 
      }

      self.setQueueLength(self._queueMinLength);
      self.refresh();
    }

    if (!this || Object.keys(this).length) {
      return PlayQueue.create(name);
    }

    this._queueMinLength = 3;
    if ('number' === typeof len) {
      this._queueMinLength = len;
    }
    this._name = name || 'queue';
    this._list = [];
    this._intervalToken = setInterval(checkForUpdates, 1000);
    checkForUpdates();
  }
  PlayQueue.prototype = new EventEmitter();

  PlayQueue.create = function (name) {
    return new PlayQueue(name);
  };
  PlayQueue.prototype.save = function () {
    var self = this
      ;


    // Here I make sure that we conservatively write to the storage
    // by waiting a small amount of time between updates
    clearTimeout(this._storeTimeoutToken);
    this._storeTimeoutToken = setTimeout(function () {
      console.log(self._name, self._list);
      console.log('saving list:');
      console.log(self._list);
      playQueueStore.set(self._name, self._list);
      playQueueSession.set('updatedAt', self._updatedAt);
    }, 50);

    self._updatedAt = Date.now();

    if (!this._list.length) {
      return;
    }

    /*
    this._list.forEach(function (item) {
      item.audio.preload = 'metadata';
    });
    this._list[0].audio.preload = 'auto';
    */
  };
  PlayQueue.prototype.refresh = function () {
    var self = this
      ;

    clearTimeout(self._refreshTimeoutToken);
    self._refreshTimeoutToken = setTimeout(function () {
      self.emit('update', self._list);
    }, 50);
  };
  PlayQueue.prototype.add = function (tag) {
    // TODO check if is already in playlist
    tag = PlaylistItem.create(tag);
    /*
    if (!tag.audio && (tag.href || tag.src)) {
      tag.audio = new Audio();
      tag.audio.src = tag.href || tag.src;
    }
    */
    createDomForTag(tag);
    // adds el, audio, and md5sum
    //tag.audio.preload = 'metadata';
    this._list.push(tag);
    this.save();
    this.refresh();
  };
  PlayQueue.prototype.remove = function (index) {
    var item = this._list.splice(index || 0, 1)[0];
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
  PlayQueue.prototype.clear = function () {
    this._list = [];
    this.setQueueLength(0);
  };
  PlayQueue.prototype.randomize = function (len) {
    this.clear();
    this.setQueueLength(len);
  };
  PlayQueue.prototype.setQueueLength = function (len) {
    var tag
      , curLen = this._list.length
      ;

    function assignExtents(key) {
      tag[key] = tag.extent[key];
    }

    this._queueMinLength = len;

    console.log('queueLength:', this._list.length);
    while (this._list.length < this._queueMinLength) {
      // TODO decouple, replace with a random function
      tag = tags.pop();
      if (!tag) {
        console.warn('bad tag in array...');
        console.warn(tag);
        return;
      }

      // just play unrated songs for now
      tag.extent = store.get(tag.fileMd5sum);
      if (tag.extent) {
        Object.keys(tag.extent).forEach(assignExtents);
        if ('rating' in tag.extent) {
          console.warn('took already-rated song out of random');
          continue;
        }
        if ('category' in tag.extent && 'music' !== tag.extent.category) {
          console.warn('took not-music song out of random');
          continue;
        }
        if ('style' in tag.extent && '~special' === tag.extent.style) {
          console.warn('took specialty song out of random');
          continue;
        }
      }

      this.add(tag);
      // so that it remains searchable
      tags.unshift(tag);
    }

    if (curLen !== this._list.length) {
      this.save();
      this.refresh();
    }
  };
  PlayQueue.prototype.enque = function (enque) {
    var nowPlaying = this._nowPlaying
      ;


    if (nowPlaying) {

      console.log('nowPlaying:');
      console.log(nowPlaying);
      console.log(nowPlaying.fileMd5sum);
      nowPlaying.extent = store.get(nowPlaying.fileMd5sum) || { playCount: 0, plays: [] };
      // TODO check playranges
      nowPlaying.extent.playCount += 1;
      nowPlaying.extent.plays = nowPlaying.extent.plays || [];
      nowPlaying.extent.plays.push(Date.now());
      // TODO add location
      nowPlaying.extent.rating = nowPlaying.rating;
      nowPlaying.extent.category = nowPlaying.category;
      nowPlaying.extent.style = nowPlaying.style;
      console.log(nowPlaying.fileMd5sum, nowPlaying.extent);
      console.warn("tag saving turned off");
      //store.set(nowPlaying.fileMd5sum, nowPlaying.extent);

      // in case the memory from the file
      // doesn't get cleaned up automatically
      // TODO player-engine should make a copy of the object
      //delete nowPlaying.audio;
    }

    if (this._list[0] && this._list[0].enqued) {
      this._nowPlaying = this.remove(0);
    }

    this.setQueueLength(this._queueMinLength);

    this._list[0].enqued = true;
    enque(this._list[0]);
  };

  // TODO decouple
  PlayQueue.init = function (_t, _c) {
    tags = _t;
    createDomForTag = _c;
  };
  exports.PlayQueue = PlayQueue;
}());
