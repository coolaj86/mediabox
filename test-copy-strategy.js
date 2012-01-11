(function () {
  "use strict";

  /*
    Cases that need testing:
    
    a new file is added // most common
    a symlink to a new file is added
    a symlink to an existing file is added
    an existing (md5 match) file is added
  */

  var Copy = require('./copy-strategy')
    , copy = Copy.create()
    ;

  function gotErDone(e, stat) {
    console.error('[error]');
    console.error(e);
    console.log('All Done');
    console.log(stat);
  }

  copy(gotErDone, './testroot/absolute/real');

}());
