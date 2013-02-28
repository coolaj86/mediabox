/*jshint strict:true node:true es5:true browser:true
indent:2 onevar:true laxcomma:true laxbreak:true
eqeqeq:true immed:true latedef:true*/
(function () {
  "use strict";

  var $ = require('ender')
    ;

  function pad(str) {
    str = str.toString();
    while (str.length < 2) {
      str = "0" + str;
    }
    return str;
  }

  function toTime(floatSecs) {
    var mins
      , secs
      ;

    if (!floatSecs) {
      return '-0:00';
    }

    floatSecs = Math.floor(floatSecs);

    mins = Math.floor(floatSecs / 60);
    floatSecs -= (mins * 60);
    secs = Math.round(floatSecs);

    return mins + ':' + pad(secs);
  }

  function create(selector, strategy) {
    selector += ' ';

    var playerEl = $(selector)
      , selectors =
        { "play": '.mb-play'
        , "pause": '.mb-pause'
        , "louder": '.mb-vol-up'
        , "quieter": '.mb-vol-down' 
        , "mute": '.mb-vol-mute'
        , "next": '.mb-next'
        , "previous": '.mb-previous'
        , "forward": '.mb-pos-forward'
        , "back": '.mb-pos-back'
        , "tracklist": selector + '.mb-audios'
        , "playtimeTotal": selector + '.mb-playtime-total'
        , "playtimeRemaining": selector + '.mb-playtime-remaining'
        , "playtime": selector + '.mb-playtime'
        , "progress": selector + '.mb-progress'
        , "buffer": selector + '.mb-buffer'
        , "volume": selector + '.mb-volume'
        , "rawvolume": selector + '.mb-volume-raw'
        , "duration": selector + '.duration'
        , "title": selector + '.mb-title'
        , "artist": selector + '.mb-artist'
        , "album": selector + '.mb-album'
        , "buffering": selector + '.mb-buffering'
        , "thumbsUp": selector + '.mb-thumbs-up'
        , "thumbsDown": selector + '.mb-thumbs-down'
        , "ratingImg": selector + '.mb-rating-img'
        , "tagAsSpecialtyMusic": selector + '.mb-specialty-music'
        , "tagAsNotMusic": selector + '.mb-not-music'
        }
      , ratingImgs = 
        { "NaN": "images/rating+0.png"
        , "-1": "images/rating-1.png"
        , "-2": "images/rating-2.png"
        , "-0": "images/rating+0.png" // just in case
        , "0": "images/rating+0.png"
        , "1": "images/rating+1.png"
        , "2": "images/rating+2.png"
        }
      , defaultVolume = 1
      , positionStep = 5 * 1000
      , fadeTimeout
      ;

    function setRatingImage(r) {
      r = Math.min(Math.max(-2, parseInt(r, 10)), 2);
      $(selectors.ratingImg).attr('src', ratingImgs[r]);
      return r;
    }

    function updateInfo(a, b) {
      // prefer the song being crossfaded
      // a = b || a;
      $(selectors.title).text(a.title || "Uknown Track");
      $(selectors.artist).text(a.artist || "Uknown Artist");
      $(selectors.album).text(a.album || "Uknown Album");
      setRatingImage(a.rating);
    }

    function updateRawVolume(volume) {
      $(selectors.rawvolume).attr('value', volume);
    }
    function updateVolume(volume) {
      $(selectors.volume).attr('value', volume);
    }

    function updateDuration(a, b) {
      // prefer the song being crossfaded
      //a = b || a;
      $(selectors.buffer).attr('max', a.duration);
      // TODO use real current value
      //$(selectors.buffer).attr('value', 0);

      $(selectors.progress).attr('max', a.duration * 1000);
      $(selectors.progress).attr('value', a.currentTime * 1000);

      $(selectors.duration).text(toTime(a.duration));
      $(selectors.playtimeTotal).text(toTime(a.duration));
    }

    function updateTime(a, b) {
      // prefer the song being crossfaded
      //a = b || a;
      $(selectors.progress).attr('value', a.currentTime * 1000);
      $(selectors.playtimeRemaining).text(toTime(Math.floor(a.duration) - Math.floor(a.currentTime)));
      $(selectors.playtime).text(toTime(a.currentTime));
    }

    function attachHandlers() {
      // TODO fadeout on play, pause, next, and back

      // volume
      $(selector).delegate(selectors.volume, 'change', function () {
        var val = $(this).val()
          ;

        strategy.volume(val);
      });

      // play / resume
      $(selector).delegate(selectors.play, 'click', strategy.resume);

      // seek
      function seek() {
        var position = $(selectors.progress).val()
          ;

        strategy.seek(position);
      }
      $(selector).delegate(selectors.progress, 'change', seek);

      // pause
      $(selector).delegate(selectors.pause, 'click', strategy.pause);

      // decreaseVolume
      $(selector).delegate(selectors.quieter, 'click', function () {
        strategy.decreaseVolume();
      });

      // incluseVolume
      $(selector).delegate(selectors.louder, 'click', function () {
        strategy.increaseVolume();
      });

      // nextTrack
      $(selector).delegate(selectors.next, 'click', strategy.next);

      // previousTrack
      $(selector).delegate(selectors.previous, 'click', function () {
        // strategy.skipTo
        window.alert("Hey! :-)   Thanks for trying out the 'previous' button.... but it doesn't work yet.");
      });

      $(selector).delegate(selectors.thumbsUp, 'click', strategy.thumbsUp);
      $(selector).delegate(selectors.thumbsDown, 'click', strategy.thumbsDown);

      $(selector).delegate(selectors.tagAsNotMusic, 'click', function () {
        var track = strategy.getCurrent()
          ;

        track.category = '!music';
      });
      $(selector).delegate(selectors.tagAsSpecialtyMusic, 'click', function () {
        var track = strategy.getCurrent()
          ;

        track.style = '~special';
      });

      // TODO seek for slider
      // TODO get duration from strategy

      // seekAhead / forward
      $(selector).delegate(selectors.forward, 'click', function (ev) {
        // TODO relative seek?
        strategy.seekAhead(positionStep);
      });

      // seekBehind / back
      $(selector).delegate(selectors.back, 'click', function (ev) {
        strategy.seekBehind(positionStep);
      });

      // mute
      $(selector).delegate(selectors.mute, 'click', function () {
        if (strategy.isMuted()) {
          strategy.unmute();
          $(this).attr('src', 'images/volume_unmute.png');
        } else {
          strategy.mute();
          $(this).attr('src', 'images/volume_mute.png');
        }
      });

      // TODO listen on play / pause
      $(selectors.play).show();
      $(selectors.pause).hide();

      strategy.on('pause', function () {
        $(selectors.pause).hide();
        $(selectors.play).show();
      });

      strategy.on('playing', function () {
        $(selectors.pause).show();
        $(selectors.play).hide();
      });

      strategy.on('ratingchange', setRatingImage);
      strategy.on('durationchange', updateDuration);
      strategy.on('volumechange', updateVolume);
      strategy.on('rawvolumechange', updateRawVolume);
      strategy.on('timeupdate', updateTime);
      strategy.on('infoupdate', updateInfo);
      strategy.on('progress', function (a) {
        var len = a.buffered.length
          ;

        if (len) {
          // assuming the last buffer will have the highest number
          $(selectors.buffer).attr('value', a.buffered.end(len - 1));
        }

        $(selectors.buffering).show();
      });
      strategy.on('suspend', function (a) {
        var len = a.buffered.length
          ;

        if (len) {
          // assuming the last buffer will have the highest number
          $(selectors.buffer).attr('value', a.buffered.end(len - 1));
        }
        $(selectors.buffering).hide();
      });
    }

    $.domReady(attachHandlers);
  }

  module.exports.create = create;
}());
