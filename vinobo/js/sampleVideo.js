import { Video } from "./model";

export const sampleId = "20SHvU2PKsM";
export const sampleMedia = "https://media.w3.org/wai/accessibility-intro/intro.mp4";
export const sampleCaptions = "/vinobo/sample/intro.vtt";

export function openSample(model) {
  model.addVideo(new Video(sampleId, "Introduction to Web Accessibility", "W3C WAI", 247));
  model.setCurrentVideo(sampleId);
}
