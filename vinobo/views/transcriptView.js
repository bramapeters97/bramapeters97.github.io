import React from "react";
import { formatTimestamp } from "../js/functions";
import styles from "../styles/TranscriptView.module.css";
import Loader from "react-loader-spinner";
import useEventListener from "../js/useEventListener";

const SCROLL_TOP_OFFSET = 44;
const UNLOCK_SCROLL_HEIGHT = SCROLL_TOP_OFFSET + 50;

export default function TranscriptView(props) {
  const [autoScroll, setAutoScroll] = React.useState(true);

  const scrollBox = React.useRef(null);
  const activeRow = React.useRef(null);

  // auto scroll when enabled
  React.useEffect(() => {
    if (!autoScroll || !activeRow.current || !scrollBox.current) return;

    const target = activeRow.current.offsetTop - SCROLL_TOP_OFFSET;
    if (scrollBox.current.scrollTop === target) return;

    if (
      Math.abs(scrollBox.current.scrollTop - activeRow.current.offsetTop) >= UNLOCK_SCROLL_HEIGHT
    ) {
      scrollBox.current.style.scrollBehavior = "auto";
      scrollBox.current.scroll(0, target);
      scrollBox.current.style.scrollBehavior = "smooth";
    } else {
      scrollBox.current.scroll(0, target);
    }
  }, [props.videoTime, autoScroll]);

  // check when scrolling happens to see if user wants to "break" the auto scroll
  useEventListener(
    "scroll",
    () => {
      if (!autoScroll || !activeRow.current) return;
      if (
        Math.abs(scrollBox.current.scrollTop - activeRow.current.offsetTop) >= UNLOCK_SCROLL_HEIGHT
      )
        setAutoScroll(false);
    },
    scrollBox.current
  );

  return (
    <div className={styles.container}>
      <div className={styles.search}>
        <fieldset disabled={!props.currentVideo} className={styles.fieldform}>
          <input
            type="search"
            onInput={(e) => props.onText(e.target.value)}
            placeholder={
              props.currentVideo
                ? "Search in transcript..."
                : "Load video first to show transcript..."
            }
            disabled={!!(props.transcriptError || !props.transcript)}
          ></input>
        </fieldset>
      </div>
      <div ref={scrollBox} className={styles.transcripts}>
        {props.transcriptError ? (
          <div className={styles.error}>
            Failed to get transcript.
            <br />
            Either the video has no transcript, or it has been disabled, or something went wrong on
            our end.
          </div>
        ) : props.transcript ? (
          <>
            {[...props.transcript].map((row) => (
              <div
                key={row.offset}
                className={styles.transcriptRow + (row.highlighted ? " " + styles.highlighted : "")}
                onClick={() => props.selectTimestamp(row.offset)}
              >
                <div
                  ref={row.highlighted ? activeRow : null}
                  className={styles.transcriptTime}
                  title={`Go to ${formatTimestamp((row.offset / 1000) | 0)} in video`}
                >
                  <div>{formatTimestamp((row.offset / 1000) | 0)}</div>
                </div>
                <div>{row.text}</div>
              </div>
            ))}
            {!autoScroll && (
              <a className={"btn " + styles.autoScrollBtn} onClick={() => setAutoScroll(true)}>
                Sync to video
              </a>
            )}
          </>
        ) : props.transcriptPromise ? (
          <div className={styles.spinner}>
            <Loader type="Puff" color="#9fc5e8" height={60} width={60} />
          </div>
        ) : (
          false /* No transcript due to no video selected */
        )}
      </div>
    </div>
  );
}
