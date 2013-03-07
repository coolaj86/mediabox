(function () {
  "use strict";

  console.log('Hello World!');

  var Updrop = require('./updrop')
    , MegaUpload = require('./file-upload-queue')
    , MediaBox = require('./mediabox')
    , $ = require('jQuery')
    ;

  $.domReady = $;

  function randomString() {
    return Math.floor(Math.random() * 10000000000000000000000).toString(36);
  }

  function handleUpload(files) {
    var i
      , metas = {}
      , file
      , id
      , filesMap = {}
      ;   

    // TODO document if files.length is always present or no
    if (!files || !files.length) {
      console.error(this);
      console.error(files);
      window.alert('No files specified');
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

    function updateTags(metas) {
      Object.keys(metas).forEach(function (key) {
        var meta = metas[key]
          ;

        // TODO mediabox should respond with the meta data
        meta.title = meta.name.replace(/\.\w{1,5}$/, '');
        meta.extname = meta.name.replace(/.*\./, '.');
        meta.fileMd5sum = meta.md5sum;
        MediaBox.getTags().push(metas[key]);
      });

      console.log('uploaded:');
      console.log(metas);
    }

    MegaUpload.create('ul#uploadlist', updateTags, metas, filesMap);
    $('.js-uploading').closest('.js-metalist-tab').show();
  }

  function attachHandlers() {
    var abstracter
      ;

    // TODO set the class on the button for hover even though
    // it's masked by the file chooser above it
    // NOTE the file-chooser doesn't work if the content area is hidden and then .show()n
    //Updrop.create(handleLocalLoad, 'body', '.local-dropzone');
    abstracter = Updrop.abstract(handleUpload);
    $('body').bind('dragover', Updrop.handleDrag);
    $('body').bind('drop', abstracter);

    Updrop.create(handleUpload, 'body', '.js-file-drop-zone');
  }

  MediaBox.init();

  $.domReady(attachHandlers);
}());
