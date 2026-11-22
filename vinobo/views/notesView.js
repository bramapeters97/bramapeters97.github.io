import React from "react";
import NoteCard from "../components/noteCard";
import { formatTimestamp } from "../js/functions";
import styles from "../styles/NotesView.module.css";

export default function NotesView(props) {
  return (
    <fieldset disabled={!props.currentVideo} className={styles.fieldform}>
      <div className={styles.header}>
        <a onClick={props.onCollapse} className={"btn"}>
          {<i className={"fas " + (props.collapsed ? "fa-chevron-left" : "fa-chevron-right")} />}
        </a>
        {props.collapsed || (
          <>
            <div className={styles.title}>My Notes</div>
            <input
              type="search"
              onInput={(e) => props.onText(e.target.value)}
              placeholder="Filter notes..."
              disabled={!props.currentVideo}
            ></input>
          </>
        )}
      </div>
      {props.collapsed || (
        <div className={styles.cards}>
          {props.notes && props.notes.length > 0 ? (
            [...props.notes].map((note) => (
              <NoteCard
                key={note.id}
                extraStyle={{ padding: "8px" }}
                titleElement={<div className={styles.noteTitle}>{note.title}</div>}
                timeElement={
                  <div
                    className={styles.cardTime}
                    onClick={() => props.selectTimestamp(note.offset)}
                  >
                    <div>{formatTimestamp(note.offset)}</div>
                  </div>
                }
                content={note.content?.trim() ? <div>{note.content}</div> : false}
                buttonsRight={
                  <>
                    <button className={"redHover"} onClick={() => props.removeNote(note.id)}>
                      <i className={"fas fa-trash-alt"} /> Delete
                    </button>
                  </>
                }
              />
            ))
          ) : (
            <div className={styles.content}>
              You have no saved notes yet. Add notes below the video, and they will appear here.
            </div>
          )}
        </div>
      )}
    </fieldset>
  );
}
