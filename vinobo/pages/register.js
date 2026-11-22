import React from "react";
import styles from "../styles/Signin.module.css";
import SigninPresenter from "../presenters/signinPresenter";

export default function Register({ model, auth }) {
  return (
    <div className={styles.pageContent}>
      <div className={styles.signin}>
        <SigninPresenter model={model} auth={auth} register={true} />
      </div>
    </div>
  );
}
