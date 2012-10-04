/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true eqeqeq:true immed:true latedef:true*/
(function () {
  "use strict";

  var dNow = new Date()
    , mockData
    ;

  mockData = [
      {
          name: "foo.jpg"
        , path: "/path/to/it"
        , size: 10240
        , modified: dNow
        , thumbnail: '/thumbs/aef123.jpg'
      }
    , {
          name: "bar.jpg"
        , path: "/path/to/it"
        , size: 10240
        , modified: dNow
        , thumbnail: '/thumbs/dec343.jpg'
      }
    , {
          name: "baz.mp3"
        , path: "/home/aj/Music"
        , size: 10240
        , modified: dNow
        , thumbnail: '/albums/art/12ded1.jpg'
      }
  ];

  // TODO
  function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  }

  function doQuery(cb, search) {
    console.log(search);
    var results
      ;

    results = mockData.filter(function (data) {
      var re = new RegExp(escapeRegExp(search))
        ;

      if (re.test(data.name) || re.test(data.path)) {
        return true;
      }
    });

    cb(results);
  }

  module.exports.query = doQuery;
}());
