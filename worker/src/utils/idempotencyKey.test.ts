import { getIdempotentKey } from "./getIdempotentKey";

describe("generateIdempotencyKey", () => {
  it("should generate a non-empty string", () => {
    const key = getIdempotentKey("test-note-id-1", new Date().toISOString());
    expect(typeof key).toBe("string");
    expect(key.length).toBeGreaterThan(0);
  });

  it("should generate unique keys on each call", () => {
    const key1 = getIdempotentKey("test-note-id-1", new Date().toISOString());
    const key2 = getIdempotentKey("test-note-id-2", new Date().toISOString());
    expect(key1).not.toBe(key2);
  });
});
