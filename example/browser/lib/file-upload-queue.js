(function () {
  "use strict";

  var sequence = require('sequence')()
    , request = require('ahr2')
    //, EventEmitter = require('events').EventEmitter
    , targetInfo = require('./target-info')
    , $ = require('jQuery')
    , linkTpl
    ;

  $.domReady = $;

  function toByteCount(size) {
    // 102.4
    if (size < 102) {
      return size + ' B';
    }

    // 104857.6
    if (size < 104858) {
      return (size / 1024).toFixed(1) + ' KiB';
    }

    // 107374182.4
    if (size < 107374182) {
      return (size / (1024 * 1024)).toFixed(1) + ' MiB';
    }

    // 1099511627776
    return (size / (1024 * 1024 * 1024)).toFixed(1) + ' GiB';
  }

  function create(muSelector, onSuccess, metas, files) {
    function sortBySize(a, b) {
      return metas[a].size > metas[b].size ? -1 : 1;
    }

    var formData = new FormData()
      , els = {}
      , keys = Object.keys(metas).sort(sortBySize)
      ;

    // could optimize
    function nextUpload(session, id, next) {
      var emitter
        ;

      function cleanupUi(err, ahr, data) {
        /*
        var rmetas = {}
          ;
        */

        if (err) {
          window.alert('error uploading data');
          console.error(err);
          return;
        }

        if (data.error || !data.result) {
          window.alert('error uploading data');
          console.error(data);
          return;
        }

        // TODO add new data to client db

        keys.forEach(function (key) {
          var link = els[key]
            //, file = files[key]
            ;

          // TODO move from progress to complete area
          link.remove();
        });

        console.log('result');
        console.log(data.result);

        Object.keys(data.result).forEach(function (fieldname) {
          var fileinfo = data.result[fieldname]
            , meta = metas[fieldname]
            ;

          if (!metas[fieldname]) {
            console.error("got back an id we didn't ask for");
            console.error(fileinfo);
            return;
          }

          // TODO calculate md5sum client-side to save on bandwidth
          // TODO that would need to be a sparse md5sum with size and type
          // TODO the response should be in a more sane format
          meta.md5sum = fileinfo.md5;
          meta.md5 = fileinfo.md5;
        });

        keys.forEach(function (key) {
          if (!metas[key].md5) {
            console.error("something failed to upload");
            console.error(key, metas);
            // TODO log failures in client
            // TODO allow incomplete files on server
          }
        });

        onSuccess(metas);
        next();
      }

      function updateProgress(ev) {
        var totalLoaded = ev.loaded
          , file
          , bytesLeft
          , link
          , bytesLoaded
          ;

        keys.forEach(function (key) {
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
          link.find('.byte-count').text(toByteCount(bytesLoaded));
        });
        // TODO 

        console.log('progressEv', ev.loaded, ev.total);
      }

      emitter = request.post(targetInfo.getApiHref() + '/upload/' + id, null, formData, { headers: { 'x-user-session': session } });
      emitter.upload.on('progress', updateProgress);
      emitter.when(cleanupUi);
    }

    function nextMeta(next) {
      // TODO use a session
      request.post(targetInfo.getApiHref() + '/upload/new', null, metas).when(function (err, ahr, data) {
        var id
          ;
        
        if (err) {
          window.alert('error with upload');
          return;
        }

        if (data.error || !data.result) {
          window.alert('different error with upload');
          return;
        }

        id = data.result;
        console.log('headers');
        console.log(ahr.browserRequest.getAllResponseHeaders());
        // TODO AHR2 should use getAllResponseHeaders to populate `headers`
        nextUpload(ahr.browserRequest.getResponseHeader('x-user-session'), data.result, next);
      }); 
    }

    function startUi(key) {
      var meta = metas[key]
        , link = els[key] = $(linkTpl)
        ;

      link.find('.id').text(key);
      link.find('.name').text(meta.name);
      link.find('a').text(' ');
      link.find('progress').attr('value', "0");
      link.find('progress').find('.val', "0");
      link.find('progress').attr('max', String(meta.size));
      link.find('progress').find('.max', String(meta.size));
      link.find('.remove-file').hide();

      $(muSelector).prepend(link);
      formData.append(key, files[key]);
    }
    
    $.domReady(function () {
      linkTpl = $(muSelector).html();
      $(muSelector).html('');
    });

    keys.forEach(startUi);
    sequence.then(nextMeta);
  }

  module.exports.create = create;
}());
