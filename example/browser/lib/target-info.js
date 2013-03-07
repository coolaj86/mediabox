/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true eqeqeq:true immed:true latedef:true*/
(function () {
  "use strict";

  function getLocation() {
    var loc
      ;

    /*
    loc =
      { "protocol": "http:"
      , "hostname": "getmediabox.com"
      , "host": "getmediabox.com"
      , "port": ""
      , "pathname": "/api"
      };
    */
    loc =
      { "protocol": "http:"
      , "hostname": "localhost"
      , "host": location.host || "localhost:8080"
      , "port": location.port || 8080
      , "pathname": "/api"
      };
    return loc;
  }

  function getApiHref() {
    var location = getLocation()
      ;

    return location.protocol + '//' + location.host + location.pathname;
  }

  module.exports.getLocation = getLocation;
  module.exports.getApiHref = getApiHref;
}());
