(function () {
  "use strict";

  var timestep = 20
    , minVol = 0
    , maxVol = 1
    , volumeFixedPrecision = 3
    ;

  function sanitize(x) {
    return Number(x.toFixed(volumeFixedPrecision));
  }

  function fadeVolume(cb, audio, newVol, time, zeroed) {
    clearInterval(audio.mbVolumeStepToken);
    newVol = sanitize(newVol);
    var diff = sanitize(newVol - audio.volume)
      , numSteps = Math.floor(time / timestep) || 1
      , increment
      , fadeCompletesAt = Date.now()
      ;

    if (!(newVol <= maxVol && newVol >= minVol)) {
      console.error("bad new value for volume", newVol);
      cb && cb(new TypeError("bad new volume"));
      return;
    }
    // TODO check newVol is within minVol and maxVol
    if (zeroed) {
      if (diff >= 0) {
        diff = newVol - minVol;
      } else {
        diff = newVol - maxVol;
      }
    }

    // IEEE floating point bug
    increment = sanitize(diff / numSteps);

    function reFade() {
      var timeLeft = time - Math.max(0, (Date.now() - fadeCompletesAt))
        ;

      console.log('refading');
      fadeVolume(cb, audio, newVol, timeLeft, zeroed);
    }

    function stepVol() {
      if (
        !increment // === 0
        ||
        increment > 0 && audio.volume + increment >= newVol
        ||
        increment < 0 && audio.volume + increment <= newVol
      ) {
        console.log('reached target level');
        audio.volume = sanitize(newVol);
        clearInterval(audio.mbVolumeStepToken);
        cb && cb();
        return;
      } 
      audio.volume = sanitize(audio.volume + increment);
      audio.mbVolumeStepToken = setTimeout(reFade, timestep);
    }

    stepVol();
  }

  module.exports = fadeVolume;
}());
