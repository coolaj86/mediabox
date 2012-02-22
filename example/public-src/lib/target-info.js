(function () {
  "use strict";

  function getLocation() {
    return {
        "protocol": "http:"
      , "hostname": "getmediabox.com"
      , "host": "getmediabox.com"
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
