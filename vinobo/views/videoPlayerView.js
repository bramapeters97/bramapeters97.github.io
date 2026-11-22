import styles from "../styles/VideoPlayerView.module.css";

export default function VideoPlayerView({ hidden }) {
  return (
    <div className={styles.playerContainer + (hidden ? " " + styles.hidden : "")}>
      <div className={styles.tooltip}>
        <i className={"fas fa-arrow-left"} style={{ padding: "5px" }} />
        Add a video by pasting a Youtube URL in the left sidebar.
      </div>
      <div id="player" className={styles.player}></div>
    </div>
  );
}
