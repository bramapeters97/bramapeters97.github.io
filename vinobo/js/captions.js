// WebVTT and SRT both use timestamp pairs followed by one or more lines of text.
function milliseconds(stamp) {
  const parts = stamp.replace(",", ".").split(":");
  return Math.round(parts.reduce((seconds, part) => seconds * 60 + Number(part), 0) * 1000);
}

export function parseCaptions(source) {
  const rows = [];
  for (const block of source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split(/\n\s*\n/)) {
    const lines = block.split("\n");
    const timing = lines.findIndex(line => line.includes(" --> "));
    if (timing < 0) continue;
    const match = lines[timing].match(/^\s*((?:\d+:)?\d{2}:\d{2}[.,]\d{3})\s+-->\s+((?:\d+:)?\d{2}:\d{2}[.,]\d{3})(?:\s|$)/);
    if (!match) continue;
    const offset = milliseconds(match[1]);
    const duration = milliseconds(match[2]) - offset;
    const text = lines.slice(timing + 1).join(" ").replace(/<[^>]*>/g, "").trim();
    if (text && duration > 0) rows.push({ offset, duration, text });
  }
  if (!rows.length) throw new Error("No caption timestamps found");
  return rows.sort((a, b) => a.offset - b.offset);
}
