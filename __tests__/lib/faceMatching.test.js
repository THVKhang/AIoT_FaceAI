import {
  euclideanDistance,
  findBestMatch,
  getMatchThreshold,
  matchVectors,
  normalizeVectors,
} from "../../app/lib/faceMatching";

const vec = (fill, len = 4) => Array.from({ length: len }, () => fill);

describe("normalizeVectors", () => {
  it("handles single vectors, multi vectors, object maps and JSON strings", () => {
    expect(normalizeVectors([1, 2])).toEqual([[1, 2]]);
    expect(normalizeVectors([[1, 2], [3, 4]])).toEqual([[1, 2], [3, 4]]);
    expect(normalizeVectors({ 0: 1, 1: 2 })).toEqual([[1, 2]]);
    expect(normalizeVectors([{ 0: 1, 1: 2 }])).toEqual([[1, 2]]);
    expect(normalizeVectors("[[1,2]]")).toEqual([[1, 2]]);
  });

  it("drops invalid data", () => {
    expect(normalizeVectors("not json")).toEqual([]);
    expect(normalizeVectors(null)).toEqual([]);
    expect(normalizeVectors([])).toEqual([]);
    expect(normalizeVectors([["a", "b"], [1, 2]])).toEqual([[1, 2]]);
  });
});

describe("matching", () => {
  it("computes euclidean distance", () => {
    expect(euclideanDistance([0, 0], [3, 4])).toBe(5);
  });

  it("uses the closest of several stored vectors and ignores length mismatches", () => {
    const stored = [vec(1), vec(0.1), [0, 0]];
    expect(matchVectors(vec(0), stored)).toBeCloseTo(0.2);
    expect(matchVectors(vec(0), [[0, 0]])).toBe(Infinity);
  });

  it("findBestMatch returns the closest user under the threshold", () => {
    const users = [
      { id: 1, name: "A", face_vector: vec(0.3) },
      { id: 2, name: "B", face_vector: JSON.stringify([vec(5), vec(0.1)]) },
    ];
    const result = findBestMatch(vec(0), users, 0.85);
    expect(result.match.id).toBe(2);
    expect(result.distance).toBeCloseTo(0.2);
  });

  it("findBestMatch reports no match (and finite bestDistance) when above threshold", () => {
    const result = findBestMatch(vec(0), [{ id: 1, face_vector: vec(1) }], 0.5);
    expect(result.match).toBeNull();
    expect(result.distance).toBeNull();
    expect(result.bestDistance).toBe(2);
  });

  it("findBestMatch returns null bestDistance when nobody is registered", () => {
    expect(findBestMatch(vec(0), [], 0.5).bestDistance).toBeNull();
  });

  it("reads the threshold from FACE_MATCH_THRESHOLD", () => {
    const original = process.env.FACE_MATCH_THRESHOLD;
    process.env.FACE_MATCH_THRESHOLD = "0.5";
    expect(getMatchThreshold()).toBe(0.5);
    process.env.FACE_MATCH_THRESHOLD = "garbage";
    expect(getMatchThreshold()).toBe(0.85);
    process.env.FACE_MATCH_THRESHOLD = original;
  });
});
