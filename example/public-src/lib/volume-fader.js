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
    console.log('[fadeVolume]');
    clearInterval(audio.mbVolumeStepToken);
    newVol = sanitize(newVol);
    var diff = sanitize(newVol - audio.volume)
      , numSteps = Math.floor(time / timestep) || 1
      , increment
      ;

    console.log('newVol:', newVol);
    console.log('diff:', diff);
    console.log('numSteps:', numSteps);

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

    function stepVol() {
      console.log('step vol', increment, audio.volume, newVol);
      if (
        !increment // === 0
        ||
        increment > 0 && audio.volume + increment >= newVol
        ||
        increment < 0 && audio.volume + increment <= newVol
      ) {
        audio.volume = sanitize(newVol);
        clearInterval(audio.mbVolumeStepToken);
        cb && cb();
        return;
      } 
      audio.volume = sanitize(audio.volume + increment);
    }

    audio.mbVolumeStepToken = setInterval(stepVol, timestep);
  }

  module.exports = fadeVolume;
}());
