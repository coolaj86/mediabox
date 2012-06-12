/*jshint onevar:true strict:true node:true es5:true laxcomma:true laxbreak:true*/
(function () {
  "use strict";

  var fs = require('fs')
    , uuid = require('node-uuid')
    , crypto = require('crypto')
    , path = require('path')
    , mime = require('mime')
    ;

  function getContent(name) {
    // audio, image, video, text
    return mime.lookup(name).split('/')[0];
  }

  /*
   *
   * @param filesroot
   * @param tmproot
   */
  function Copier(options) {
    var me = this
      , filesroot = options.filesroot
      , tmproot = options.tmproot
      ;

    if (true !== this instanceof Copier) {
      return new Copier(options);
    }

    me._filesroot = options.filesroot;
    me._tmproot = options.tmproot;
  }

  // betterFileStats is used only to determine the extension
  // me._fileStats.storepath is created
  // me._fileStats.md5sum may be appended
  Copier.prototype.copy = function (finishedCopyCallback, fullpath, fileStats, betterFileStats) {
    var me = this
      ;

    me._readStream = undefined;
    me._writeStream = undefined;
    me._checksum = undefined;
    me._tmppath = undefined;
    me._storePathPlusExt = undefined;
    me._storePathPlusContent = undefined;

    // new stuff
    me._cb = finishedCopyCallback;
    me._fullpath = fullpath;
    me._fileStats = fileStats;
    me._betterFileStats = betterFileStats;

    me._fileStats.uuid = me._fileStats.uuid || uuid.v1();
    me._tmppath = me._tmproot + '/' + me._fileStats.uuid;
    fs.link(me._fullpath, me._tmppath, me._copyIfLinkingFailed.bind(me));
  };

  Copier.prototype._getHashPath = function () {
    var me = this
      , md5Prefix = me._fileStats.md5sum.substr(0, 3)
      , contentTypeBase = mime.lookup(String(me._fileStats.ext||'')).split('/')[0]
      ;

    me._storePathPlusContent = undefined;
    me._storePathPlusExt = me._filesroot + '/all/' + md5Prefix + '/' + me._fileStats.md5sum;
    me._fileStats.storepath = me._storePathPlusExt;

    // TODO use path.extname
    if (-1 !== me._betterFileStats.name.indexOf('.')) {
      me._fileStats.ext = me._betterFileStats.name.substr(me._betterFileStats.name.lastIndexOf('.'));
      me._storePathPlusExt += (me._fileStats.ext||'');
    }

    // excludes application, model, message, and multipart
    if (-1 !== ['audio','image','text','video'].indexOf(contentTypeBase)) {
      me._storePathPlusContent = me._filesroot + '/' + contentTypeBase + '/' + md5Prefix + '/'
        + me._fileStats.md5sum + (me._fileStats.ext||'');
    }
  };

  Copier.prototype._addChunkToHash = function (chunk) {
    var me = this
      ;

    me._hash.update(chunk);
  };

  Copier.prototype._preHash = function () {
    var me = this
      ;

    me._hashStream = fs.createReadStream(me._fullpath);
    me._hashStream.on('data', me._addChunkToHash.bind(me));
    me._hashStream.on('end', me._digestHash.bind(me));
  };

  Copier.prototype._unlinkTmp = function (e) {
    var me = this
      ;

    if (e) {
      console.error('[ERROR] link failed', e.message);
      console.error(e.stack);
      return;
    }

    fs.unlink(me._tmppath);
    me._finishedCopyCallback(null, me._fileStats);
  };

  // NOTE: for the general case (a non-duplicate file) it's faster
  // to write and checksum at the same time. For duplicate files this
  // could waste many gigabytes of writes and hours of time
  // TODO have a first-run switch?
  // TODO quicksum first for files >= 10mb?
  Copier.prototype._copyIfLinkingFailed = function (errorLinking) {
    // An error meanins that the file is not on the same filesystem
    var me = this
      , hashStream
      , firstRun = true
      ;

    me._hashStream = undefined;
    me._hash = crypto.createHash('md5');
    me._errorLinking = errorLinking;

    if (firstRun) {
      me._preHash();
    } else {
      me._writeIfNotExists();
    }
  };

  Copier.prototype._digestHash = function () {
    var me = this
      ;

    me._fileStats.md5sum = me._hash.digest('hex');

    me._getHashPath();

    if (!me._fileStats.md5sum) {
      me._writeIfNotExists();
      return;
    }

    // XXX BUG TODO
    // what if there is a power failure in the middle
    // of a large write?
    fs.lstat(me._fileStats.storepath, me._writeFileOrSymlink.bind(me));
  };

  Copier.prototype._writeFileOrSymlink = function (err, stat) {
    var me = this
      ;
    // if the checksums are the same but the sizes
    // mismatch, then perhaps there was a power failure
    // TODO check the full md5sum again to be sure?
    if (err || me._fileStats.size !== stat.size) {
      me._writeIfNotExists();
      return;
    }
    
    me._writeExtensionSymlinkIfNotExists();
  };

  Copier.prototype._digestAndMove = function () {
    var me = this
      ;

    if (!me._fileStats.md5sum) {
      me._fileStats.md5sum = me._hash.digest('hex');
    }

    // meaning that the file is not on the same filesystem
    if (me._writeStream) {
      me._writeStream.on('close', me._move.bind(me));
    } else {
      me._move();
    }
};

  Copier.prototype._writeIfNotExists = function () {
    var me = this
      ;

    me._readStream = fs.createReadStream(me._fullpath);

    me._getHashPath();

    // we don't use fs.copy because we can hash while copying
    // if we're using the stream
    if (me._errorLinking) {
      // TODO use me._storePathPlusExt if me._fileStats.md5sum
      // TODO listen to error events on writes
      me._writeStream = me._readStream.pipe(fs.createWriteStream(me._tmppath));
    }

    if (!me._fileStats.md5sum) {
      me._readStream.on('data', me._addChunkToHash.bind(me));
    }

    me._readStream.on('end', me._digestAndMove.bind(me));
  };

  Copier.prototype._writeExtensionSymlink = function (err) {
    var me = this
      ;

    if (err) {
      console.error('[ERROR] cannot create link ' + me._tmppath + ' -> ' + me._fileStats.storepath);
      console.error(err.message);
      console.error(err.stack);

      // TODO check return value?
      fs.unlink(me._tmppath);
      me._finishedCopyCallback(err, me._fileStats);
      return;
    }

    if (me._storePathPlusExt === me._fileStats.storepath) {
      // TODO check return value?
      fs.unlink(me._tmppath);
      me._finishedCopyCallback(null, me._fileStats);
      return;
    }

    me._writeExtensionSymlinkIfNotExists();
  };
  
  Copier.prototype._move = function () {
    var me = this
      ;

    fs.rename(me._tmppath, me._fileStats.storepath, me._writeExtensionSymlink.bind(me));
  };


  // preserve extensions as soft links (rsync-safe)
  Copier.prototype._createExtensionSymlink = function (exists) {
    var me = this
      ;

    if (me._storePathPlusContent) {
      fs.symlink(me._fileStats.md5sum, me._storePathPlusContent);
    }

    // this extension already exists
    if (exists) {
      me._unlinkTmp(null);
      return;
    }

    // this extension doesn't exist yet. give relative path in same directory
    fs.symlink(me._fileStats.md5sum, me._storePathPlusExt, me._unlinkTmp.bind(me));
  };

  Copier.prototype._writeExtensionSymlinkIfNotExists = function () {
    var me = this
      ;

    path.exists(me._storePathPlusExt, me._createExtensionSymlink.bind(me));
  };

  Copier.create = function (a, b, c) {
    return new Copier(a, b, c);
  };

  module.exports = Copier;
}());
