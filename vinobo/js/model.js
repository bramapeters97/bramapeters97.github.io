import Observable from "./observable";
const { randomUUID } = import("crypto");

export default class Model extends Observable {
  constructor() {
    super();
    this.persistors = [];
    this.updatePersistors = true;

    this.user = null;

    this.currentVideo = null;
    this.videos = [];
  }
  setUser(user) {
    this.user = user;
    this.notifyObservers();
  }
  setCurrentVideo(id) {
    if (this.currentVideo === id) return;
    this.currentVideo = id;
    this.notifyObservers();
    this.notifyPersistors();
  }
  getVideo() {
    for (const vid of this.videos) if (vid.id === this.currentVideo) return { ...vid };
    return {};
  }
  setVideos(videos) {
    this.videos = [...videos].map((v) => {
      v.notes = v.notes || [];
      return v;
    });
    this.notifyObservers();
    this.notifyPersistors();
  }
  addVideo(videoObj) {
    // Only add if video is not already in list
    if (this.videos.map((obj) => obj.id).includes(videoObj.id)) return;
    this.videos = [...this.videos, videoObj];
    this.notifyObservers();
    this.notifyPersistors();
  }
  removeVideo(id) {
    let changed = false;
    this.videos = this.videos.filter((vid) => {
      if (vid.id !== id) {
        return true;
      } else {
        changed = true;
      }
    });
    if (id === this.currentVideo) this.setCurrentVideo(null);
    if (changed) {
      this.notifyObservers();
      this.notifyPersistors();
    }
  }
  getNotes() {
    for (const vid of this.videos) if (vid.id === this.currentVideo) return [...vid.notes];
    return [];
  }
  addNote(noteObj) {
    this.videos = this.videos.map((vid) => {
      if (this.currentVideo === vid.id)
        // insert and sort note
        vid.notes = [...vid.notes, noteObj].sort((a, b) =>
          a.offset < b.offset ? -1 : a.offset > b.offset ? 1 : 0
        );
      return vid;
    });
    this.notifyObservers();
    this.notifyPersistors();
  }
  removeNote(noteId) {
    let changed = false;
    this.videos = this.videos.map((vid) => {
      if (this.currentVideo === vid.id)
        // remove note
        vid.notes = vid.notes.filter((note) => {
          if (note.id !== noteId) {
            return true;
          } else {
            changed = true;
          }
        });
      return vid;
    });
    if (changed) {
      this.notifyObservers();
      this.notifyPersistors();
    }
  }
  clear() {
    // fired at sign out
    this.currentVideo = null;
    this.videos = [];
    this.notifyObservers();
  }
  addPersistor(callback) {
    this.persistors = [...this.persistors, callback];
  }
  removePersistor(callback) {
    this.persistors = this.persistors.filter((ob) => ob !== callback);
  }
  notifyPersistors() {
    if (!this.updatePersistors) return;
    this.persistors.forEach((cb) => {
      try {
        cb();
      } catch (error) {
        // prevent one observer error from stopping the other callbacks to happen
      }
    });
  }
}

export class Video {
  constructor(id, title, author, length) {
    this.id = id;
    this.title = title;
    this.author = author;
    this.length = length;
    this.notes = [];
  }
}

export class Note {
  constructor(offset, title, content) {
    this.id = randomUUID ? randomUUID() : crypto.randomUUID ? crypto.randomUUID() : "0";
    this.offset = offset;
    this.title = title;
    this.content = content;
  }
}
