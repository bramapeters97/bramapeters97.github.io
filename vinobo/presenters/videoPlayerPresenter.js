import React from "react";
import Script from "next/script";
import VideoPlayerView from "../views/videoPlayerView";
import useModelProperty from "../js/useModelProperty";

import { sampleId, openSample } from "../js/sampleVideo";

export default function VideoPlayerPresenter({ model, vidCon }) {
  const id = useModelProperty(model, "currentVideo");

  React.useEffect(() => {
    let selected = model.currentVideo;
    const load = () => {
      vidCon.loadPlayer(null);
      if (model.currentVideo !== sampleId) vidCon.setVideoID(model.currentVideo);
    };
    // Cue synchronously so the sidebar reads metadata for the selected video.
    const select = () => {
      if (selected === model.currentVideo) return;
      selected = model.currentVideo;
      if (selected === sampleId) {
        vidCon.player?.pauseVideo?.();
        vidCon.updateTime(0);
      } else {
        vidCon.setVideoID(selected);
      }
    };
    model.addObserver(select);
    if (window.YT?.Player) load();
    else window.onYouTubeIframeAPIReady = load;
    return () => {
      model.removeObserver(select);
      if (window.onYouTubeIframeAPIReady === load) delete window.onYouTubeIframeAPIReady;
      vidCon.destroy();
    };
  }, [model, vidCon]);

  return (
    <>
      {id && id !== sampleId && <Script src="https://www.youtube.com/iframe_api" />}
      <VideoPlayerView id={id} vidCon={vidCon} onSample={() => openSample(model)} />
    </>
  );
}
