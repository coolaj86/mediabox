(function () {
  var connect = require('connect')
    , url = require('url')
    , exec = require('child_process').exec;

  connect.header = function (req, res, next) {
    if (res.header) {
      return next();
    }

    var writeHead = res.writeHead,
      my_headers = {};

    res.writeHead = function (status, text, headers) {
      if ('object' === typeof text) {
        headers = text;
        text = undefined;
      }
      if ('object' !== typeof headers) {
        headers = {};
      }

      Object.keys(my_headers).forEach(function (key) {
        headers[key] = my_headers[key];
      });

      if ('undefined' === typeof text) {
        text = headers;
        headers = undefined;
      }
      writeHead.call(res, status, text, headers);
    };

    // Fix so that `undefined` deletes the header?
    res.header = function (key, value) {
      if (undefined === value) {
        return my_headers[key];
      }

      my_headers[key] = value;

      if (null === value) {
        delete my_headers[key];
      }
    }

    next();
  }

  function suggestChrome(req, res, next) {
    res.header("X-UA-Compatible", "chrome=1");
    next();
  }

  function addCors(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept');
    //doop(next);
    if (next) {
      next();
    }
  }

  // \n ﻿Atom \"©nam\" contains: Telemann: Tafelmusik Suite #1 In E Minor - 5. Passepied    "©ART": "Eugen Duvier: Camerata Romana",
  function fixm4a(stdout) {
    // WARN " can be part of a name (but very rare)
    var m = stdout.match(/\\"(.*)\\" contains: (.*?)"(.*)"(.*)\n/);
    // strip trailing whitespace as part of fix
    m[2] = m[2].match(/(.*?)\s*$/)[1];
                                                                                  //name            // attr
    stdout = stdout.replace(/\\n.*?Atom.* \\"(.*)\\" contains: (.*?)"(.*)\n/, '"' + m[1] + '": "' + m[2] + '",\n "' + m[3] + '",\n');
    stdout = JSON.parse(stdout);
    return JSON.stringify(stdout, null, '  ');
  }

  function getTags(req, res, next) {
    var resource = url.parse(req.url, true)
      , xyztags
      , xyzargs = ''
      , filepath;

    if (!/^\/tags\//.test(resource.pathname)) {
      return next();
    }

    filepath = resource.pathname.substr(5);
    if (filepath.match(/.mp3/)) {
      xyztags = 'id3tags';
    } else {
      xyztags = 'm4atags';
    }

    if (query.md5sum) {
      xyzargs += "--with-md5sum ";
    }

    if (query.artwork) {
      xyzargs += "--extract-art ";
    }

    exec(xyztags + ' --literal ' + xyzargs + '.' + filepath, function (err, stdout, stderr) {
      if (err || stderr) {
        return res.end('file not found');
      }
      if (filepath.match(/.m4a/)) {
        stdout = fixm4a(stdout);
      }
      res.end(stdout);
    });
  }

  module.exports = connect.createServer(
    connect.header,
    suggestChrome,
    addCors,
    connect.static('.'),
    getTags
  );
}());
