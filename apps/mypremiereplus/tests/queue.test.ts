import test from "node:test";
import assert from "node:assert/strict";
import { generateQueue } from "../server/queue.js";
const videos = [
  { id: "a", title: "One", duration: 90 },
  { id: "b", title: "Two", duration: 4 },
  { id: "c", title: "Three", duration: 100 },
];
test("shuffle respects exclusions with final, unrounded boundaries", () => {
  const excluded = [
    { videoId: "a", start: 20.25, end: 60.75 },
    { videoId: "c", start: 0, end: 99 },
  ];
  const q = generateQueue(videos, [], {
    mode: "mix",
    minutes: 30,
    minSeconds: 2,
    maxSeconds: 4,
    excludedIntervals: excluded,
  });
  assert.ok(q.length > 2);
  for (const item of q) {
    assert.ok(item.end > item.start);
    assert.ok(item.end <= videos.find((v) => v.id === item.videoId)!.duration);
    assert.equal(
      excluded.some(
        (x) =>
          x.videoId === item.videoId &&
          item.start < x.end &&
          item.end > x.start,
      ),
      false,
    );
  }
});
test("favourite moments retain exact boundaries and exclusions", () => {
  const q = generateQueue(
    videos,
    [
      { id: "m", videoId: "a", title: "Exact", start: 2.2, end: 3.9 },
      { id: "n", videoId: "b", title: "Short", start: 0, end: 2 },
    ],
    { mode: "moments", minutes: 30, excludedMomentIds: ["m"] },
  );
  assert.ok(q.length);
  assert.ok(q.every((s) => s.momentId === "n" && s.start === 0 && s.end === 2));
});
test("short films yield valid excerpts, no immediate repeats, bounded session length", () => {
  const q = generateQueue(videos, [], { mode: "mix", minutes: 30 });
  assert.ok(q.some((s) => s.videoId === "b" && s.end - s.start <= 4));
  assert.ok(q.slice(1).every((s, i) => s.videoId !== q[i]!.videoId));
  const total = q.reduce((sum, v) => sum + v.end - v.start, 0);
  assert.ok(total >= 1800 && total <= 1890);
});
test("empty or fully excluded eligible content produces an honest empty queue", () => {
  assert.deepEqual(generateQueue([], [], { mode: "films", minutes: 30 }), []);
  assert.deepEqual(
    generateQueue(videos, [], { mode: "moments", minutes: 30 }),
    [],
  );
  assert.deepEqual(
    generateQueue([videos[0]!], [], {
      mode: "films",
      minutes: 30,
      excludedIntervals: [{ videoId: "a", start: 0, end: 90 }],
    }),
    [],
  );
});
