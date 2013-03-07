/*jshint node:true es5:true browser:true jquery:true
onevar:true indent:2 laxcomma:true laxbreak:true
eqeqeq:true immed:true undef:true unused:true latedef:true */
(function () {
  "use strict";

  var server = require('./example/server');

  module.exports = server;

  function run() {
    var port = process.argv[2] || 1232
      ;

    function started() {
      console.info('listening on port ' + port);
    }
    server.listen(port, started);
  }

  if (require.main === module) {
    run();
  }
 
}());
