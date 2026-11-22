import React from "react";
import useModelProperty from "../js/useModelProperty";
import SidebarView from "../views/sidebarView";
import { extractID } from "../js/functions";
import { Video } from "../js/model";
import { openSample, sampleId } from "../js/sampleVideo";
import pageStyles from "../styles/Home.module.css";

export default function SidebarPresenter(props) {
  const [error, setError] = React.useState(null);
  const videos = useModelProperty(props.model, "videos");
  const model_id = useModelProperty(props.model, "currentVideo");
  const [collapsed, setCollapsed] = React.useState(false);
  const user = useModelProperty(props.model, "user");

  return (
    <SidebarView
      videos={videos}
      currentVideo={model_id}
      videoChoice={(ref) => {
        const id = extractID(ref);
        if (id) {
          props.model.setCurrentVideo(id);
          setError(null);
        } else {
          setError("No valid YouTube URL or ID found.");
        }
      }}
      addVideo={(ref) => {
        const id = extractID(ref);
        if (id === sampleId) {
          openSample(props.model);
          setError(null);
        } else if (id) {
          props.model.addVideo(new Video(id, id, "", 0));
          props.model.setCurrentVideo(id);
          setError(null);
          props.vidCon.getVideoInfo().then(info => {
            if (info.video_id !== id || !props.model.videos.some(video => video.id === id)) return;
            props.model.setVideos(props.model.videos.map(video => video.id === id
              ? { ...video, title: info.title || id, author: info.author || "", length: info.length || 0 }
              : video));
          }).catch(() => setError("Could not load the video details."));
        } else {
          setError("No valid YouTube URL or ID found.");
        }
      }}
      removeVideo={(id) => props.model.removeVideo(id)}
      error={error}
      onCollapse={() => {
        const c = !collapsed;
        setCollapsed(c);
        props.parentRef?.current.classList.toggle(pageStyles.collapsed, c);
      }}
      collapsed={collapsed}
      signedIn={user !== null}
    />
  );
}
