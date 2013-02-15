/*jshint strict:true node:true es5:true
onevar:true laxcomma:true laxbreak:true eqeqeq:true immed:true latedef:true*/
(function () {
  "use strict";

  var path = require('path')
    , config = require('./config')
    , MediaBox = require('../lib')
    , mediabox
    , scanpath = path.resolve(process.cwd(), process.argv[2])
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
      console.log('syncing (and deleting)...');
      // 
      setTimeout(function () {
        process.exit();
      }, 11 * 1000);
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
