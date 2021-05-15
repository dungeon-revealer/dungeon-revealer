import { Howler, Howl } from "howler";

//
// On mobile browsers audio playback must be triggered through a user interaction
// We play an "empty" sound on the first click event

export const registerSoundPlayback = () => {
  window.addEventListener(
    "click",
    () => {
      var sound = new Howl({
        src: "data:audio/mp3;base64,SUQzAwAAAAAAFgAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4xjAAAAAAlwAAAAAtASxAAAACAAATQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4xjAMQAAAlwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/4xjAbAAAAlwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
      });
      sound.play();
    },
    { once: true }
  );
};
