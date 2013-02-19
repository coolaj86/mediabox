/*jshint strict:true node:true es5:true
indent:2 onevar:true laxcomma:true laxbreak:true
eqeqeq:true immed:true latedef:true undef:true unused:true */
(function () {
  "use strict";

  var localStorage = require('localStorage')
    , sessionStorage = require('sessionStorage')
    , JsonStorage = require('json-storage')
    , playHistoryStore = JsonStorage.create(localStorage, 'ph')
    , playHistorySession = JsonStorage.create(sessionStorage, 'phs')
    , maxLength = 200
    , minLength = 100
    ;

  function notNull(v) {
    if (null !== v && 'undefined' !== typeof v) {
      return true;
    }
  }

  // Let's say that every song lasts 3 minutes (low estimate)
  // and that you're listening to music 40 hours a week,
  // which is not quite 42,000 songs a year and exactly 2336000 bytes
  // roughly 2.23 MiB/year
  //
  // Each id is 32 bytes.
  // Each timestamp is 13 bytes.
  // Add an additional 3 bytes ':ph'
  // Add an additional 8 bytes for internal book-keeping
  // 
  function PlayHistory() {
    var self = this;

    if (!this || Object.keys(this).length) {
      return new PlayHistory();
    }

    this._list = playHistoryStore.get('recent') || [];
    this._updatedAt = Date.now();

    // to keep multiple tabs updated
    // TODO use storage event or SharedWorker
    function checkForUpdates() {
      var updatedAt = playHistorySession.get('updatedAt')
        ;

      if (updatedAt === this._updatedAt) {
        return;
      }

      this._list = playHistoryStore.get('recent') || [];
      this._updatedAt = updatedAt;
    }
    this._intervalToken = setInterval(checkForUpdates, 1000);
  }
  PlayHistory.prototype.save = function () {

    if (this._list.length > maxLength) {
      // TODO export off-browser
      old = this._list.splice(0, maxLength - minLength);
      old = (playHistoryStore.get('old') || []).concat(old);
      playHistoryStore.set('old', old);
    }

    playHistoryStore.set('recent', this._list);
    playHistorySession.set('updatedAt', Date.now());
  };
  PlayHistory.prototype.add = function (timestamp, id, skip, rating) {
    var old;

    this._list.push(Array.prototype.slice.call(arguments).filter(notNull));
    this.save();
  };

  exports.PlayHistory = PlayHistory;
}());
