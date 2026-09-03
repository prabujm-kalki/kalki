import { describe, expect, it } from "vitest";
import { validateEvidenceMetadata } from "@/domains/evidence/service";

const validMetadata = {
  note: "Observed and captured during the work execution",
  reference: "LOCAL-TEST-001",
};

describe("evidence metadata boundary", () => {
  it("accepts a JSON object", () => {
    expect(validateEvidenceMetadata(validMetadata)).toEqual(validMetadata);
  });

  it("treats missing metadata as an empty object", () => {
    expect(validateEvidenceMetadata(undefined)).toEqual({});
  });

  it("rejects arrays", () => {
    expect(() => validateEvidenceMetadata(["not-an-object"])).toThrow(
      "Evidence metadata must be a JSON object",
    );
  });

  it("rejects scalar values", () => {
    expect(() => validateEvidenceMetadata("not-json-object")).toThrow(
      "Evidence metadata must be a JSON object",
    );
  });

  it("rejects metadata above the bounded payload size", () => {
    expect(() => validateEvidenceMetadata({ value: "x".repeat(17_000) })).toThrow(
      "Evidence metadata exceeds the 16 KB boundary",
    );
  });
});
