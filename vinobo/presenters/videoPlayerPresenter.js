import React from "react";
import Script from "next/script";
import VideoPlayerView from "../views/videoPlayerView";
import useModelProperty from "../js/useModelProperty";

export default function VideoPlayerPresenter({ model, vidCon }) {
  const id = useModelProperty(model, "currentVideo");

  React.useEffect(() => {
    const load = () => vidCon.loadPlayer(model.currentVideo);
    if (window.YT?.Player) load();
    else window.onYouTubeIframeAPIReady = load;
    return () => {
      if (window.onYouTubeIframeAPIReady === load) delete window.onYouTubeIframeAPIReady;
      vidCon.destroy();
    };
  }, [model, vidCon]);

  React.useEffect(() => {
    vidCon.setVideoID(id);
  }, [id, vidCon]);

  return (
    <>
      <Script src="https://www.youtube.com/iframe_api" />
      <VideoPlayerView hidden={id === null} />
    </>
  );
}
