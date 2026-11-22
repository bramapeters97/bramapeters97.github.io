import { Video } from "./model";

export const sampleId = "xAcTmDO6NTI";
export const samplePage = "https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/pages/lecture-1-introduction/";
export const sampleMedia = "https://ocw.mit.edu/courses/6-100l-introduction-to-cs-and-programming-using-python-fall-2022/6100l-lecture-1-version-2_360p_16_9.mp4";
export const sampleCaptions = "/vinobo/sample/mit-lecture-1.vtt";

export function openSample(model) {
  model.addVideo(new Video(sampleId, "Lecture 1: Introduction to CS and Programming Using Python", "MIT OpenCourseWare", 3810));
  model.setCurrentVideo(sampleId);
}
