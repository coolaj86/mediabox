(function () {
  "use strict";
  
  require('remedial');

  function transform(line) {
    var m = line.match(/([a-z0-9]{32}) (.*)/);
    if (!m) {
      console.log(']');
      return;
    }
    console.log('[' + m[1].quote() + ', ' + m[2].quote() + ']');
  }

  var lines = require('fs').readFileSync('db-log-slim.txt').toString().split('\n');
  console.log('[');
  lines.forEach(transform);
}());
