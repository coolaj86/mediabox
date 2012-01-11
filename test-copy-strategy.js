(function () {
  "use strict";

  var Copy = require('./copy-strategy')
    , copy = Copy.create()
    ;

  function gotErDone(e) {
    console.error('[error]');
    console.error(e);
    console.log('All Done');
  }

  copy(gotErDone, './testroot/absolute/real');

}());
