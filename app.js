(function () {
  var config = require('./config')
    , MediaBox = require('./lib')
    , mediabox = MediaBox.create(config)
    , scanpath = process.argv[2]
    ;

  function importPath() {
    // accepts file or directory
    //path.normalize(process.argv[2] + '/')
    mediabox.import(scanpath);
  }

  mediabox.init(importPath, config);
}());
