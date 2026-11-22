import React from "react";
import { extractID } from "../js/functions";
import styles from "../styles/TextForm.module.css";

export default function TextForm({ placeholder, submitValue, onSubmit }) {
  const [value, setValue] = React.useState("");
  return (
    <form
      className={styles.textForm}
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        onSubmit(value);
        setValue("");
      }}
    >
      <input
        className={styles.textInput}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onPaste={event => {
          const input = event.currentTarget;
          const pasted = event.clipboardData.getData("text/plain");
          const next = value.slice(0, input.selectionStart) + pasted + value.slice(input.selectionEnd);
          if (!extractID(next)) return;
          event.preventDefault();
          onSubmit(next);
          setValue("");
        }}
        placeholder={placeholder}
      />
      <input className={styles.submitButton} type="submit" value={submitValue} />
    </form>
  );
}
