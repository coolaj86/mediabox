(function () {
  "use strict";

  var MediaBox = require('../lib')
    , config = require('./config')
    , connect = require('steve')
    , connectGzip = require('connect-gzip')
    , mediabox
    , server
    , port = config.port || 1232
    ;

  function started() {
    console.info('listening on port ' + port);
  }

  function startServer(err) {
    console.info('Starting server...');
    server.listen(port, started);
    // TODO import old db log
  }

  mediabox = MediaBox.create(config);

  server = connect.createServer(
      connect.favicon(__dirname + '/public/favicon.ico')
    , connectGzip.gzip()
  );

  server.use('/api', mediabox);

  console.info('Initing mediabox (folders, databases, etc)');
  mediabox.init(startServer);
}());
