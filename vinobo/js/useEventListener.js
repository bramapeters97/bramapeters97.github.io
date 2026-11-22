import React from "react";

export default function useEventListener(eventType, callback, element = window) {
  const callbackRef = React.useRef(callback);

  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  React.useEffect(() => {
    const obs = (e) => callbackRef.current(e);
    if (element) element.addEventListener(eventType, obs);
    return () => {
      if (element) element.removeEventListener(eventType, obs);
    };
  }, [eventType, element]);
}
