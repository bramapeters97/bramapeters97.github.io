import Head from "next/head";
import Script from "next/script";
import React from "react";
import "../styles/globals.css";
import Model, { Video, Note } from "../js/model";
import { auth } from "../js/firebaseSetup";
import { onAuthStateChanged } from "@firebase/auth";
import persistModel from "../js/persistModel";
import Layout from "../components/layout";

const model = new Model();

export default function App({ Component, pageProps }) {
  React.useEffect(() => {
    // for debugging
    window.model = model;
    window.Video = Video;
    window.Note = Note;
    window.auth = auth;
  }, []);

  React.useEffect(() => {
    let unsubscribePersistor = null;
    return onAuthStateChanged(
      auth,
      (user) => {
        // user is a `User` object or `null`
        if (!user || (user && model.user)) {
          // user logged out OR user changed, unsubscribe persistor and clear model
          if (unsubscribePersistor) {
            unsubscribePersistor();
            unsubscribePersistor = null;
          }
          model.clear();
        }
        model.setUser(user ? user.email : null);
        if (user) {
          // user logged in, initiate persistor
          unsubscribePersistor = persistModel(model);
        }
      },
      (error) => {},
      (completed) => {
        // teardown if App ever changes
        if (unsubscribePersistor) unsubscribePersistor();
      }
    );
  }, []);

  return (
    <div className="app">
      <Head>
        <title>Vinobo</title>
      </Head>
      <Script src="https://kit.fontawesome.com/067013981a.js" crossorigin="anonymous" />
      <Layout model={model} auth={auth}>
        <Component {...pageProps} model={model} auth={auth} />
      </Layout>
    </div>
  );
}
