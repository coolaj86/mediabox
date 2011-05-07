(function () {
  "use strict";

  console.log(new Date().toISOString());
  var fs = require('fs')
    , json = fs.readFileSync('db-log.json')
    , data = JSON.parse(json);
  console.log(new Date().toISOString());
}());
