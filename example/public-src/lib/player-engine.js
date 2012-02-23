(function () {
  "use strict";

  var EventEmitter = require('events').EventEmitter
    , $ = require('ender')
    , fadeVolume = require('./volume-fader')
  // TODO use init to assign player strategy
    ;

  function create() {

    var emitter = new EventEmitter()
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
      , debugHandlers
      , history = []
      , playerVolume
      ;

    function getTracks() {
      var arr = []
        ;

      if (currentTrack) {
        arr.push(currentTrack);
      }

      if (nextTrack) {
        arr.push(nextTrack);
      }

      if (nextTrack === currentTrack) {
        arr.pop();
      }

      return arr;
    }

    function enqueTrack(track) {
      nextTrack = track.audio = track.audio || $("<audio src='" + track.href + "'></audio>")[0];
      nextTrack.mbPaused = true;
      nextTrackMeta = track;

      // if this is appended twice it should end up in the exact same location
      // TODO find a better place to append this
      $('body').append(nextTrack);
      if (!currentTrack) {
        playNextTrack();
      }
    }

    function skipToTrack(track) {
      enqueTrack(track);
      cleanupTrack.apply(currentTrack);
    }

    function crossFadeTrack() {
      if (!nextTrack) {
        return;
      }

      // TODO fade
      nextTrack.play();
    }
    // in contrast to cross-fade, which should begin the play
    function cleanupTrack() {
      // TODO save volume from one song to the next
      // We unmark this track so that if it's
      // inserted back into the playlist, it will play again
      if (!this.paused) {
        // TODO maybe use a callback?
        pauseNow();
      }
      delete this.mbPreviousMuteVolume;
      delete this.mbPreviousPauseVolume;
      delete this.mbWasAlreadyPaused;
      delete this.mbPaused
      if (this.currentTime) {
        this.currentTime = 0;
      }
      currentTrack = undefined;
      currentTrackMeta = undefined;
      playNextTrack();
    }

    /*
      abort
      canplay
      canplaythrough
      canshowcurrentframe
      dataunavailable
      durationchange
      emptied
      empty
      ended
      error
      loadeddata
      loadedmetadata
      loadstart
      mozaudioavailable
      pause
      play
      playing
      progress
      ratechange
      seeked
      seeking
      suspend
      timeupdate
      volumechange
      waiting
    */
    debugHandlers = {
        "abort": function () {
          console.log('abort');
        }
      , "canplay": function () {
          console.log('canplay');
        }
      , "canplaythrough": function () {
          console.log('canplaythrough');
        }
      , "canshowcurrentframe": function () {
          console.log('canshowcurrentframe');
        }
      , "dataunavailable": function () {
          console.log('dataunavailable');
        }
      , "durationchange": function () {
          console.log('durationchange');
        }
      , "emptied": function () {
          console.log('emptied');
        }
      , "empty": function () {
          console.log('empty');
        }
      , "ended": function () {
          console.log('ended');
        }
      , "error": function () {
          console.log('error');
        }
      , "loadeddata": function () {
          console.log('loadeddata');
        }
      , "loadedmetadata": function () {
          console.log('loadedmetadata');
        }
      , "loadstart": function () {
          console.log('loadstart');
        }
      , "mozaudioavailable": function () {
          console.log('mozaudioavailable');
        }
      , "pause": function () {
          console.log('pause');
        }
      , "play": function () {
          console.log('play');
        }
      , "playing": function () {
          console.log('playing');
        }
      , "progress": function () {
          console.log('progress');
        }
      , "ratechange": function () {
          console.log('ratechange');
        }
      , "seeked": function () {
          console.log('seeked');
        }
      , "seeking": function () {
          console.log('seeking');
        }
      , "suspend": function () {
          console.log('suspend');
        }
      , "timeupdate": function () {
          console.log('timeupdate');
        }
      , "volumechange": function () {
          console.log('volumechange', this.volume);
        }
      , "waiting": function () {
          console.log('waiting');
        }
    };

    function playNextTrack() {
      if (!nextTrack) {
        return;
      }

      function reallyPlayNextTrack() {

        currentTrack = nextTrack;
        currentTrackMeta = nextTrackMeta;
        delete currentTrack.mbPaused;
        // TODO have all important data on this structure
        emitter.emit('infoupdate', currentTrackMeta);
        nextTrack = undefined;
        nextTrackMeta = undefined;

        //
        // assign all generic handlers
        //
        currentTrack.addEventListener('abort', debugHandlers.abort);
        currentTrack.addEventListener('canplay', debugHandlers.canplay);
        currentTrack.addEventListener('canplaythrough', debugHandlers.canplaythrough);
        currentTrack.addEventListener('canshowcurrentframe', debugHandlers.canshowcurrentframe);
        currentTrack.addEventListener('dataunavailable', debugHandlers.dataunavailable);
        currentTrack.addEventListener('durationchange', debugHandlers.durationchange);
        currentTrack.addEventListener('emptied', debugHandlers.emptied);
        currentTrack.addEventListener('empty', debugHandlers.empty);
        currentTrack.addEventListener('ended', debugHandlers.ended);
        currentTrack.addEventListener('error', debugHandlers.error);
        currentTrack.addEventListener('loadeddata', debugHandlers.loadeddata);
        currentTrack.addEventListener('loadedmetadata', debugHandlers.loadedmetadata);
        currentTrack.addEventListener('loadstart', debugHandlers.loadstart);
        currentTrack.addEventListener('mozaudioavailable', debugHandlers.mozaudioavailable);
        currentTrack.addEventListener('pause', debugHandlers.pause);
        currentTrack.addEventListener('play', debugHandlers.play);
        currentTrack.addEventListener('playing', debugHandlers.playing);
        currentTrack.addEventListener('progress', debugHandlers.progress);
        currentTrack.addEventListener('ratechange', debugHandlers.ratechange);
        currentTrack.addEventListener('seeked', debugHandlers.seeked);
        currentTrack.addEventListener('seeking', debugHandlers.seeking);
        currentTrack.addEventListener('suspend', debugHandlers.suspend);
        currentTrack.addEventListener('timeupdate', debugHandlers.timeupdate);
        currentTrack.addEventListener('volumechange', debugHandlers.volumechange);
        currentTrack.addEventListener('waiting', debugHandlers.waiting);

        emitter.emit('next', enqueTrack);
        currentTrack.addEventListener('progress', function () {
          emitter.emit('progress', this);
        });
        currentTrack.addEventListener('suspend', function () {
          emitter.emit('suspend', this);
        });

        currentTrack.addEventListener('volumechange', function () {
          emitter.emit('volumechange', Math.floor(this.volume * 1000));
        });
        currentTrack.addEventListener('durationchange', function () {
          emitter.emit('durationchange', this);
        });
        currentTrack.addEventListener('timeupdate', function () {
          emitter.emit('timeupdate', this);
        });
        currentTrack.addEventListener('ended', cleanupTrack);
        currentTrack.addEventListener('error', cleanupTrack);

        currentTrack.addEventListener('abort', function () {
          console.log('abort');
        });
        currentTrack.addEventListener('canplay', function () {
          console.log('canplay');
        });
        currentTrack.addEventListener('canplaythrough', function () {
          console.log('canplaythrough');
        });

        // BUG XXX don't do this, duh
        global.testPlayerAudio = currentTrack;

        playNow();
        currentTrack.volume = preMuteVolume;
      }

      removeTrack(reallyPlayNextTrack, true);
    }

    function removeTrack(andThen, calledByAdd) {
      if (!currentTrack) {
        andThen && andThen();
        return;
      }

      // TODO mark as removed and let continue to play until the next track is ready
      function removeCompletely() {
        //
        // remove generic handlers
        //
        currentTrack.removeEventListener('abort', debugHandlers.abort);
        currentTrack.removeEventListener('canplay', debugHandlers.canplay);
        currentTrack.removeEventListener('canplaythrough', debugHandlers.canplaythrough);
        currentTrack.removeEventListener('canshowcurrentframe', debugHandlers.canshowcurrentframe);
        currentTrack.removeEventListener('dataunavailable', debugHandlers.dataunavailable);
        currentTrack.removeEventListener('durationchange', debugHandlers.durationchange);
        currentTrack.removeEventListener('emptied', debugHandlers.emptied);
        currentTrack.removeEventListener('empty', debugHandlers.empty);
        currentTrack.removeEventListener('ended', debugHandlers.ended);
        currentTrack.removeEventListener('error', debugHandlers.error);
        currentTrack.removeEventListener('loadeddata', debugHandlers.loadeddata);
        currentTrack.removeEventListener('loadedmetadata', debugHandlers.loadedmetadata);
        currentTrack.removeEventListener('loadstart', debugHandlers.loadstart);
        currentTrack.removeEventListener('mozaudioavailable', debugHandlers.mozaudioavailable);
        currentTrack.removeEventListener('pause', debugHandlers.pause);
        currentTrack.removeEventListener('play', debugHandlers.play);
        currentTrack.removeEventListener('playing', debugHandlers.playing);
        currentTrack.removeEventListener('progress', debugHandlers.progress);
        currentTrack.removeEventListener('ratechange', debugHandlers.ratechange);
        currentTrack.removeEventListener('seeked', debugHandlers.seeked);
        currentTrack.removeEventListener('seeking', debugHandlers.seeking);
        currentTrack.removeEventListener('suspend', debugHandlers.suspend);
        currentTrack.removeEventListener('timeupdate', debugHandlers.timeupdate);
        currentTrack.removeEventListener('volumechange', debugHandlers.volumechange);
        currentTrack.removeEventListener('waiting', debugHandlers.waiting);

        //
        // remove real handlers
        //
        // TODO fix dur, time
        //currentTrack.removeEventListener('durationchange', updateDuration);
        //currentTrack.removeEventListener('timeupdate', updateTime);
        currentTrack.removeEventListener('ended', cleanupTrack);
        // TODO better error detection
        currentTrack.removeEventListener('error', cleanupTrack);
        currentTrack.pause();
        $(currentTrack).remove();

        // TODO send data about how long it was played / if it was skipped
        emitter.emit('end', { track: currentTrackMeta });

        if (!calledByAdd) {
          playNextTrack(andThen);
          return;
        }
        andThen && andThen();
      }

      if (currentTrack.ended) {
        removeCompletely();
      } else {
        fadeVolume(removeCompletely, currentTrack, 0, 250);
      }
    }

    function resumeTrack(track) {
      if (track.mbPaused) {
        // not ready for crossfade
        return;
      }
      // chrome has a bug where every resume from pause
      // results in an audio glitch sometime during the first 1000ms
      // this is a lousy hack to fix that
      if (track.currentTime > 1.5) {
        track.currentTime -= 1.5;
      // throws DOM exception if 0 is set to 0 (or perhaps just if play() hasn't happened yet)
      } else if (track.currentTime) {
        track.currentTime = 0;
      }
      track.volume = 0;
      track.play();
      setTimeout(function () {
        fadeVolume(null, track, track.mbPreviousPauseVolume || defaultVolume, 300);
      }, 750);
    }

    // play
    function playNow(ev) {
      if (!currentTrack) {
        console.log('feed me!');
        emitter.emit('next', enqueTrack);
        return;
      }
      // TODO update times independently during crossfade
      // and let duration be the duration of the next song
      // I.E.
      // 0:03    3:46    -0:03
      getTracks().forEach(resumeTrack);

      // these need to change after the resume / pause timeout is cancelled
      // in case of doubleclick
      emitter.emit('playing');
    }
      
    function pauseNow(ev) {
      getTracks().forEach(function (track) {
        function pause() {
          track.pause();
          track.muted = false;
        }
        if (track.paused) {
          track.mbWasAlreadyPaused = true;
        }
        if (track.muted) {
          track.mbPreviousPauseVolume = track.mbPreviousMuteVolume;
        } else {
          track.mbPreviousPauseVolume = track.volume;
        }
        fadeVolume(pause, track, 0, 300);
      });

      // fadeVolume uses a timeout, these should not
      // be able to change until that has been registered
      emitter.emit('pause');
    }

    function toggleMute(track) {
      function mute() {
        track.muted = true;
      }

      if (track.muted) {
        track.volume = 0;
        track.muted = false;
        if ('number' !== typeof track.mbPreviousMuteVolume) {
          track.mbPreviousMuteVolume = defaultVolume;
        }

        if (track.mbPreviousMuteVolume < 2 * volumeStep) {
          track.mbPreviousMuteVolume = preMuteVolume;
        }
        fadeVolume(null, track, track.mbPreviousMuteVolume || defaultVolume, 150);
      } else {
        if (track.paused) {
          // TODO needs UI cue
          return;
        }
        track.mbPreviousMuteVolume = track.volume;
        fadeVolume(mute, track, 0, 150);
      }
    }

    function muteTracks(ev) {
      // handles the mute-during-crossfade case
      getTracks().forEach(toggleMute);
    }

    function changeVolume(val) {
      playerVolume = Number((val / 1000).toFixed(3));
      currentTrack.volume = playerVolume;
    }

    function increaseVolume(ev) {
      getTracks().forEach(function (track) {
        if (track.muted) {
          toggleMute(track);
          return;
        }

        if (track.volume < 1) {
          // 1000 ticks of volume are more than enough and prevent weirdness
          track.volume = Number((track.volume + volumeStep).toFixed(3));
        }
      });
    }

    function decreaseVolume(ev) {
      getTracks().forEach(function (track) {
        if (track.muted) {
          if (track.mbPreviousMuteVolume > (2 * volumeStep)) {
            track.mbPreviousMuteVolume -= volumeStep;
          } else {
            track.mbPreviousMuteVolume = volumeStep;
          }
          return;
        }

        if (track.volume > (2 * volumeStep)) {
          track.volume = Number((track.volume - volumeStep).toFixed(3));
          //track.volume -= volumeStep;
        } else {
          track.volume = volumeStep;
          // note that volumeStep can't get lower than mute
          // off only
          toggleMute(track);
        }
      });
    }

    // previous
    function previous() {
      alert("Hey! :-)   Thanks for trying out the 'previous' button.... but it doesn't work yet.");
    }

    function forward(ev) {
      if (currentTrack.currentTime < currentTrack.duration) {
        currentTrack.currentTime += positionStep;
      }
    }

    // back
    function back(ev) {
      if (currentTrack.currentTime > 0) {
        currentTrack.currentTime -= positionStep;
      }
    }

    // add should add item to the list and start playing if nothing better to do
    // play should move item to top of list and crossfade current song
    // insert(<pos>) should add at position <pos> or last if omitted
    emitter.enque = enqueTrack;
    emitter.play = skipToTrack;

    //emitter.play = playNow;
    emitter.playNow = playNow;
    emitter.pauseNow = pauseNow;
    emitter.decreaseVolume = decreaseVolume;
    emitter.increaseVolume = increaseVolume;
    emitter.changeVolume = changeVolume;
    emitter.playNextTrack = playNextTrack;
    emitter.previous = function () {};
    // seekAhead / fast-forward
    emitter.forward = forward;
    emitter.seekAhead = forward;
    // rewind
    emitter.back = back;
    emitter.seekBehind = forward;
    // TODO seek for slider
    // TODO get duration from strategy
    emitter.muteTracks = muteTracks;
    emitter.mute = muteTracks;

    return emitter;
  }

  module.exports.create = create;
}());
