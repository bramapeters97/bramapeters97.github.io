import { sampleId, sampleCaptions, sampleMedia, samplePage } from "../js/sampleVideo";
import styles from "../styles/VideoPlayerView.module.css";

export default function VideoPlayerView({ id, vidCon, playerRef, error, onSample }) {
  const sample = id === sampleId;
  return (
    <>
      <div className={styles.playerContainer + (!id ? " " + styles.hidden : "")}>
        <div className={styles.tooltip}>
          <p>Add a video by pasting a YouTube URL in the left sidebar.</p>
          <button type="button" onClick={onSample}>Try a sample lecture</button>
        </div>
        <div ref={playerRef} id="player" className={styles.player} style={sample ? { display: "none" } : undefined} />
        {sample && (
          <video className={styles.player} controls playsInline preload="metadata"
            poster="https://i.ytimg.com/vi/xAcTmDO6NTI/hqdefault.jpg" src={sampleMedia}
            ref={node => { vidCon.nativePlayer = node; }}
            onTimeUpdate={event => vidCon.updateTime(event.currentTarget.currentTime)}>
            <track kind="captions" src={sampleCaptions} srcLang="en" label="English" />
          </video>
        )}
      </div>
      {sample && <div className={styles.youtubeLink}>
        Ana Bell · <a href={samplePage} target="_blank" rel="noreferrer">MIT OpenCourseWare</a>
        {" · "}<a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer">CC BY-NC-SA</a>
        {" · "}<a href="https://www.youtube.com/watch?v=xAcTmDO6NTI&list=PLUl4u3cNGP62A-ynp6v6-LGBCzeH3VAQB" target="_blank" rel="noreferrer">YouTube</a>
      </div>}
      {id && !sample && (
        <div className={styles.youtubeLink}>
          {error && <span role="status">{error} </span>}
          <a href={"https://www.youtube.com/watch?v=" + id} target="_blank" rel="noopener noreferrer">Open on YouTube ↗</a>
        </div>
      )}
    </>
  );
}
