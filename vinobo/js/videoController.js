import Observable from "./observable";

export default class VideoController extends Observable {
  POLL_INTERVAL = 1000 / 3; // ms between time polls to player

  constructor(elementId) {
    super();
    this.elementId = elementId;
    this.player = null;
    this.currentTime = 0;

    this.stopPolling = null;

    // dont ask
    this.partiallyInitialized = false;
    this.prioQueue = [];
    this.fullyInitialized = false;
    this.queue = [];
  }

  /**
   * Loads a new `Player` in the `this.elementId` element.
   * @param {String} id Optional video ID to load the player with.
   */
  loadPlayer(id) {
    try {
      this.player = new window.YT.Player(this.elementId, {
        videoId: id !== null ? id : undefined,
        playerVars: {
          playsinline: 1,
          modestbranding: 1, // hide YT logo in bottom right
          rel: 0, // show less random suggested videos
        },
        events: {
          onReady: (event) => this.onPlayerReady(event),
          onStateChange: (event) => this.onPlayerStateChange(event),
          onError: (error) => this.onPlayerError(error),
        },
      });
      window.player = player; // for debugging video
    } catch (error) {
      console.log("Player failed to load. Tell jonaro00 about this.");
      console.log(error);
    }
  }

  /**
   * The player will call this function when it is ready.
   */
  onPlayerReady(event) {
    if (!this.partiallyInitialized) {
      this.partiallyInitialized = true;
      for (let cb of this.prioQueue) {
        try {
          cb();
        } catch (error) {}
      }
    }
  }

  /**
   * The player calls this function when the it's state changes.
   */
  onPlayerStateChange(event) {
    // The first time the player state is reported as cued,
    // the controller marks itself as initialized.
    if (!this.fullyInitialized && event.data === 5 /* video cued */) {
      this.fullyInitialized = true;
      for (let cb of this.queue) {
        try {
          cb();
        } catch (error) {}
      }
      this.startPoller();
    }
    //this.notifyObservers();
  }

  /**
   * The player (should) call this function when there was an error.
   */
  onPlayerError(error) {
    console.log("player error:", error);
    switch (error.data) {
      case 2:
        // invalid ID
        break;
      case 100:
        // not found (removed or private)
        break;
      case 101:
      case 105:
        // The owner of the requested video does not allow it to be played in embedded players.
        break;
      default:
        // unknown error
        break;
    }
  }

  /**
   * Ensures callback `cb` is only executed if player is fully loaded.
   * Otherwise adds it to the queue to be executed when player is ready.
   * @param {Function} cb A callback that does something with the VideoController.
   */
  execute(cb) {
    if (!this.fullyInitialized) {
      this.queue = [...this.queue, cb];
    } else {
      cb();
    }
  }
  /**
   * Ensures callback `cb` is only executed if player is initialized.
   * Otherwise adds it to the queue to be executed when player is ready.
   * @param {Function} cb A callback that does something with the VideoController.
   */
  executePrio(cb) {
    if (!this.partiallyInitialized) {
      this.prioQueue = [...this.prioQueue, cb];
    } else {
      cb();
    }
  }

  /**
   * Changes the video in player.
   * Setting ID to `null` reloads and empty player.
   * @param {String} id Video ID to play.
   */
  setVideoID(id) {
    this.executePrio(() => {
      if (this.fullyInitialized) {
        if ((this.player.getVideoData()?.video_id || null) === id) return;
        if (!id) this.reload();
      }
      id !== null && this.player.cueVideoById(id);
      this.fullyInitialized = false;
    });
  }

  /**
   * Plays the video.
   */
  play() {
    this.execute(() => this.player.playVideo());
  }

  /**
   * Pauses the video.
   */
  pause() {
    this.execute(() => this.player.pauseVideo());
  }

  /**
   * Stops the video.
   */
  stop() {
    this.execute(() => this.player.stopVideo());
  }

  /**
   * Changes the current video time.
   * @param {Number} time The number of seconds from start to seek to.
   */
  seek(time) {
    this.execute(() => this.player.seekTo(time));
  }

  /**
   * Gets the data of the current video. Contains id, title, author, length, and more.
   * @returns {Object} The video data.
   */
  getVideoInfo() {
    return new Promise((resolve, reject) => {
      this.execute(() => {
        try {
          resolve({ ...this.player.getVideoData(), length: this.player.getDuration() });
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Starts polling timer. Sets `this.stopPolling` callback.
   */
  startPoller() {
    const timer = setInterval(() => this.pollTime(), this.POLL_INTERVAL);
    this.stopPolling = () => clearInterval(timer);
  }

  /**
   * Checks the current player time and notifies observers if it changed.
   */
  pollTime() {
    this.execute(() => {
      const prevTime = this.currentTime;
      try {
        this.currentTime = this.player.getCurrentTime();
      } catch (error) {
        this.currentTime = 0;
      }
      if (prevTime !== this.currentTime) {
        // has the current second changed?
        this.notifyObservers();
      }
    });
  }

  notifyObservers() {
    // extends parent's method
    this.execute(() => super.notifyObservers());
  }

  /**
   * Destroy player when Video player needs to unload.
   */
  destroy() {
    if (this.player !== null) {
      this.player.destroy();
      this.player = null;
    }
    if (this.stopPolling) this.stopPolling();
    this.currentTime = 0;
    this.partiallyInitialized = false;
    this.prioQueue = [];
    this.fullyInitialized = false;
    this.queue = [];
  }

  /**
   * Destroys current player and loads a new one.
   * @param {String} id Optional video ID to load the player with.
   */
  reload(id) {
    this.destroy();
    this.loadPlayer(id);
  }
}
