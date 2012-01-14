(function () {
  "use strict";

  var Store = require('./store-strategy')
    , store
    ;
    
  store = Store.create();
  store('./testroot/absolute/real');
  //store('./testroot/absolute/goodbye.txt');
  ////store('./testroot/symbolic/broken');
  //store('./testroot/symbolic/link-to-a-link');
  ////store('./testroot/symbolic/out-of-scope');
  store('./testroot/symbolic/working');
}());
  
