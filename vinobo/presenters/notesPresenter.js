import NotesView from "../views/notesView";
import React from "react";
import { makeStringSearchable, filterList } from "../js/search";
import useModelProperty from "../js/useModelProperty";
import pageStyles from "../styles/Home.module.css";

export default function NotesPresenter(props) {
  const currentVideo = useModelProperty(props.model, "currentVideo");
  const notes = useModelProperty(props.model, "getNotes");
  const [processedNotes, setProcessedNotes] = React.useState(null);

  React.useEffect(() => {
    setProcessedNotes(
      notes &&
        notes.map((note) => ({
          ...note,
          searchTitle: makeStringSearchable(note.title),
          searchContent: makeStringSearchable(note.content),
        }))
    );
  }, [notes]);

  const [query, setQuery] = React.useState("");
  const [words, setWords] = React.useState([]);
  React.useEffect(() => {
    setWords(makeStringSearchable(query).trim().split(/\s/).filter(Boolean));
  }, [query]);
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <NotesView
      currentVideo={currentVideo}
      notes={filterList(processedNotes, words, ["searchTitle", "searchContent"])}
      removeNote={(noteId) => props.model.removeNote(noteId)}
      onText={setQuery}
      selectTimestamp={(offset) => props.vidCon.seek(offset)}
      onCollapse={() => {
        const c = !collapsed;
        setCollapsed(c);
        props.parentRef?.current.classList.toggle(pageStyles.collapsed, c);
      }}
      collapsed={collapsed}
    />
  );
}
