(function () {
  var $ = require('ender')
    ;

  function loadTestPlayer() {
    function pad(s) {
      s = s.toString();
      while (s.length < 2) {
        s = "0" + s;
      }
      return s;
    }
    function toTime(floatSecs) {
      return Math.floor(floatSecs / 60) + ':' + pad(Math.round(floatSecs % 59) );
    }

    $('.mb-pause').hide();

    var a = $("<audio src='http://getmediabox.com:1232/api/files/5c5/5c58a7ca812b2d66e7982835c2e371d3.mp3'></audio>")[0];
    a.addEventListener('durationchange', function (ev) {
      console.log(ev);
      console.log(this);
      $('.mb-player .mb-max').text(this.duration);
    });
    a.addEventListener('timeupdate', function (ev) {
      $('.mb-player progress').attr('max', this.duration);
      $('.mb-player progress').attr('value', this.currentTime);

      $('.mb-player .mb-playtime-total').text(toTime(this.duration));
      $('.mb-player .mb-playtime-passed').text(toTime(this.duration - this.currentTime));
      $('.mb-player .mb-playtime').text(toTime(this.currentTime));
    });
    $('body').append(a);
    $('body').delegate('.mb-play', 'click', function (ev) {
      $('.mb-pause').show();
      $('.mb-play').hide();
      a.play();
    });
    $('body').delegate('.mb-pause', 'click', function (ev) {
      $('.mb-play').show();
      $('.mb-pause').hide();
      a.pause();
    });

    $('body').delegate('.mb-vol-down', 'click', function (ev) {
      if (a.volume > 0) {
        a.volume -= 0.1;
      }
    });
    $('body').delegate('.mb-vol-up', 'click', function (ev) {
      if (a.volume < 1) {
        a.volume += 0.1;
      }
    });
    $('body').delegate('.mb-pos-forward', 'click', function (ev) {
      if (a.currentTime < a.duration) {
        a.currentTime += 5;
      }
    });
    $('body').delegate('.mb-pos-back', 'click', function (ev) {
      if (a.currentTime > 0) {
        a.currentTime -= 5;
      }
    });
    $('body').delegate('.mb-vol-mute', 'click', function (ev) {
      a.muted = !a.muted;
    }); 

    // BUG XXX don't do this, duh
    global.testPlayerAudio = a;
  }

  $.domReady(loadTestPlayer);
}());
