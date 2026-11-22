import React from "react";
import styles from "../styles/Home.module.css";
import TestPresenter from "../presenters/testPresenter";
import VideoPlayerPresenter from "../presenters/videoPlayerPresenter";
import TranscriptPresenter from "../presenters/transcriptPresenter";
import SidebarPresenter from "../presenters/sidebarPresenter";
import NotesPresenter from "../presenters/notesPresenter";
import VideoController from "../js/videoController";
import ControlPresenter from "../presenters/controlPresenter";

const vidCon = new VideoController("player");

export default function Home({ model, auth }) {
  const notesContRef = React.useRef(null);
  const sidebarRef = React.useRef(null);
  return (
    <>
      <div className={styles.pageContent}>
        <div ref={sidebarRef} className={styles.sidebar}>
          <SidebarPresenter model={model} vidCon={vidCon} auth={auth} parentRef={sidebarRef} />
        </div>
        <div className={styles.videoAndControlsContainer}>
          <VideoPlayerPresenter model={model} vidCon={vidCon} />
          <div className={styles.transcriptAndControls}>
            <div className={styles.transcriptView}>
              <TranscriptPresenter model={model} vidCon={vidCon} />
            </div>
            <div className={styles.controlView}>
              <ControlPresenter model={model} vidCon={vidCon} />
            </div>
          </div>
        </div>
        <div ref={notesContRef} className={styles.notesContainer}>
          <NotesPresenter model={model} vidCon={vidCon} parentRef={notesContRef} />
        </div>
      </div>
      {/* <TestPresenter model={model} vidCon={vidCon} /> */}
    </>
  );
}
