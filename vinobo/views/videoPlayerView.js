import { sampleId, sampleCaptions, sampleMedia } from "../js/sampleVideo";
import styles from "../styles/VideoPlayerView.module.css";

export default function VideoPlayerView({ id, vidCon, onSample }) {
  const sample = id === sampleId;
  return (
    <div className={styles.playerContainer + (!id ? " " + styles.hidden : "")}>
      <div className={styles.tooltip}>
        <p>Add a video by pasting a YouTube URL in the left sidebar.</p>
        <button type="button" onClick={onSample}>Try a sample lecture</button>
      </div>
      <div id="player" className={styles.player} style={sample ? { display: "none" } : undefined} />
      {sample && (
        <video className={styles.player} controls playsInline preload="metadata"
          poster="/vinobo/sample/intro.jpg" src={sampleMedia}
          ref={node => { vidCon.nativePlayer = node; }}
          onTimeUpdate={event => vidCon.updateTime(event.currentTarget.currentTime)}>
          <track kind="captions" src={sampleCaptions} srcLang="en" label="English" />
        </video>
      )}
    </div>
  );
}
