(function () {
  "use strict";

  var Store = require('../store-strategy')
    , store
    , noop = function () {}
    ;
    
  store = Store.create();
  store(noop, './testroot/absolute/real');
  //store('./testroot/absolute/goodbye.txt');
  ////store('./testroot/symbolic/broken');
  //store('./testroot/symbolic/link-to-a-link');
  ////store('./testroot/symbolic/out-of-scope');
  store(noop, './testroot/symbolic/working');
}());
  
