(function () {
  "use strict";

  console.log('Hello World!');


  var Updrop = require('./updrop')
    , MegaUpload = require('./file-upload-queue')
    , $ = require('ender')
    ;

  function randomString() {
    return Math.floor(Math.random() * 10000000000000000000000).toString(36);
  }

  function handleUpload(files) {
    var postBody = {}
      , i
      , metas = {}
      , file
      , id
      , filesMap = {}
      ;   

    // TODO document if files.length is always present or no
    if (!files || !files.length) {
      alert('No files specified');
      return;
    }   
   
    for (i = 0; i < files.length; i += 1) {
      file = files[i];
      id = randomString();
      metas[id] = {
          "name": file.fileName || file.name || undefined
        , "size": file.fileSize || file.size || undefined
        , "lastModifiedDate": file.lastModifiedDate || undefined
        , "type": file.type || undefined
        , "path": file.webkitRelativePath || file.relativePath || file.path || undefined
      };
      filesMap[id] = file;
    }

    console.log(metas);

    MegaUpload.create(metas, filesMap);
  }

  function attachHandlers() {
    var abstracter
      ;

    // TODO set the class on the button for hover even though
    // it's masked by the file chooser above it
    // NOTE the file-chooser doesn't work if the content area is hidden and then .show()n
    Updrop.create(handleUpload, '#drop-container', '#dropzone');
    abstracter = Updrop.abstract(handleUpload);
    $('body').bind('dragover', Updrop.handleDrag);
    $('body').bind('drop', abstracter);
  }

  $.domReady(attachHandlers);
  //require('./mediabox');
}());
