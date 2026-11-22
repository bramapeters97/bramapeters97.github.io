import { parseCaptions } from "./captions";
import { sampleCaptions, sampleId } from "./sampleVideo";

export default async function getTranscript(id) {
  const sample = id === sampleId;
  const url = sample ? sampleCaptions : `/vinobo/api/get_transcript?id=${encodeURIComponent(id)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Captions are unavailable");
  return sample ? parseCaptions(await response.text()) : response.json();
}
