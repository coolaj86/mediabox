/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
/*
 * SERVER
 */
(function () {
  "use strict";

  require('http-json')(require('http'));

  var connect = require('connect')
    , fs = require('fs')
    , path = require('path')
    , cookielessSession = require('connect-cookieless-session')
    , pathname = require('connect-pathname')
    , gcf = require('express-chromeframe')
    , nowww = require('nowww')
    , xcors = require('connect-xcors')
    , cors = xcors()
    , session = cookielessSession()
    , app = connect()
    , version = JSON.parse(
          fs.readFileSync(
              path.join(__dirname, '..', 'package.json')
            , 'utf8'
          )
      ).version
    , semver
    ;

  function parseSemver(version) {
    // semver, major, minor, patch
    // https://github.com/mojombo/semver/issues/32
    // https://github.com/isaacs/node-semver/issues/10
    // optional v
    var m = /^\s*(v)?([0-9]+)(\.([0-9]+))(\.([0-9]+))(([\-+])([a-zA-Z0-9\.]+))?\s*$/.exec(version) || []
      , ver =
        { semver: m[0] || version
        , major: m[2]
        , minor: m[4]
        , patch: m[6]
        , revision: m[7]
        }
      ;

    if (!/^v/.test(ver.semver)) {
      ver.semver = 'v' + ver.semver;
    }

    if ('+' === m[8]) {
      ver.build = m[9];
    }

    if ('-' === m[8]) {
      ver.release = m[9];
    }

    return ver;
  }

  function getVersion(req, res) {
    res.json(semver);
  }

  semver = parseSemver(version);

  if (!connect.router) {
    connect.router = require('connect_router');
  }
  connect.corsPolicy = cors.config;

  cors.config.headers = cors.config.headers.concat(session.headers.slice());

  app
    .use(nowww())
    .use(gcf())
    .use(pathname())
    .use(connect.query())
    .use(connect.json())
    .use(connect.urlencoded())
    .use(cors)
    .use(session)
    .use(connect.static(__dirname + '/../public'))
    .use(connect.static(__dirname + '/../var/public'))
    .use('/version', getVersion)
    .use(connect.favicon())
    ;

  module.exports = app;
}());
