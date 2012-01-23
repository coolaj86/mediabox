(function () {
  "use strict";

  var connect = require('steve')
    , connectGzip = require('connect-gzip')
    , config = require('./config')
    , server
    ;

  server = connect.createServer(
      connect.favicon(__dirname + '/public/favicon.ico')
    , connectGzip.gzip()
  );

  server.listen(config.port || 1232, function () {
    console.log('Now listening');
  });
}());
