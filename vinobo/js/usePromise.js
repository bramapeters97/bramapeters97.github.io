import React from "react";

export default function usePromise(promise) {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState(null);
  React.useEffect(() => {
    // at promise change, reset data and error from previous promise results
    setData(null);
    setError(null);
    let cancelled = false;
    if (promise)
      promise
        .then((dt) => {
          if (!cancelled) setData(dt);
        })
        .catch((er) => {
          if (!cancelled) setError(er);
        });
    return () => {
      cancelled = true;
    };
  }, [promise]);
  return [data, error];
}
