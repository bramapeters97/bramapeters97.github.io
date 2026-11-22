import React from "react";
import useModelProperty from "../js/useModelProperty";
import SidebarView from "../views/sidebarView";
import { extractID } from "../js/functions";
import { Video } from "../js/model";
import pageStyles from "../styles/Home.module.css";

export default function SidebarPresenter(props) {
  const [error, setError] = React.useState(null);
  const videos = useModelProperty(props.model, "videos");
  const model_id = useModelProperty(props.model, "currentVideo");
  const [loading, setLoading] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const user = useModelProperty(props.model, "user");

  return (
    <SidebarView
      loadingVideos={loading}
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
        if (id) {
          props.model.setCurrentVideo(id);
          setLoading(true);
          props.vidCon
            .getVideoInfo()
            .then((info) => {
              props.model.addVideo(new Video(id, info.title, info.author, info.length));
              setError(null);
            })
            .catch((error) => setError("Failed to add video."))
            .finally(() => setLoading(false));
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
