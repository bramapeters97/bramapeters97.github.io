import React from "react";
import styles from "../styles/RegisterSuccess.module.css";
import RegisterSuccessView from "../views/registerSuccessView";

export default function RegisterSuccess() {
  return (
    <div className={styles.pageContent}>
      <div className={styles.registerSuccess}>
        <RegisterSuccessView />
      </div>
    </div>
  );
}
