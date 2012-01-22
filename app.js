(function () {
  var config = require('./config')
    , MediaBox = require('./lib')
    , mediabox
    , scanpath = process.argv[2]
    ;

  function importPath() {
    // accepts file or directory
    //path.normalize(process.argv[2] + '/')
    /*
    mediabox.import(function () {
      console.log('done');
    }, scanpath);
    */
    console.log('big copy');
    console.log(mediabox.caches.audio.all().length);
    console.log('end big copy');
  }

  mediabox = MediaBox.create(config);

  mediabox.init(importPath);
}());
