(function () {
  "use strict";

  var EventEmitter = require('events').EventEmitter
    , emitter = new EventEmitter()
    , Sync
    , syncing = false
    ;

  // It's important that no callback is ever called to delete data
  // if there is even the slightest chance that it isn't actually
  // flushed to disk. Pulling the power plug out of a MediaBox should
  // be just as safe as shutting it down properly.
  //
  // http://unixhelp.ed.ac.uk/CGI/man-cgi?sync+8
  //
  // 1. No module will request a sync until the `write` call has finished
  // 2. a `write` callback means node's memory is flushed to the fs cache
  // 3. The fs cache is written on sync.
  // 4. However, the underlying block device also has a cache
  //
  // So:
  // 1. we can continue writing new data immediately after `sync`
  // 2. we should not delete any data for an additional 10 seconds
  function sync(cb) {
    if (cb) {
      Sync.once(cb);
    }

    if (syncing) {
      return;
    }

    syncing = true;
    exec('sync', function (err, stdout, stderr) {
      syncing = false;

      if (err) {
        console.error('[ERROR] How the heck can `sync` fail?', err.message);
        console.error(err.stack);
        return;
      }

      if (stderr) {
        err = new Error(stderr);
        console.error('[ERROR] How the heck can `sync` have errors?', stderr);
        return;
      }

      emitter.emit('sync', err || stderr);
    });
  }

  Sync = module.exports = sync;
  Sync.sync = Sync;

  // Public Emitter Properties
  // using the FuturesJS api
  Sync.whenever = function (cb) {
    emitter.on('sync', cb);
  };
  Sync.addListener = Sync.on;
  Sync.removeListener = function (cb) {
    emitter.removeListener('sync', cb);
  };
  Sync.when = function (cb) {
    emitter.once('sync');
  };

}());
