/*

  Goals:
    * Reversable
    * Non-destructive in the event of power-failure
    * motivates me to complete mediabox

 */
(function () {
  "use strict";

  var Walk = require('walk')
    , fs = require('fs')
    , path = require('path')
    , createImporter = require('./import-strategy').create
    ;

  function create(options) {

    function startWalkin(callback, relroot, realRemove) {
      var realroot
        // TODO test if read-only filesystem
        ;

      if ('undefined' === typeof realRemove) {
        realRemove = options.realRemove;
      }

      function getTargetDeviceId(e, stat) {
        console.log(realroot, stat);
        //return;

        if (e) {
          err.message = '[realroot Error] ' + err.message;
          callback(e);
          return;
        }
        
        function moveNodes(next, eventName) {
          var walker
            , importer
            ;

          /*
           * @param realRemove
           * Store 
           *  Copy
           * @param filesroot
           * @param tmproot
           *  Meta
           * @param metaroot
           *  Tag
           * @param audioroot
           * @param caches
           */
          importer = createImporter({
              "realRemove": realRemove
            , "filesroot": options.filesroot
            , "tmproot": options.tmproot
            , "metaroot": options.metaroot
            , "audioroot": options.audioroot
            , "caches": options.caches
          }, realroot, stat.dev); 

          walker = Walk.walk(realroot);
          walker.on(eventName || 'file', importer.copyHelper);
          walker.on('end', function () {
            console.log('Copied ', (eventName || 'file') + 's');
            importer.syncAndEnd(next);
          });
        }

        console.info('Importing from:', realroot);
        moveNodes(function () {
          moveNodes(function () {
            callback(null, "TODO use emitter to live-stream files as they import");
          })
        }, 'symbolicLink');
      }

      callback = _callback;

      if (!_relroot) {
        callback(new Error("No import path given."));
        return;
      }

      relroot = _relroot;
      if ('./' === relroot) {
        relroot = '';
      }

      // NOTE: passing undefined as the second argument would result
      // in scanning the cwd
      fs.realpath(path.resolve(process.cwd(), String(relroot)), function (e, _realroot) {
        if (e) {
          console.error('[realroot ERROR]', e.message);
          console.error(e.stack);
          return;
        }

        realroot = _realroot;
        fs.lstat(realroot, getTargetDeviceId);
      });

      // return emitter
    }

    return startWalkin;
  }

  module.exports.create = create;
}());
