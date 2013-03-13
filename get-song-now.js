(function () {
  "use strict";

  var song = process.argv[2]
    , exec = require('child_process').exec
    , reSong = /.*\/(.*)(\..*)/
    , match
    , md5
    , pre
    , ext
    , cmd
    , dbPath = '/Volumes/AJtheDJ/MediaBox-storage/db/files/'
    ;

  // http://getmediabox.com:1232/api/files/de2/de294bd66aa960839b5d6726e2ba9949.mp3
  match = reSong.exec(song);
  md5 = match[1];
  pre = md5.substr(0, 3);
  ext = match[2];

  cmd = 
      "curl '" + song + "' > " + dbPath + pre + "/" + md5 + ext + "; " 
    + "open " + dbPath + pre
    ;

  exec(cmd);

}());
