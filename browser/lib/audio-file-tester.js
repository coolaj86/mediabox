(function () {
  "use strict";

  var debugHandlers
    ;

  debugHandlers = {
      "abort": function (ev) {
        console.log('abort', ev);
      }
    , "canplay": function (ev) {
        console.log('canplay');
      }
    , "canplaythrough": function (ev) {
        console.log('canplaythrough');
      }
    , "canshowcurrentframe": function (ev) {
        console.log('canshowcurrentframe');
      }
    , "dataunavailable": function (ev) {
        console.log('dataunavailable');
      }
    , "durationchange": function (ev) {
        // XXX
        // this.currentTime cannot be adjusted until this event fires
        console.log('durationchange');
      }
    , "emptied": function (ev) {
        console.log('emptied');
      }
    , "empty": function (ev) {
        console.log('empty');
      }
    , "ended": function (ev) {
        // XXX skipping while seeking will create new play ranges
        // playing seconds 0-15, 45-60, 15-30 will result in only 2 ranges
        this.played.length;
        console.log('ended');
      }
    , "error": function (ev) {
        console.log('error');
      }
    , "loadeddata": function (ev) {
        console.log('loadeddata');
      }
    , "loadedmetadata": function (ev) {
        console.log('loadedmetadata');
      }
    , "loadstart": function (ev) {
        console.log('loadstart');
      }
    , "mozaudioavailable": function (ev) {
        console.log('mozaudioavailable');
      }
    , "pause": function (ev) {
        console.log('pause');
      }
    , "play": function (ev) {
        console.log('play');
      }
    , "playing": function (ev) {
        console.log('playing');
      }
    , "progress": function (ev) {
        // XXX
        // If the user were to skip to the
        // middle of a song and start playing
        // from there and the browser were smart
        // enough, it may load a second range
        var start = this.buffered.start(0)
          , end = this.buffered.end(0)
          , len = this.buffered.length
          ;
        
        console.log('progress --', end, ((end / this.duration) * 100).toFixed(2) + '%', len, this.webkitAudioDecodedByteCount);
      }
    , "ratechange": function (ev) {
        // XXX
        // this.playbackRate
        // this.webkitPreservesPitch = true
        // can be 0.5 ~ 4.0 in Chrome
        // although other values are allowed, they don't play any sound
        // maybe this is different when not preserving pitch
        console.log('ratechange');
      }
    , "seeked": function (ev) {
        console.log('seeked');
      }
    , "seeking": function (ev) {
        // this.seekable.length
        // this.seekable.start(0)
        // this.seekable.end(0)
        // XXX seeking will be followed by a lot
        // of progress events if the seek is outside
        // of the seekable range (which is probably the buffered)
        console.log('seeking');
      }
    , "suspend": function (ev) {
        var start = this.buffered.start(0)
          , end = this.buffered.end(0)
          ;
        
        console.log('suspend ---', end, ((end / this.duration) * 100).toFixed(2) + '%');
      }
    , "timeupdate": function (ev) {
        var time = this.currentTime
          ;
        
        console.log('timeupdate -', time, ((time / this.duration) * 100).toFixed(2) + '%');
      }
    , "volumechange": function (ev) {
        console.log('volumechange', this.volume, ((this.volume / 1) * 100).toFixed(0) + '%');
      }
    , "waiting": function (ev) {
        var self = this
          ;

        console.log('waiting');
        function forceError() {
          self.src = 'foo://bar';
        }
        setTimeout(forceError, 1000);
      }
  };


  function createAudioTester(currentTrack) {
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
  }

  module.exports = createAudioTester;
}());
