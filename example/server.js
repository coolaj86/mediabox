/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true eqeqeq:true immed:true latedef:true*/
(function () {
  "use strict";

  var MediaBox = require('../lib')
    , config = require('./config')
    , connect = require('connect')
    , mediabox
    , server
    ;

  if (!connect.router) {
    connect.router = require('connect_router');
  }

  function startServer(port, onListening) {
    console.info('Starting server...');
    server._oldListen(port, onListening);
    // TODO import old db log
  }

  mediabox = MediaBox.create(config);

  server = connect.createServer();
  server.use(connect.favicon(__dirname + '/public/favicon.ico'));
  server.use(connect.compress({ level: 9, memLevel: 9 }));
  server.use(connect.static(__dirname + '/public'));

  server.use('/api', mediabox);

  server._oldListen = server.listen;
  server.listen = function (port, onStart) {
    console.info('Initing mediabox (folders, databases, etc)');
    mediabox.init(startServer.bind(null, port, onStart));
  };

  module.exports = server;

  function run () {
    var port = process.argv[2] || config.port || 1232
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
