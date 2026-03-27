import { describe, it, expect } from "vitest";
import { cipherCore } from "../src/index";

describe("cipherCore basic", () => {
  it("encrypt/decrypt roundtrip (alpha, numeric key)", async () => {
    const text = "HelloWorld";
    const enc = await cipherCore.encrypt(text, 3, "alpha");
    const dec = await cipherCore.decrypt(enc.ciphertext, 3, "alpha");
    expect(dec.ciphertext).toBe(text);
  });

  it("encrypt/decrypt roundtrip (alpha, keyword key)", async () => {
    const text = "abcXYZ";
    const enc = await cipherCore.encrypt(text, "key", "alpha");
    const dec = await cipherCore.decrypt(enc.ciphertext, "key", "alpha");
    expect(dec.ciphertext).toBe(text);
  });
});
