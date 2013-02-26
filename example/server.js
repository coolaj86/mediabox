/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true eqeqeq:true immed:true latedef:true*/
(function () {
  "use strict";

  var MediaBox = require('../lib')
    , config = require('./config')
    , connect = require('connect')
    , mediabox
    , server
    , port = process.argv[2] || config.port || 1232
    ;

  if (!connect.router) {
    connect.router = require('connect_router');
  }

  function started() {
    console.info('listening on port ' + port);
  }

  function startServer() {
    console.info('Starting server...');
    server.listen(port, started);
    // TODO import old db log
  }

  mediabox = MediaBox.create(config);

  server = connect.createServer(
      connect.favicon(__dirname + '/public/favicon.ico')
    , connect.compress({ level: 9, memLevel: 9 })
    , connect.static(__dirname + '/public')
  );

  server.use('/api', mediabox);

  console.info('Initing mediabox (folders, databases, etc)');
  mediabox.init(startServer);
}());
