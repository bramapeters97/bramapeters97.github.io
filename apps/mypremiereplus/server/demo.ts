/** Optional original sample fallback. Approved stock sources are in demo-media.ts. */
export const DEMO_STREAM_ID = "550d45ca5743a2f43fd0f6db8dfa2f98";
export const DEMO_STREAM_HOST =
  "customer-7c4f4yyof6wqvjv2.cloudflarestream.com";
export const DEMO_STREAM_URL = `https://${DEMO_STREAM_HOST}/${DEMO_STREAM_ID}/manifest/video.m3u8`;
// Verified against the supplied HLS variant playlist: a single four-second segment.
export const DEMO_DURATION = 4;
export const DEMO_PASSWORD = "premiere-demo";
export const DEMO_TITLES = [
  ["Summer by the Lake", 2007, "Holidays", "Lake district", "summer", "lake"],
  ["Our First Holiday", 1998, "Holidays", "Coast", "holiday", "coast"],
  ["The Family Reunion", 2012, "Celebrations", "Garden", "reunion", "garden"],
  [
    "Across the Mountains",
    2019,
    "Holidays",
    "Mountains",
    "journey",
    "mountains",
  ],
  [
    "A Very Special Day",
    2022,
    "Celebrations",
    "Countryside",
    "celebration",
    "garden",
  ],
  ["Christmas Together", 2004, "Traditions", "Home", "winter", "winter"],
  ["Our First Home", 1995, "Everyday", "Home", "home", "lake"],
  ["The Road Trip", 2016, "Holidays", "Open road", "journey", "mountains"],
] as const;
