import { describe, expect, it } from "vitest";
import { useManualReferenceInputs } from "./builderMode";

describe("builder mode helpers", () => {
  it("uses manual reference inputs in generator mode", () => {
    expect(useManualReferenceInputs("generator")).toBe(true);
    expect(useManualReferenceInputs("manager")).toBe(false);
  });
});
