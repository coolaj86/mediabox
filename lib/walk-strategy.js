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
    // could be arguments
    var realroot
      , relroot
      // TODO test if read-only filesystem
      , callback
      //, removeLast
      ;

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

        importer = createImporter(options, realroot, stat.dev); 

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
          callback();
        })
      }, 'symbolicLink');
    }

    function init(_callback, _relroot) {
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
    }

    return init;
  }

  module.exports.create = create;
}());
