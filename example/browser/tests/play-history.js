(function () {
  "use strict";

  var assert = require('assert')
    , PlayHistory = require('../lib/play-history').PlayHistory
    , playHistory = PlayHistory.create()
    , n = 500
    , i
    ;

  for (i = 0; i < n; i += 1) {
    playHistory.add([1234321, 'aoeusnth', 0]);
  }

  console.log(playHistory._list.length);
}())
