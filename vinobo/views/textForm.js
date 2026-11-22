import React from "react";
import styles from "../styles/TextForm.module.css";

export default function TextForm({ placeholder, submitValue, onSubmit }) {
  const [value, setValue] = React.useState("");
  return (
    <form
      className={styles.textForm}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value);
        setValue("");
      }}
    >
      <input
        className={styles.textInput}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
      />
      <input className={styles.submitButton} type="submit" value={submitValue} />
    </form>
  );
}
