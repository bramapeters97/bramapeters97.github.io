import { auth, database } from "./firebaseSetup";
import { set, ref, onValue } from "firebase/database";

export default function persistModel(model) {
  let loadingFromFirebase = false;
  let writingToFirebase = false;
  const modelObserver = () => {
    // save the model into the cloud
    if (loadingFromFirebase) return; // flag that tells observer to NOT save to cloud
    writingToFirebase = true;
    set(ref(database, "users/" + auth.currentUser?.uid), {
      videos: model.videos,
      currentVideo: model.currentVideo,
    });
    writingToFirebase = false;
  };
  model.addPersistor(modelObserver);
  const unsubscribeFirebase = onValue(
    ref(database, "users/" + auth.currentUser?.uid),
    (snapshot) => {
      // load data from cloud into model if there is data
      if (writingToFirebase) return;
      loadingFromFirebase = true; // set the flag so we don't upload the model while downloading it.
      try {
        const data = snapshot.val();
        if (data) {
          model.setVideos(data.videos || []);
          model.setCurrentVideo(data.currentVideo || null);
        }
      } catch (e) {
        console.log(e);
      } finally {
        loadingFromFirebase = false; // unset the flag so the app can function as normal.
      }
    },
    (error) => {
      console.log(error);
    }
  );
  return () => {
    model.removePersistor(modelObserver);
    unsubscribeFirebase();
  };
}
