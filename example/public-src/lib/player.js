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
    return Math.floor(floatSecs / 60) + ':' + pad(Math.round(floatSecs % 59) ) || "-0:00";
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
          , "progress": selector + 'progress'
          , "duration": selector + '.duration'
          , "title": selector + '.mb-title'
          , "artist": selector + '.mb-artist'
          , "album": selector + '.mb-album'
        }
      , defaultVolume = 1
      // these two are given separate names for semantic integrity
      , volumeStep = 0.05
      , preMuteVolume = volumeStep
      , positionStep = 5
      , currentTrackMeta
      , currentTrack
      , nextTrack
      , nextTrackMeta
      , fadeTimeout
      ;

    function updateInfo(a, b) {
      // prefer the song being crossfaded
      a = b || a;
      $(selectors.title).text(a.title || "Uknown Track");
      $(selectors.artist).text(a.artist || "Uknown Artist");
      $(selectors.album).text(a.album || "Uknown Album");
    }

    function updateDuration(a, b) {
      // prefer the song being crossfaded
      a = b || a;
      $(selectors.progress).attr('max', a.duration);
      $(selectors.duration).text(toTime(a.duration));
      $(selectors.playtimeTotal).text(toTime(a.duration));
    }

    function updateTime(a, b) {
      // prefer the song being crossfaded
      a = b || a;
      $(selectors.progress).attr('value', a.currentTime);
      $(selectors.playtimePassed).text(toTime(a.duration - a.currentTime));
      $(selectors.playtime).text(toTime(a.currentTime));
    }

    function attachHandlers() {
      // TODO fadeout on play, pause, next, and back

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
    }

    $.domReady(attachHandlers);
  }

  module.exports.create = create;
}());
