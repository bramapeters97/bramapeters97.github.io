import NoteCard from "../components/noteCard";
import styles from "../styles/ControlView.module.css";

export default function ControlView(props) {
  return (
    <fieldset disabled={!props.currentVideo} className={styles.fieldform}>
      <form
        name="addNoteForm"
        onSubmit={(e) => {
          e.preventDefault();
          if (!addNoteForm["title"].value) {
            addNoteForm["title"].select();
          } else {
            props.addNote();
            addNoteForm.reset();
          }
        }}
        onReset={props.onReset}
        onKeyDown={(e) => {
          if (e.ctrlKey && e.key === "Enter") {
            if (!addNoteForm["title"].value) {
              addNoteForm["title"].select();
            } else {
              props.addNote(e);
              addNoteForm.reset();
            }
          }
        }}
      >
        <NoteCard
          extraStyle={{ padding: "10px" }}
          titleElement={
            <input
              className={styles.controlTitle}
              onChange={(e) => props.setTitle(e.target.value)}
              name="title"
              type="text"
              placeholder="Title"
              required
            />
          }
          timeElement={
            <input
              className={styles.controlTime}
              onChange={(e) => props.setTimestamp(e.target.value)}
              name="timestamp"
              type="text"
              placeholder={props.currentTime}
            />
          }
          content={
            <textarea
              className={styles.controlContent}
              onChange={(e) => props.setContent(e.target.value)}
              name="note"
              placeholder="Note"
            />
          }
          buttonsLeft={<input type="reset" value="Clear" />}
          buttonsRight={<input type="submit" value="Add Note" title="Ctrl + Enter" />}
        />
      </form>
    </fieldset>
  );
}
