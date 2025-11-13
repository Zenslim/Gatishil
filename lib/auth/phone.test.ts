import { describe, expect, it } from "vitest";

import { NEPAL_MOBILE, normalizeNepalMobile } from "./phone";

describe("normalizeNepalMobile", () => {
  it("accepts plain Nepal mobile numbers", () => {
    expect(normalizeNepalMobile("9812345678")).toBe("+9779812345678");
    expect(normalizeNepalMobile("9712345678")).toBe("+9779712345678");
    expect(normalizeNepalMobile("9612345678")).toBe("+9779612345678");
  });

  it("accepts +977 formatted inputs", () => {
    expect(normalizeNepalMobile("+9779812345678")).toBe("+9779812345678");
    expect(normalizeNepalMobile("+977-9712345678")).toBe("+9779712345678");
  });

  it("accepts 00-prefixed international format", () => {
    expect(normalizeNepalMobile("009779812345678")).toBe("+9779812345678");
    expect(normalizeNepalMobile("009779612345678")).toBe("+9779612345678");
  });

  it("rejects non-Nepal or malformed numbers", () => {
    expect(normalizeNepalMobile("12345")).toBeNull();
    expect(normalizeNepalMobile("+977551234567")).toBeNull();
    expect(normalizeNepalMobile("++9779812345678")).toBeNull();
  });
});

describe("NEPAL_MOBILE regex", () => {
  const samples = ["+9779612345678", "+9779712345678", "+9779812345678"];

  it("matches expected E.164 numbers", () => {
    for (const sample of samples) {
      expect(sample).toMatch(NEPAL_MOBILE);
    }
  });

  it("rejects unexpected numbers", () => {
    expect("+977551234567").not.toMatch(NEPAL_MOBILE);
    expect("+977961234567").not.toMatch(NEPAL_MOBILE);
  });
});
