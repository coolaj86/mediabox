(function () {
  "use strict";

  var MediaBox = require('../lib')
    , config = require('./config')
    , connect = require('connect')
    , mediabox
    , app
    ;

  if (!connect.router) {
    connect.router = require('connect_router');
  }

  function startServer(err) {
    var port = process.argv[2] || config.port || 1232
      , server
      ;

    if (err) {
      console.error(err);
    }
    console.info('Starting MediaBox services (non-webserver)...');

    if (require.main === module) {
      console.info('And now starting webserver...');
      server = app.listen(port, function () {
        console.log('on port', server.address().port);
      });
    }
    //app.listen(port, started);
    // TODO import old db log
  }

  mediabox = MediaBox.create(config);

  app = connect.createServer();
  app.use(connect.favicon(__dirname + '/public/favicon.ico'));
  app.use(connect.compress({ level: 9, memLevel: 9 }));
  app.use(connect.static(__dirname + '/public'));

  app.use('/api', mediabox);

  console.info('Initing mediabox (folders, databases, etc)');
  mediabox.init(startServer);

  module.exports = app;
}());
