(function () {
  "use strict";

  var window = require('window')
    , location = window.location
    ;

  function getLocation() {
    return {
        "protocol": "http:"
      , "hostname": location.hostname //"getmediabox.com"
      , "host": location.host // "getmediabox.com"
      , "port": ""
      , "pathname": "/api"
    };
  }

  function getApiHref() {
    var location = getLocation()
      ;

    return location.protocol + '//' + location.host + location.pathname;
  }

  module.exports.getLocation = getLocation;
  module.exports.getApiHref = getApiHref;
}());
