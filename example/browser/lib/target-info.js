/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true eqeqeq:true immed:true latedef:true*/
(function () {
  "use strict";

  function getLocation() {
    /*
    return {
        "protocol": "http:"
      , "hostname": "getmediabox.com"
      , "host": "getmediabox.com"
      , "port": ""
      , "pathname": "/api"
    };
    */
    return {
        "protocol": "http:"
      , "hostname": "localhost"
      , "host": "localhost:1232"
      , "port": 1232
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
