(function () {
  "use strict";

  var sequence = require('sequence')()
    , request = require('ahr2')
    , $ = require('ender')
    , linkTpl
    ;

  function sortBySize(a, b) {
    return metas[a].size > metas[b].size ? -1 : 1;
  }

  function create(metas, files) {
    var formData = new FormData()
      , els = {}
      , keys = Object.keys(metas).sort(sortBySize)
      ;

    // could optimize
    function nextUpload(id, next) {
      var emitter
        ;

      function cleanupUi(err, ahr, data) {
        // TODO add new data to client db

        keys.forEach(function (key, i) {
          var file = els[key]
            , link = fileData[key].link
            ;

          // TODO move from progress to complete area
          link.remove();
        });

        next();
      }

      function updateProgress(ev) {
        var totalLoaded = ev.loaded
          , i
          , file
          , bytesLeft
          , link
          , bytesLoaded
          ;

        keys.forEach(function (key, i) {
          file = files[key];
          link = els[key];

          if (totalLoaded > 0) {
            bytesLeft = file.size - totalLoaded;
            if (bytesLeft > 0) {
              bytesLoaded = file.size - bytesLeft;
            } else {
              bytesLoaded = file.size;
              bytesLeft = 0;
            }
            totalLoaded -= bytesLoaded;
          } else {
            bytesLoaded = 0;
            bytesLeft = file.size;
          }

          link.find('progress').attr('value', bytesLoaded);
          link.find('progress').find('.val').text(bytesLoaded);
        });
        // TODO 

        console.log('progressEv', ev.loaded, ev.total);
      }

      emitter = request.post('/api' + '/upload/' + id, null, formData);
      emitter.upload.on('progress', updateProgress);
      emitter.when(cleanupUi);
    }

    keys.forEach(function (key) {
      var meta = metas[key]
        , link = els[key] = $(linkTpl)
        ;

      link.find('.id').text(key);
      link.find('.name').text(meta.name);
      link.find('a').text(' ');
      link.find('a').attr('href', '#');
      link.find('progress').attr('value', "0");
      link.find('progress').find('.val', "0");
      link.find('progress').attr('max', String(meta.size));
      link.find('progress').find('.max', String(meta.size));
      link.find('.remove-file').hide();

      $('ul#uploadlist').prepend(link);
      formData.append(key, files[key]);
    });

    function nextMeta(next) {
      // TODO use a session
      request.post('/api' + '/upload/new', null, metas).when(function (err, ahr, data) {
        var id = data.result
          ;
        
        nextUpload(data.result, next);
      }); 
    }

    sequence.then(nextMeta);
  }

  $.domReady(function () {
    $('ul#uploadlist').html('');
    linkTpl = $('ul#uploadlist').html();
  });

  module.exports.create = create;
}());
