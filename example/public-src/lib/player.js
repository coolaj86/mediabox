(function () {
  "use strict";

  var $ = require('ender')
    ;

  function pad(s) {
    s = s.toString();
    while (s.length < 2) {
      s = "0" + s;
    }
    return s;
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
      , selectors = {
            "play": '.mb-play'
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
          , "playtimePassed": selector + '.mb-playtime-passed'
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
        }
      , defaultVolume = 1
      // these two are given separate names for semantic integrity
      , volumeStep = 0.05
      , positionStep = 5
      , fadeTimeout
      ;

    function updateInfo(a, b) {
      // prefer the song being crossfaded
      a = b || a;
      $(selectors.title).text(a.title || "Uknown Track");
      $(selectors.artist).text(a.artist || "Uknown Artist");
      $(selectors.album).text(a.album || "Uknown Album");
    }

    function updateRawVolume(volume) {
      $(selectors.rawvolume).attr('value', volume);
    }
    function updateVolume(volume) {
      $(selectors.volume).attr('value', volume);
    }
    function updateDuration(a, b) {
      // prefer the song being crossfaded
      a = b || a;
      $(selectors.buffer).attr('max', a.duration);
      $(selectors.buffer).attr('value', 0);
      $(selectors.progress).attr('max', a.duration);
      $(selectors.progress).attr('value', a.currentTime);
      $(selectors.duration).text(toTime(a.duration));
      $(selectors.playtimeTotal).text(toTime(a.duration));
    }

    function updateTime(a, b) {
      // prefer the song being crossfaded
      a = b || a;
      $(selectors.progress).attr('value', a.currentTime);
      $(selectors.playtimePassed).text(toTime(Math.floor(a.duration) - Math.floor(a.currentTime)));
      $(selectors.playtime).text(toTime(a.currentTime));
    }

    function attachHandlers() {
      // TODO fadeout on play, pause, next, and back

      // volume
      $(selector).delegate(selectors.volume, 'change', function () {
        var val = $(this).val()
          ;

        strategy.changeVolume(val);
      });

      // play / resume
      $(selector).delegate(selectors.play, 'click', strategy.playNow);

      // pause
      $(selector).delegate(selectors.pause, 'click', strategy.pauseNow);

      // decreaseVolume
      $(selector).delegate(selectors.quieter, 'click', strategy.decreaseVolume);

      // incluseVolume
      $(selector).delegate(selectors.louder, 'click', strategy.increaseVolume);

      // nextTrack
      $(selector).delegate(selectors.next, 'click', strategy.playNextTrack);

      // previousTrack
      $(selector).delegate(selectors.previous, 'click', function () {
        // strategy.skipTo
        alert("Hey! :-)   Thanks for trying out the 'previous' button.... but it doesn't work yet.");
      });

      // TODO seek for slider
      // TODO get duration from strategy

      // seekAhead / forward
      $(selector).delegate(selectors.forward, 'click', function (ev) {
        // TODO relative seek?
        strategy.forward(positionStep);
      });

      // seekBehind / back
      $(selector).delegate(selectors.back, 'click', function (ev) {
        strategy.back(positionStep);
      });

      // mute
      $(selector).delegate(selectors.mute, 'click', strategy.muteTracks);

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
