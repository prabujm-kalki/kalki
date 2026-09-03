import { describe, expect, it } from "vitest";
import { validateAuditMetadata } from "@/domains/audit/service";

describe("audit metadata boundary", () => {
  it("accepts an object", () => {
    const metadata = { source: "work-instance", state: "COMPLETED" };
    expect(validateAuditMetadata(metadata)).toEqual(metadata);
  });

  it("defaults missing metadata to an empty object", () => {
    expect(validateAuditMetadata(undefined)).toEqual({});
  });

  it("rejects arrays", () => {
    expect(() => validateAuditMetadata(["not-an-object"])).toThrow(
      "Audit metadata must be a JSON object",
    );
  });

  it("rejects scalar values", () => {
    expect(() => validateAuditMetadata("not-an-object")).toThrow(
      "Audit metadata must be a JSON object",
    );
  });

  it("rejects metadata above the bounded payload size", () => {
    expect(() => validateAuditMetadata({ value: "x".repeat(17_000) })).toThrow(
      "Audit metadata exceeds the 16 KB boundary",
    );
  });
});
