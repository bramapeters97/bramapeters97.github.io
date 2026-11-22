import React from "react";

function TestView({ id, time, title }) {
  return (
    <p>
      This is TestView. Current video ID is {id}. Current time is {time}s. Video title is{" "}
      <b>{title}</b>.
    </p>
  );
}

export default React.memo(TestView);
