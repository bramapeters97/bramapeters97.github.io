import React from "react";
import ControlView from "../views/controlView";
import useModelProperty from "../js/useModelProperty";
import { formatTimestamp, parseTimestamp } from "../js/functions";
import { Note } from "../js/model";

export default function ControlPresenter(props) {
  const videoTime = useModelProperty(props.vidCon, "currentTime");
  const currentVideo = useModelProperty(props.model, "currentVideo");
  const [title, setTitle] = React.useState("");
  const [timestamp, setTimestamp] = React.useState("");
  const [content, setContent] = React.useState("");
  const [timePlaceholder, setTimeplaceholder] = React.useState("");

  // Update placeholder while the user hasn't typed anything
  React.useEffect(() => {
    if (!title && !content) setTimeplaceholder(videoTime | 0);
  }, [videoTime]);

  function formReset() {
    setTitle("");
    setTimestamp("");
    setContent("");
  }

  return (
    <ControlView
      currentTime={formatTimestamp(timePlaceholder)}
      currentVideo={currentVideo}
      addNote={() => {
        props.model.addNote(new Note(parseTimestamp(timestamp) || timePlaceholder, title, content));
        formReset();
      }}
      setTitle={setTitle}
      setTimestamp={setTimestamp}
      setContent={setContent}
      onReset={formReset}
    />
  );
}
