jsplayer is very minimalistic. It simply abstracts the crazy parts of the audio API and provides the nicities that you're used to with other audio applications:

  * volume fades in and out
  * crossfade between tracks

Controls
===

play(trackMeta)
---

This destroys the enqued track, and fades out the current track as soon as the new track is ready.

resume()
---

This will resume a track which has been paused and quickly fade in the volume.
If two tracks were crossfading, it will not resume the fading track.

Note:
There's a bug in Chrome which causes tracks to "click" and "pop" when resumed after pause.
JSPlayer corrects for this by seeking back 1.5 seconds, playing the track muted,
and then fading in the volume 750ms later, after the "pop".
In very very rare cases, the "pop" may happen after 750ms.

pause()
---

This will quickly fade out the volume and then pause the player.

If the player is in the middle of a crossfade,
it immediately destroys the fade-out track.

mute()
---

This will fade out the volume very quickly.

If the player is in the middle of a crossfade,
it immediately destroys the fade-out track.

next()
---

This will fade out the current track and then fade in the enqueued track.

In the enqueued track is not ready, it will continue to play the current track until it is.

This will not crossfade.

If a crossfade is in progress, this will fade out the first track very quickly,
promote the enqued track to the current track, emit `next` to enque the next track,
and then promote that track to the current track when ready.

Note:
The reason that `mute()` fades out quicker is because mute is
commonly used to "bleep" out explicit content.

enque(trackMeta)
---

This will **replace** whichever track in in the queue with the track

`trackMeta` must either have `audio` or `href`.

volume([vol])
---

Returns or the "normal" player volume or gracefully set the normal volume.

During a fade this will report (or set) the normal volume, not the current fade volume.

seek()
---

Moves forwards or backwards in the track.

If a crossfade is in progress it will be cancelled, 
Cancels crossfade,

Events
===

Events fire when the action has started, rather than when the action completes.

The reason for this is to simplify the user interface for naïve implementations.

I can be argued into adding events such as `fooend`,
but they would likely do more harm than good.

What happens if the user hits a toggle (which mute/unmute and play/pause commonly are),
realizes that it was a mistake
and immediately hits it again?

The event would be "cancelled" and never fire the `fooend` event.

mute
---

Fired when `mute` is called and `fadeVolume` starts.


Goals
===

lead-in / lead-out correction
---
Often tracks of obscene amounts of lead-in or lead-out time.

If the meta object has `start_at` and or `end_at`
then the player should `seek(start_at)` on `play()`
and adjust the duration to be `end_at - start_at`

play(ms) / pause(ms) / mute(ms)
---

In should be painless to adjust the fade in / out time
so that people don't misguidedly try to do it on their own.

bleep([ [start_at, end_at] ])
---

It should be painless to "bleep" a track (by way of mute)

sources
---

There should be a mechanism for selecting the best sources for a file (mp3 vs m4a vs ogg vs webm)

graceful seeks
---

WWAD? (what would apple do)?

probably should lower the volume and increase the playbackrate (on webkit where it preserves pitch) while seeking.

seeking backwards on a crossfade should go to the previous track.

ISSUES
===

* don't change real volume when track is muted / paused, it's already reset to 0 and changed on unmute / resume
* wait for raw play event before fading in
* fade out before buffering
