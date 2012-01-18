(function () {
  var config = require('./config')
    , MediaBox = require('./lib')
    , mediabox
    , scanpath = process.argv[2]
    ;

  function importPath() {
    // accepts file or directory
    //path.normalize(process.argv[2] + '/')
    mediabox.import(function () {
      console.log('done');
    }, scanpath);
  }

  mediabox = MediaBox.create(config);

  mediabox.init(importPath);
}());
