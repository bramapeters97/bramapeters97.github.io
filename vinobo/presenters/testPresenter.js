import TestView from "../views/testView";
import useModelProperty from "../js/useModelProperty";
import usePromise from "../js/usePromise";
import React from "react";

function TestPresenter(props) {
  const id = useModelProperty(props.model, "currentVideo");
  const videoTime = useModelProperty(props.vidCon, "currentTime");

  const [promise, setPromise] = React.useState(null);
  React.useEffect(() => setPromise(props.vidCon.getVideoInfo()), [id]);
  const [data, error] = usePromise(promise);

  return (
    <TestView
      id={id}
      time={videoTime | 0}
      title={error ? "ERROR!" : data ? data.title : "loading..."}
    />
  );
}

export default TestPresenter;
