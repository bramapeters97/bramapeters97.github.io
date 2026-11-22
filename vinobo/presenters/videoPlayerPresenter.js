import React from "react";
import VideoPlayerView from "../views/videoPlayerView";
import useModelProperty from "../js/useModelProperty";
import { sampleId, openSample } from "../js/sampleVideo";

export default function VideoPlayerPresenter({ model, vidCon }) {
  const id = useModelProperty(model, "currentVideo");
  const container = React.useRef(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    vidCon.updateTime(0);
    setError(null);
    if (!id || id === sampleId) return;

    function updateInfo(title, author, length) {
      const video = model.videos.find(video => video.id === id);
      if (!video || model.currentVideo !== id) return;
      const info = { title: title || video.title, author: author || video.author, length: length || video.length };
      if (video.title === info.title && video.author === info.author && video.length === info.length) return;
      model.setVideos(model.videos.map(item => item.id === id ? { ...item, ...info } : item));
    }

    const disconnect = vidCon.connect(container.current, id, updateInfo, setError);
    const request = new AbortController();
    const watch = "https://www.youtube.com/watch?v=" + id;
    fetch("https://www.youtube.com/oembed?" + new URLSearchParams({ url: watch, format: "json" }), { signal: request.signal })
      .then(response => response.ok ? response.json() : null)
      .then(info => { if (info && !request.signal.aborted) updateInfo(info.title, info.author_name); })
      .catch(() => {});
    return () => { request.abort(); disconnect(); };
  }, [id, model, vidCon]);

  return <VideoPlayerView id={id} vidCon={vidCon} playerRef={container} error={error} onSample={() => openSample(model)} />;
}
