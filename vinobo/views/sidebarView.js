import TextForm from "./textForm.js";
import styles from "../styles/SidebarView.module.css";
import { formatTimestamp } from "../js/functions.js";
import Loader from "react-loader-spinner";

export default function SidebarView(props) {
  return (
    <>
      <div className={styles.header}>
        {props.collapsed || <div className={styles.title}>My Videos</div>}
        <a onClick={props.onCollapse} className={"btn"}>
          {<i className={"fas " + (!props.collapsed ? "fa-chevron-left" : "fa-chevron-right")} />}
        </a>
      </div>
      {props.collapsed || (
        <>
          <TextForm
            onSubmit={(ref) => props.addVideo(ref)}
            placeholder="Paste YouTube URL..."
            submitValue="Add"
            autoFocus
          ></TextForm>
          {props.error && <div className={styles.addError}>{props.error}</div>}
          <div className={styles.videos}>
            {props.loadingVideos ? (
              <Loader type="Rings" color="#9fc5e8" height={60} width={60} />
            ) : props.videos.length ? (
              [...props.videos].map((video) => (
                <div
                  key={video.id}
                  className={`${styles.videoCard} ${
                    props.currentVideo === video.id ? styles.highlighted : ""
                  }`}
                >
                  <a
                    className={"btn " + styles.videoBtn}
                    onClick={(event) => {
                      event.preventDefault();
                      props.videoChoice(video.id);
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className={styles.videoImg}
                      src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                      alt=""
                    />
                    <div className={styles.videoInfo}>
                      <div className={styles.videoTitle}>
                        {video.title.length ? video.title : <i>[unknown]</i>}
                      </div>
                      <div className={styles.videoDetails}>
                        <div>
                          <i className={"far fa-sticky-note"} /> {video.notes?.length || 0} notes
                        </div>
                        <div>
                          {formatTimestamp(video.length)} <i className={"far fa-clock"} />
                        </div>
                      </div>
                    </div>
                  </a>
                  <div>
                    <button className={"redHover"} onClick={() => props.removeVideo(video.id)}>
                      <i className={"fas fa-trash-alt"} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              false
            )}
          </div>
          {!props.signedIn && (
            <div className={styles.altText}>
              <i className={"fas fa-exclamation-triangle"} /> You are not signed in, so the videos
              and notes that you add won{"'"}t be saved. Still, you are very welcome to try using
              Vinobo!
            </div>
          )}
        </>
      )}
    </>
  );
}
