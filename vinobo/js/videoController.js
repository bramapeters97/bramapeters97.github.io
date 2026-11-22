import Observable from "./observable";

let iframeAPI;

function loadIframeAPI() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!iframeAPI) {
    iframeAPI = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      window.onYouTubeIframeAPIReady = () => resolve(window.YT);
      script.src = "https://www.youtube.com/iframe_api";
      script.onerror = () => {
        script.remove();
        iframeAPI = null;
        reject(new Error("YouTube playback controls could not connect."));
      };
      document.head.appendChild(script);
    });
  }
  return iframeAPI;
}

export default class VideoController extends Observable {
  currentTime = 0;
  nativePlayer = null;
  player = null;
  pendingTime = null;

  connect(container, id, onInfo, onError) {
    const frame = document.createElement("iframe");
    const url = new URL("https://www.youtube.com/embed/" + id);
    url.search = new URLSearchParams({ enablejsapi: "1", origin: window.location.origin, playsinline: "1", rel: "0" });
    frame.title = "YouTube video player";
    frame.allow = "autoplay; encrypted-media; fullscreen; picture-in-picture";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.width = "100%";
    frame.height = "100%";
    frame.style.border = "0";
    frame.src = url.href;
    container.replaceChildren(frame);

    let active = true;
    let widget;
    let timer;
    const readInfo = player => {
      if (!active) return;
      const info = player.getVideoData?.();
      if (info?.video_id === id) onInfo(info.title, info.author, player.getDuration?.());
    };
    loadIframeAPI().then(YT => {
      if (!active) return;
      widget = new YT.Player(frame, { events: {
        onReady: event => {
          if (!active) return;
          this.player = event.target;
          if (this.pendingTime !== null) this.seek(this.pendingTime);
          readInfo(event.target);
          timer = window.setInterval(() => this.updateTime(event.target.getCurrentTime() || 0), 300);
        },
        onStateChange: event => readInfo(event.target),
        onError: event => {
          if (!active) return;
          const messages = {
            2: "YouTube could not recognize this video.",
            100: "This video is private or has been removed.",
            101: "The owner only allows playback on YouTube.",
            150: "The owner only allows playback on YouTube.",
            153: "YouTube could not identify this website for playback."
          };
          onError(messages[event.data] || "YouTube could not play this video here.");
        }
      }});
    }).catch(() => {
      if (active) onError("YouTube playback controls could not connect.");
    });
    return () => {
      active = false;
      window.clearInterval(timer);
      this.player = null;
      this.pendingTime = null;
      widget?.destroy();
      container.replaceChildren();
    };
  }

  seek(time) {
    if (this.nativePlayer) this.nativePlayer.currentTime = time;
    else if (this.player) this.player.seekTo(time, true);
    else this.pendingTime = time;
    if (this.nativePlayer || this.player) {
      this.pendingTime = null;
      this.updateTime(time);
    }
  }

  getVideoInfo() {
    const data = this.player?.getVideoData?.() || {};
    return Promise.resolve({ ...data, length: this.player?.getDuration?.() || 0 });
  }

  updateTime(time) {
    if (this.currentTime === time) return;
    this.currentTime = time;
    this.notifyObservers();
  }
}
