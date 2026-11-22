import React from "react";
import { formatTimestamp } from "../js/functions";
import styles from "../styles/TranscriptView.module.css";
import Loader from "react-loader-spinner";


const SCROLL_TOP_OFFSET = 44;


export default function TranscriptView(props) {
  const [autoScroll, setAutoScroll] = React.useState(true);

  const scrollBox = React.useRef(null);
  const activeRow = React.useRef(null);

  React.useEffect(() => {
    setAutoScroll(true);
  }, [props.currentVideo]);

  React.useEffect(() => {
    const box = scrollBox.current;
    const row = activeRow.current;
    if (!autoScroll || !box || !row) return;
    const top = row.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
    const target = Math.max(0, top - SCROLL_TOP_OFFSET);
    if (Math.abs(box.scrollTop - target) > 2) box.scrollTop = target;
  }, [props.transcript, autoScroll]);

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
      <div ref={scrollBox} onWheel={() => setAutoScroll(false)} onTouchMove={() => setAutoScroll(false)} className={styles.transcripts}>
        {props.transcriptError ? (
          <div className={styles.error}>
            <p>{props.transcriptError.message || "Captions could not be loaded."} You can also open a caption file.</p>
            <input type="file" aria-label="Load captions" accept=".vtt,.srt"
              onChange={event => {
                const file = event.target.files[0];
                if (file) props.onCaptionFile(file);
                event.target.value = "";
              }} />
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
