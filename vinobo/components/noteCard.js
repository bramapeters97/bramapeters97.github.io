import styles from "../styles/NoteCard.module.css";

export default function NoteCard({
  titleElement,
  timeElement,
  content,
  buttonsLeft,
  buttonsRight,
  extraStyle,
}) {
  return (
    <div className={styles.noteCard} style={extraStyle}>
      <div className={styles.noteInfo}>
        {titleElement}
        {timeElement}
      </div>
      {content ? <div className={styles.content}>{content}</div> : false}
      <div className={styles.buttons}>
        <div>{buttonsLeft}</div>
        <div>{buttonsRight}</div>
      </div>
    </div>
  );
}
