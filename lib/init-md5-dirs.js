/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true eqeqeq:true immed:true latedef:true*/
(function () {
  "use strict";

  var forEachAsync = require('forEachAsync')
    , fs = require('fs')
    ;

  function create(tmproot, prefixes) {

    // TODO occasionally clear out /tmp?
    function populateDbRoot(cb) {
      var exec = require('child_process').exec
        , hexchars = "0123456789abcdef"
        , i
        , j
        , k
        , len = hexchars.length
        , cmds = []
        ;

      // tmproot only
      // TODO perhaps tmproot should be hard coded
      // and checked that it isn't a symlink?
      if (!tmproot || !(tmproot.length > 8)) {
        console.error('WOAH! no tmproot! aborting before everything catches on fire!');
        process.exit();
      }
      if (tmproot.length > 4) {
        cmds.push('rm -rf "' + tmproot + '/"');
        cmds.push('mkdir -p \'' + tmproot + '\'');
      }

      prefixes.forEach(function (prefix) {
        var paths = []
          ;

        // in theory this path is the last created and therefore
        // will only exist if all others before it exist
        // so even in the case of ctrl+c on first startup 
        // this test should be sufficient
        if (fs.existsSync(prefix + '/fff')) {
          return;
        }

        for (i = 0; i < len; i += 1) {
          for (j = 0; j < len; j += 1) {
            for (k = 0; k < len; k += 1) {
              paths.push(prefix + '/' + hexchars[i] + hexchars[j] + hexchars[k]);
            }
          }
          // it takes much longer to do 16 execs rather than 1,
          // but it means we can use absolute paths without hitting
          // the "exec arg too long"-type error, which is good
          cmds.push("mkdir -p '" + paths.join("' '") + "'");
          paths = [];
        }
      });

      forEachAsync(cmds, function (next, cmd) {
        // TODO use fs.mkdir, etc
        exec(cmd, function (err, stdout, stderr) {
          if (err) {
            console.error(err.message);
            console.error(err.stack);
            return;
          }

          if (stdout) {
            console.info(stdout);
          }

          if (stderr) {
            console.error('[populateDbRoot]', stderr);
            return;
          }

          next();
        });
      }).then(cb);
    }

    return populateDbRoot;
  }

  module.exports.create = create;
}());
