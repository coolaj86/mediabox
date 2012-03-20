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
          walker.on(eventName || 'file', function (root, fstat, next) {
            console.log('File: ' + root + '/' + fstat.name);
            /*
            if ('.' === fstat.name[0]) {
              console.log('skipped dot file: ' + fstat.name);
              next();
              return;
            }
            */
            importer.copyHelper.apply(importer.copyHelper, arguments);
          });
          // TODO make configurable
          // skip dot directories
          walker.on('directories', function (root, dirs, next) {
            var newDirs = dirs.splice(0, dirs.length)
              ;

            newDirs.forEach(function (dstat) {
              console.log('Dir: ' + root + '/' + dstat.name);
              if (/MediaBox/i.exec(dstat.name)) {
                console.log('skipped MediaBox directory: ' + dstat.name);
                return;
              }
              /*
              if ('.' === dstat.name[0]) {
                console.log('skipped dot directory: ' + dstat.name);
                return;
              }
              */
              dirs.push(dstat);
            });

            next();
          });
          walker.on('end', function () {
            console.log('Copied ', (eventName || 'file') + 's');
            importer.syncAndEnd(next);
          });
        }

        console.info('Importing from:', realroot);
        moveNodes(function () {
          moveNodes(function () {
            if (!realRemove) {
              callback(null, "TODO use emitter to live-stream files as they import");
              return;
            }

            callback(null, "TODO delete empty directories after import");
          })
        }, 'symbolicLink');
      }

      if (!relroot) {
        callback(new Error("No import path given."));
        return;
      }

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
