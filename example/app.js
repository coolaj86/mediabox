(function () {
  var config = require('./config')
    , MediaBox = require('../lib')
    , mediabox
    , scanpath = process.argv[2]
    ;

  function importPath(err) {
    // accepts file or directory
    //path.normalize(process.argv[2] + '/')
    ///*
    mediabox.import(function (err) {
      if (err) {
        console.error(err.stack);
      }
      console.log('done');
    }, scanpath);
    //mediabox.importOne();
    //*/
    /*
    console.log('big copy');
    console.log(mediabox.caches.audio.all().length);
    console.log('end big copy');
    */
  }

  if (!scanpath) {
    console.error('no scanpath provided');
  }

  mediabox = MediaBox.create(config);

  mediabox.init(importPath);
}());
