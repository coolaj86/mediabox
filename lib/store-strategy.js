/*jshint node:true es5:true laxcomma:true laxbreak:true*/
/*
 * README
 *
 * This is to store a file in the "db".
 *
 * It checks that the file still exists, by a given path,
 * grabs file stats about it, and then moves the file to
 * the "db" filesystem.
 *
 * It calls Copy to actually move or copy the file
 *
 * It calls Meta and Tag to get file metadata and
 * content metadata, which are stored by the same
 */
(function () {
  "use strict";

  /*
    Cases that need testing:
    
    a new file is added // most common
    a symlink to a new file is added
    a symlink to an existing file is added
    an existing (md5 match) file is added
  */

  var fs = require('fs')
    , path = require('path')
    , Copy = require('./copy-strategy')
    , Meta = require('./meta-strategy')
    , Tag = require('./tag-strategy')
    ;

  /*
   * Copy
   * @param filesroot
   * @param tmproot
   * Meta
   * @param metaroot
   * Tag
   * @param audioroot
   * @param caches
   */
  function Storer(options) {
    if (true !== this instanceof Storer) {
      return new Storer(options);
    }

    var me = this
      , copier = Copy.create(options)
      , metaStore = Meta.create(options)
      , tagStore = Tag.create(options)
      ;

    me._copier = copier;
    me._metaStore = metaStore;
    me._tagStore = tagStore;
  }

  // TODO move givenpath to me._fileStats.xyz
  Storer.prototype.put = function (cb, givenpath, fileStats, betterFileStats) {
    var me = this
      ;

    me._cb = cb;
    me._givenpath = givenpath;
    me._fileStats = fileStats;
    me._betterFileStats = betterFileStats;

    if (!me._fileStats) {
      fs.lstat(me._givenpath, me._getStats.bind(me));
    }

    // TODO emitter
    me._copier.copy(function () {
      console.log('copy complete');
      //me._saveMeta.bind(me);
      me._saveMeta.apply(me, arguments);
    }, me._givenpath, me._fileStats, me._betterFileStats);
  };

  Storer.prototype._getStats = function (e, fileStats) {
    var me = this
      ;

    if (e) {
      console.error('[getStat ERROR] cannot stat ' + me._givenpath, e.message);
      console.error(e.stack);
      return;
    }
    
    // is this right?
    //fileStats.pathname = me._givenpath;
    me._fileStats = fileStats;
    me._fileStats.filepath = me._givenpath;
    me._fileStats.path = me._givenpath.substr(0, me._givenpath.lastIndexOf('/'));
    me._fileStats.name = me._givenpath.substr(me._givenpath.lastIndexOf('/') + 1);
    //copyAndChecksum();

    fs.realpath(path.resolve(process.cwd(), me._givenpath), function (err, realpath) {
      me._fileStats.realpath = realpath.substr(0, realpath.lastIndexOf('/'));
      me._fileStats.realname = realpath.substr(realpath.lastIndexOf('/') + 1);
      me._copier.copy(me._saveMeta.bind(me), me._givenpath, me._fileStats, me._betterFileStats);
    });
  };

  Storer.prototype._saveMeta = function (e, copiedStats) {
    var me = this
      ;

    if (e) {
      me._gotErDone(e, copiedStats);
    }

    // At this point we know for sure that we have the correct md5sum
    if (me._betterFileStats.md5sum && me._betterFileStats.md5sum !== copiedStats.md5sum) {
      console.log('very unexpected difference in md5sum');
    }
    me._betterFileStats.md5sum = copiedStats.md5sum;

    me._metaStore(function (e, _metapath) {
      if (e) {
        me._gotErDone(e, copiedStats);
        return;
      }

      me._tagStore(function (e) {
        me._gotErDone(e, copiedStats);
      }, copiedStats.storepath, me._betterFileStats.name, me._betterFileStats.md5sum);
    }, me._givenpath, me._betterFileStats);
  };

  Storer.prototype._gotErDone = function (e, stat) {
    var me = this
      ;

    if (e) {
      console.error('[gotErDone Error]');
      console.error(e);
      return;
    }
    console.log('finished for', '  ' + me._givenpath);
    me._cb();
  };


  Storer.create = function (options) {
    return new Storer(options);
  };

  module.exports = Storer;
}());
