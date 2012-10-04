/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
/*
 * SERVER
 */
(function () {
  "use strict";

  var steve = require('./steve')
    , connect = require('connect')
    , _ = require('underscore')
    , forEachAsync = require('forEachAsync')
    , app = connect.createServer()
    , doQuery = require('./json-stub').query
    ;

  function getMeta(req, res) {
    var search = req.query.search
      ;

    doQuery(function (result) {
      res.json(result);
      res.end();
    }, search);
  }

  function router(rest) {
    rest.get('/meta', getMeta);
  }

  app
    .use(steve)
    .use(connect.router(router))
    ;

  module.exports = app;
}());
