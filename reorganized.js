(function () {
  "use strict";

  var walk = require("walk")
    , walker;

  walker = walk.walkSync('./db');
  walker.on('file', function (root, stat, next) {
    console.log(stat.name);
  }); 
}());
