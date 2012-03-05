// This is an abstraction over the Audio object which allows for fading, including crossfading
// The following events cancel a crossfade
//    * mute
//    * pause
//    * stop
//    * forward
//    * skip // skips the new song?
// This means that the following events always operate on the current track
//    * unmute
//    * play
//    * back
(function () {
  "use strict";

  var EventEmitter = require('events').EventEmitter
    , $ = require('ender')
      // TODO fadeVolume needs a token
    , fadeVolume = require('./volume-fader')
    , allMediaEvents
    , debugHandlers
    ;

  allMediaEvents = [
      'abort'
    , 'canplay'
    , 'canplaythrough'
    , 'canshowcurrentframe'
    , 'dataunavailable'
    , 'durationchange'
    , 'emptied'
    , 'empty'
    , 'ended'
    , 'error'
    , 'loadeddata'
    , 'loadedmetadata'
    , 'loadstart'
    , 'mozaudioavailable'
    , 'pause'
    , 'play'
    , 'playing'
    , 'progress'
    , 'ratechange'
    , 'seeked'
    , 'seeking'
    , 'suspend'
    , 'timeupdate'
    , 'volumechange'
    , 'waiting'
  ];

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

  // 1000 ticks of volume are more than enough and prevent weirdness
  function toIntegerVolume(n) {
    return Number((n * 1000).toFixed(0));
  }
  function toFloatVolume(n) {
    return Number((n / 1000).toFixed(3));
  }
  function preserveFloatVolume(n) {
    return Number(n.toFixed(3));
  }

  function sanatizeRating(r) {
    return Math.min(Math.max(-2, parseInt(r, 10)), 2) || null;
  }

  function removeDebugEvents(track) {
    var audio = track.audio
      ;

    function realRemoveEvents(key) {
      var handler = debugHandlers[key]
        ;

      audio.removeEventListener(key, handler);
    }

    allMediaEvents.forEach(realRemoveEvents);
  }

  function removeEvents(track) {
    var events = track.events
      , audio = track.audio
      ;

    function realRemove(key) {
      var handler = events[key]
        ;

      audio.removeEventListener(key, handler);
    }

    Object.keys(events).forEach(realRemove);
  }

  function create(params) {
    params = params || {};

    var emitter = new EventEmitter()
      , currentTrack
      , upcomingTrack
      , settings
      , playNextImmediately
      ;

    settings = {
        volume: params.volume || 800 // 0.8
      , volumeStep: params.volumeStep || 50 // 0.05
      , pauseTime: params.pauseTime || 250
      , resumeTime: params.resumeTime || 250
      , muteVolume: params.muteVolume || 50 // 0.05
      , muteTime: params.muteTime || 150
      , muted: params.muted || false
      , unmuteTime: params.unmuteTime || 250
      , crossfadeTime: params.crossfadeTime || 5 * 1000 // this is in seconds... duh
      , positionStep: params.positionStep || 5 * 1000
    };

    function thumbsUp() {
      rating((sanatizeRating(currentTrack.rating) || 0) + 1);
    }

    function thumbsDown() {
      rating((sanatizeRating(currentTrack.rating) || 0) - 1);
    }

    function rating(r) {
      currentTrack.rating = r;
      emitter.emit('ratingchange', r);
    }

    function destroy(cb, track) {

      function realDestroy() {
        console.log('[destroy] track after fade');
        console.log(track, track.audio);
        removeDebugEvents(track);
        track.audio.pause();
        track.currentTime = 0;
        track.audio.volume = toFloatVolume(settings.volume);
        // saving this in case the user wants to play the file again
        track.href = track.audio.src;
        track.deleted = true;
        track.audio.src = 'foo://cause-error (empties buffer)';
        console.log('[delete the audio]');
        $(track.audio).remove();
        delete track.audio;
        console.log('really really deleted');
        cb && cb();
      }

      if (!track) {
        cb && cb();
        return;
      }
      console.log('[l] destroy');

      removeEvents(track);

      if (!track.audio.paused) {
        console.log('[destroy] track before fade');
        console.log(track.audio.paused, track.audio, track);
        // TODO use the pause() function ?
        fadeVolume(realDestroy, track.audio, 0, settings.pauseTime);
      } else {
        realDestroy();
      }
    }

    function promote() {
      console.log('[m] promote');
      if (currentTrack) {
        destroy(null, currentTrack);
      }
      currentTrack = upcomingTrack;
      addPlayEvents(currentTrack);
      emitter.emit('infoupdate', currentTrack);
      emitter.emit('volumechange', settings.volume);
      if (currentTrack.audio.duration) {
        currentTrack.events['durationchange']();
      }
      if (currentTrack.audio.buffered.length) {
        currentTrack.events['progress']();
      }
      upcomingTrack = undefined;
      emitter.emit('next', enque);
    }

    function enque(track) {
      console.log('[n] enque');
      if (!track || (!track.audio && !track.href)) {
        throw new Error('You gave nothing to enque (or missing audio or href)');
      }
      console.log('[n] enque', track.title);

      // if we're crossfading, the user must want us to stop
      // if we're not, the user must want to disregard the current 'next'
      if (upcomingTrack && !upcomingTrack.paused) {
        console.log('[na] upcomingTrack');
        promote();
      } else {
        console.log('[nb] upcomingTrack');
        destroy(null, upcomingTrack);
        upcomingTrack = undefined;
      }

      // We prepare the new track to upcomingTrack
      upcomingTrack = track;
      // TODO new Audio() ?
      upcomingTrack.audio = upcomingTrack.audio || $("<audio src='" + track.href + "'></audio>")[0];
      upcomingTrack.audio.preload = 'auto';
      upcomingTrack.audio.volume = 0;
      upcomingTrack.events = {};
      removeEvents(upcomingTrack);
      addQueueEvents(upcomingTrack);
      // TODO is this even necessary?
      $('body').append(upcomingTrack.audio);

      if (!currentTrack || playNextImmediately) {
        console.log('[nc] play now');
        playNextImmediately = false;
        promote(); // track -> currentTrack
        resume();
      } else {
        console.log('[nd] play later');
      }
    }

    // TODO update times independently during crossfade
    // and let duration be the duration of the upcomingTrack
    // I.E.
    // 0:03    3:46    -0:03
    function play(track) {
      console.log('[o] play');
      if (!track) {
        resume();
        return;
      }

      playNextImmediately = true;
      enque(track);
      next();
    }

    function next() {
      console.log('[p] next');
      if (!upcomingTrack) {
        return;
      }

      // we're killing the first track early
      if (!upcomingTrack.audio.paused) {
        // fade out the current currentTrack
        fadeVolume(null, currentTrack.audio, 0, settings.pauseTime);
        playNextImmediately = true;
      }
      promote(); //destroys upcomingTrack and addPlayEvents(currentTrack<-upcomingTrack);

// nshtnshtnshnthoeuou
      // we've promoted upcomingTrack->currentTrack and we'll continue to play it
      // until the upcomingTrack is ready (promote emits 'next')

      // if upcomingTrack already exists, then play it now
      // otherwise, as soon as it loads play it
      if (upcomingTrack) {
        console.log('next is calling resume');
        resume()
      } else {
        playNextImmediately = true;
      }
    }

    function addDebugEvents(track) {
      console.log('[q] addDebug');
      allMediaEvents.forEach(function (key) {
        track.audio.addEventListener(key, debugHandlers[key]);
      });
    }

    function addQueueEvents(track) {
      console.log('[r] addQ');

      function error() {
        emitter.emit('queueError', track);
        console.log('queue error');
        if (!track.deleted) {
          destroy(null, track);
        }
        emitter.emit('next', enque);
      }

      if (track.audio.error) {
        console.log('per-event error');
        error();
      }

      track.events['error'] = error;
      track.audio.addEventListener('error', error);
    }

    function startCrossfade() {
      console.log('[s] crossfade');
      var crossfadeTime
        , events = currentTrack.events
        , audio = currentTrack.audio
        ;

      // no upcomingTrack, or upcomingTrack already playing
      if (!upcomingTrack || !upcomingTrack.audio.paused) {
        console.log('there\'s nothing to resume here');
        return;
      }

      // no current track either
      if (!currentTrack) {
        console.warn('startCrossfade: currentTrack disappeared');
        return;
      }

      function emitChangeEvents() {
        console.log('promoting fade-in, destroying fade-out');
        // currentTrack is the promoted currentTrack
        emitter.emit('volumechange', settings.volume);
        emitter.emit('rawvolumechange', settings.volume);
        promote();
      }

      // There are cases where settings.crossfadeTime may be wrong
      // I can't remember what they are... but I was just thinking about it
      // anyway duration - time will be correct
      // ... a seek into the crossfade zone isone of them
      crossfadeTime = (audio.duration - audio.currentTime) * 1000;
      console.log('crossfadeTime');
      console.log(audio.duration, audio.currentTime);
      fadeVolume(null, audio, 0, crossfadeTime);

      // TODO make sure upcomingTrack is loaded
      upcomingTrack.audio.play();
      console.log(crossfadeTime);
      fadeVolume(emitChangeEvents, upcomingTrack.audio, toFloatVolume(settings.volume), crossfadeTime);

      // TODO fire ended event
      audio.removeEventListener('error', events['error']);
      audio.removeEventListener('end', events['end']);

      // removes the queue events
      removeEvents(upcomingTrack);
      //currentTrack.audio.volume = toFloatVolume(settings.muteVolume);
    }

    function addPlayEvents(track) {
      console.log('[t] addPlay');
      var events = track.events
        , audio = track.audio
        ;
        
      events['progress'] = function () {
        var self = track.audio
          ;

        // TODO return the buffers in a sane fashion
        // this.buffered.length
        // this.buffered.start(i)
        // this.buffered.end(i)
        if (self.buffered.length) {
          emitter.emit('progress', self, null, self.buffered.start(0), self.buffered.end(0));
        }
      };

      events['suspend'] = function () {
        emitter.emit('suspend', this, null);
      };

      events['volumechange'] = function () {
        // don't allow wonky volumes, keep it in the 1000 range
        emitter.emit('rawvolumechange', toIntegerVolume(this.volume));
      };

      events['durationchange'] = function () {
        var self = track.audio
          ;

        track.duration = currentTrack.duration = self.duration;
        emitter.emit('durationchange', self, null, track.duration * 1000);
      };

      events['timeupdate'] = function () {
        if ((this.duration - this.currentTime <= (settings.crossfadeTime / 1000)) && !currentTrack.fadeout) {
          currentTrack.fadeout = true;
          console.log('timeupdate')
          startCrossfade();
          // TODO start fading
        }

        if (track.duration !== this.duration) {
          // BUG XXX TODO put on chrome mailing list
          // I've seen a bug many many times where the original
          // duration is incorrect and is later corrected, but
          // doesn't fire a new durationchange event
          track.duration = this.duration;
          emitter.emit('durationchange', this.duration);
        }

        emitter.emit('timeupdate', this, null, this.currentTime, this.duration);
      };

      //events['ended'] = next;
      //events['error'] = next;

      Object.keys(currentTrack.events).forEach(function (key) {
        currentTrack.audio.addEventListener(key, currentTrack.events[key]);
      });
    }

    function resume() {
      console.log('[a] resume');

      function postPopResume() {
        if (!currentTrack) {
          console.warn('resume: currentTrack undefined');
          return;
        }
        if (currentTrack.audio.paused) {
          console.warn('resume: currentTrack paused again');
        }
        if (!currentTrack.audio.paused && !currentTrack.audio.muted) {
          emitter.emit('playing');
          fadeVolume(null, currentTrack.audio, toFloatVolume(settings.volume), settings.resumeTime);
        }
      }

      if (!currentTrack || !upcomingTrack) {
        console.log('feed me!');
        emitter.emit('next', enque);
        return;
      }

      // TODO unmute?
      currentTrack.audio.volume = 0;
      if (0 === currentTrack.audio.currentTime) {
        //process.nextTick(postPopResume);
        setTimeout(postPopResume, 0);
      } else {
        // chrome has a bug where every resume from pause results in an audio
        // "pop" sometime during the first 1000ms and this is a lousy hack to fix that
        if (currentTrack.audio.currentTime > 1.5) {
          currentTrack.audio.currentTime -= 1.5;
        // throws DOM exception if 0 is set to 0 (or perhaps just if play() hasn't happened yet)
        } else if (currentTrack.audio.currentTime) {
          currentTrack.audio.currentTime = 0;
        }
        setTimeout(postPopResume, 750);
      }
      currentTrack.audio.play();
      emitter.emit('resume');
    }

    function stopCrossfade(cb, ms) {
      console.log('[b] stopCrossfade');
      ms = ms || 250;
      if (upcomingTrack && !upcomingTrack.audio.paused) {
        // fade out the current currentTrack
        fadeVolume(null, currentTrack.audio, 0, ms);
        promote();
      }

      if (currentTrack && !currentTrack.audio.paused) {
        fadeVolume(cb, currentTrack.audio, 0, ms);
      }
    }

    function pause(tn) {
      console.log('[c] pause');
      var track = tn || currentTrack
        ;

      function realPause() {
        currentTrack.audio.pause();
        currentTrack.audio.muted = false;
        settings.muted = false;
      }

      if (!track) {
        return;
      }

      emitter.emit('pause');
      stopCrossfade(realPause);
    }

    function mute() {
      console.log('[d] mute');
      function realMute() {
        currentTrack.muted = true;
      }

      stopCrossfade(realMute, settings.muteTime);
      settings.muted = true;
      emitter.emit('mute', true);
    }

    function unmute() {
      console.log('[e] unmute');
      if (!currentTrack) {
        return;
      }

      currentTrack.audio.volume = 0;
      currentTrack.audio.muted = false;

      if (settings.volume < 2 * settings.muteVolume) {
        settings.volume = 2 * settings.muteVolume;
        emitter.emit('volumechange', settings.volume);
      }

      fadeVolume(null, currentTrack.audio, toFloatVolume(settings.volume), settings.unmuteTime);
      settings.muted = false;
      emitter.emit('mute', false);
    }

    function volume(newVolume) {
      console.log('[f] volume');
      var newVol = newVolume || settings.volume
        , oldVol = settings.volume
        , diff
        , limiter
        , limit
        , intLimit
        ;

      console.log('new volume');
      if (undefined === newVolume) {
        return settings.volume;
      }

      settings.volume = newVol;

      if (!currentTrack) {
        if (newVol !== oldVol) {
          emitter.emit('volumechange', settings.volume);
        }
        return;
      }

      // if currentTrack is paused, upcomingTrack doesn't exist
      if (currentTrack.audio.muted || currentTrack.audio.paused) {
        // no need to fade
        currentTrack.audio.volume = toFloatVolume(settings.volume);
        if (newVol !== oldVol) {
          emitter.emit('volumechange', settings.volume);
        }
        return;
      }

      diff = newVol - oldVol;
      console.log('diff vol:', diff);

      if (0 === diff) {
        return;
      } else if (diff > 0) { // (newVol > oldVol)
        limiter = 'min';
        limit = 1;
        intLimit = 1000;
      } else { // (diff < 0) (newVol < oldVol)
        limiter = 'max';
        limit = 0;
        intLimit = 0;
      }

      settings.volume = Math[limiter](intLimit, settings.volume);
      console.log('new2 volume: ', settings.volume);

      emitter.emit('volumechange', settings.volume);
      // steps volume without disrupting possible crossfade
      if (upcomingTrack && !upcomingTrack.audio.paused) {
        upcomingTrack.audio.volume = Math[limiter](limit, upcomingTrack.audio.volume + toFloatVolume(diff));
        if (currentTrack && !currentTrack.audio.paused) {
          currentTrack.audio.volume = Math[limiter](limit, currentTrack.audio.volume + toFloatVolume(diff));
        }
        return;
      }
      fadeVolume(null, currentTrack.audio, toFloatVolume(settings.volume), settings.pauseTime);
      emitter.emit('volumechange', settings.volume);
    }

    // consider: if increasing volume, unmute
    function increaseVolume(step) {
      console.log('[g] vol+');
      step = step || settings.volumeStep;
      step = parseInt(step, 10);
      volume(settings.volume + step);
    }

    function decreaseVolume(step) {
      console.log('[h] vol-');
      step = parseInt(step, 10) || settings.volumeStep;
      volume(settings.volume - step);
    }

    function seek(time) {
      time = (time / 1000);
      if (upcomingTrack && !upcomingTrack.audio.paused) {
        promote();
      }

      if (!currentTrack) {
        return;
      }

      if (!(time < currentTrack.audio.duration)) {
        // so that the end event eventually fires
        currentTrack.audio.currentTime = currentTrack.audio.duration - 0.1;
      }
      if (!(time > 0)) {
        currentTrack.audio.currentTime = 0;
        return;
      }

      currentTrack.audio.currentTime = time;
    }

    function forward(ms) {
      if (upcomingTrack && !upcomingTrack.audio.paused) {
        promote();
      }
      seek((currentTrack.audio.currentTime * 1000) + (ms || settings.positionStep));
    }

    // back
    function back(ms) {
      function upcomingTrackBack() {
        if (!upcomingTrack) {
          // must be crossfading
          return;
        }
        upcomingTrack.audio.pause();
        upcomingTrack.audio.currentTime = 0;
        if (currentTrack) {
          seek((currentTrack.audio.currentTime * 1000) - (ms || settings.positionStep));
        }
      }

      function currentTrackBack() {
        if (!currentTrack) {
          return
        }

        if (upcomingTrack && !upcomingTrack.audio.paused) {
          fadeOut(upcomingTrackBack, upcomingTrack.audio, 0, settings.muteTime);
          return;
        }

        seek((currentTrack.audio.currentTime * 1000) - (ms || settings.positionStep));
      }

      currentTrackBack();
    }

    //
    // Controls
    //
    emitter.play = play;
    emitter.pause = pause;
    emitter.resume = resume;
    emitter.next = next;
    emitter.enque = enque;

    //
    // Seeking
    //
    emitter.seek = seek;
    emitter.fastforward = forward;
    emitter.seekAhead = forward;
    emitter.rewind = back;
    emitter.seekBehind = back;

    //
    // Volume
    //
    emitter.volume = volume;
    emitter.decreaseVolume = decreaseVolume;
    emitter.increaseVolume = increaseVolume;
    emitter.mute = mute;
    emitter.thumbsUp = thumbsUp;
    emitter.thumbsDown = thumbsDown;
    emitter.rating = rating;
    emitter.unmute = unmute;
    emitter.isMuted = function () {
      return settings.muted;
    };
    emitter.isPlaying = function () {
      if (emitter.getCurrent()) {
        return !currentTrack.paused;
      }
    };

    //
    // Debug
    //
    emitter.getCurrent = function () {
      return currentTrack;
    };
    emitter.getNext = function () {
      return upcomingTrack;
    };

    return emitter;
  }

  module.exports.create = create;
}());
