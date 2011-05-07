(function () {
  "use strict";

  var fs = require('fs')
    , infile
    , outfile
    , json
    , data;

  infile = process.argv[2];
  outfile = process.argv[3];
  json = fs.readFileSync(infile);
  data = JSON.parse(json);

  json = JSON.stringify(data);

  fs.writeFileSync(outfile, json);
}());
