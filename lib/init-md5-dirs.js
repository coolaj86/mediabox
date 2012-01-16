(function () {
  "use strict";

  var forEachAsync = require('forEachAsync')
    ;

  function create(tmproot, prefixes) {

    // TODO occasionally clear out /tmp?
    function populateDbRoot(cb) {
      var exec = require('child_process').exec
        , hexchars = "0123456789abcef"
        , i
        , j
        , k
        , len = hexchars.length
        , cmds = []
        ;

      cmds.push('rm -f "' + tmproot + '/*"');
      cmds.push('mkdir -p \'' + tmproot + '\'');

      prefixes.forEach(function (prefix) {
        var paths = []
          ;

        for (i = 0; i < len; i += 1) {
          for (j = 0; j < len; j += 1) {
            for (k = 0; k < len; k += 1) {
              paths.push(prefix + '/' + hexchars[i] + hexchars[j] + hexchars[k]);
            }
          }
        }

        cmds.push("mkdir -p '" + paths.join("' '") + "'");
      });

      forEachAsync(cmds, function (next, cmd) {
        // TODO use fs.mkdir, etc
        exec(cmd, function (err, stdout, stderr) {
          if (err) {
            console.error(err.message);
            console.error(err.stack)
            return;
          }

          if (stdout) {
            console.log(stdout);
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
