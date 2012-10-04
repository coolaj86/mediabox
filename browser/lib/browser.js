/*jshint strict:true node:true es5:true onevar:true laxcomma:true laxbreak:true*/
/*
 * BROWSER
 */
(function () {
  "use strict";

  var $ = require('ender')
    , _ = require('underscore')
    , domReady = require('domready')
    , pure = require('pure').$p
    , request = require('ahr2')
    , forEachAsync = require('forEachAsync')
    , serializeForm = require('serialize-form')
    , searchTimeout = null
    , ajasMutex = false
    , searchWaiting = false
    , prevVal = ''
    , searchTpl
    ;

  function searchCache() {
    // TODO do cheap, fast search
  }

  function searchAgainNow() {
    var input = $('#js-search-input').val().replace(/\s+/g, ' ')
      ;

    // don't send when simply using the arrow keys
    // or deleting the text in the field
    if (input == prevVal) {
      return;
    }

    if (!input) {
      // TODO clear results?
      return;
    }

    prevVal = input;
    clearTimeout(searchTimeout);
    searchCache();
    if (ajasMutex) {
      searchWaiting = true;
      return;
    }

    // TODO show current query to user
    console.log(input);
    request.get("/meta?search=" + encodeURIComponent(input)).when(function (err, ahr, data) {
      ajasMutex = false;
      // TODO render
      if (data && data.success) {
        doRender(data.result);
        console.log('search results:', data);
      } else {
        console.error(data && data.errors || "unsuccessful ajas");
      }

      if (searchWaiting) {
        searchWaiting = false;
        searchAgainNow();
      }
    });
  }

  function doRender(object) {
    var searchDirective = {
      "#js-result-item": {
        "o <-": {
            ".js-name": "o.name"
          , ".js-path": "o.path"
          , ".js-size": "o.size"
          , ".js-modified": "o.modified"
          , ".js-modified-human": "o.modified"
        }
      }
    };

    $('#js-results-container').html(searchTpl);
    pure('#js-results-container').render(object, searchDirective);
  }

  function searchAgain() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(searchAgainNow, 400);
    searchCache();
  }

  function init() {
    searchTpl = $('#js-results-container').html();
    $('body').delegate('form#js-search', 'submit', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      searchAgainNow.call(this);
    });
    $('body').delegate('input#js-search-input', 'keyup', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      searchAgain.call(this);
    });
    console.log('It is now safe to assign events and run other DOM code.');
    // It is recommended that you do so here.
  }

  domReady(init);
}());
