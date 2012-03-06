(function () {
  "use strict";

  var fs = require('fs')
    , walk = require('walk')
    , crypto = require('crypto')
    , request = require('ahr2')
    , forEachAsync = require('forEachAsync')
    , FormData = require('FormData')
    , File = require('File')
    , UUID = require('node-uuid')
    , paths = process.argv.slice(2)
    ;


  function getApiHref() {
    return 'http://getmediabox.com/api';
  }

  function movePaths(nextCliPath, path) {
    var walker = walk.walk(path)
      , id = UUID.v4()
      , sessionId = UUID.v4()
      ;

    walker.on('file', function (root, stat, nextFile) {
      var metas = {}
        ;

      function actuallyUpload(err, ahr, data) {
        var emitter
          , uploadId
          , form = new FormData()
          ;
        
        function cleanUp(err, ahr, data) {
          if (err) {
            console.error('Upload connection error');
            console.error(err);
            return;
          }

          if (!data || data.error || !data.result) {
            console.error('Upload processing error');
            console.error(data.error);
            return;
          }

          data.result.forEach(function (rmeta) {
            var meta = metas[rmeta.name]
              ;

            if (!meta) {
              console.error("got back an id we didn't ask for");
              console.error(rmeta);
              return;
            }

            // TODO calculate md5sum client-side to save on bandwidth
            // TODO that would need to be a sparse md5sum with size and type
            // TODO the response should be in a more sane format
            meta.md5 = rmeta.value[0].md5sum;
            fs.unlink(root + '/' + stat.name, function (err) {
              if (err) {
                console.error('Trouble removing', root + '/' + stat.name);
                return;
              }
              console.log('Removed', root + '/' + stat.name);
            });
            console.log(rmeta.name, ':', rmeta.value[0].md5sum);
          });

          Object.keys(metas).forEach(function (key) {
            if (!metas[key].md5) {
              console.error("something failed to upload");
              console.error(key, metas);
              // TODO log failures in client
              // TODO allow incomplete files on server
            }
          });

          nextFile();
        }

        if (err) {
          console.error('connection error with meta');
          console.error(err);
          return;
        }

        if (!data || data.error || !data.result) {
          console.error('processing error with meta');
          return;
        }

        uploadId = data.result;

        console.log('upload id:', uploadId);
        form.append(stat.uuid, new File(stat.path + '/' + stat.name));
        emitter = request.post(getApiHref() + '/upload/' + uploadId, null, form, { headers: { 'x-user-session': sessionId }, timeout: Infinity });
        emitter.upload.on('progress', function (ev) {
          // TODO byte count
          // TODO fix AHR progress event (piping)
          console.log((ev.loaded / ev.total) + '%');
        });
        emitter.when(cleanUp);
      }

      stat.uuid = UUID.v4();
      stat.path = root;

      metas[stat.uuid] = {
          "name": stat.name
        , "relativePath": root
        , "lastModificationDate": stat.mtime.toISOString()
        , "size": stat.size
      };

      request.post(getApiHref() + '/upload/new', null, metas, {
          headers: {
              "x-user-session": sessionId
          }
      }).when(actuallyUpload);
    });

    walker.on('end', function () {
      nextCliPath();
    });

    console.log(path);
  }

  forEachAsync(paths, movePaths).then(function () {
    console.log('all files uploaded');
  });
}());
