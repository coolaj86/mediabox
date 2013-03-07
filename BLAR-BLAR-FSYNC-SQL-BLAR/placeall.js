/*jshint node:true es5:true laxcomma:true laxbreak:true*/
(function () {
  "use strict";

  var _ = require('underscore')
    , directive
    , normal
    , extra
    , keysArr
    , keys
    ;
  
  directive = {
      tables: [
          {
              "columns": [
                  {
                      "name": "id"
                  }
                , {
                      "name": "attr0"
                  }
                , {
                      "name": "attr1"
                  }
              ]
          }
      ]
  };

  keysArr = _.pluck(directive.tables[0].columns, "name");
  keys = {};
  keysArr.forEach(function (key) {
    keys[key] = true;
  });

  normal = {
      "id": 0
    , "attr1": 1
    , "attr0": { "silly": "value" }
  };

  extra = {
      "id": 0
    , "xattr0": 2
    , "attr0": 1
    , "xattr": false
  };

  function insert(stuff) {
    var attrs = {
            xattrs: {}
        }
      ;

    Object.keys(stuff).forEach(function (col) {
      var val = stuff[col]
        ;

      if (undefined === val) {
        return;
      }

      if ('xattr' !== col && keys[col] && 'object' !== typeof stuff[col]) {
        attrs[col] = val;
      } else {
        console.log('stnhnsht', stuff[col], col);
        attrs.xattrs[col] = val;
      }
    });

    console.log(attrs);
  }
  
  insert(normal);
  insert(extra);
}());
