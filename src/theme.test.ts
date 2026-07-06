import { describe, expect, it } from "vitest";
import { getInitialTheme, normalizeTheme, type Theme } from "./theme";

describe("theme preferences", () => {
  it("accepts only supported themes", () => {
    expect(normalizeTheme("dark")).toBe("dark");
    expect(normalizeTheme("light")).toBe("light");
    expect(normalizeTheme("system")).toBeNull();
    expect(normalizeTheme(null)).toBeNull();
  });

  it("uses a saved theme before the system preference", () => {
    expect(getInitialTheme("light", true)).toBe<Theme>("light");
    expect(getInitialTheme("dark", false)).toBe<Theme>("dark");
  });

  it("falls back to the system preference when no saved theme exists", () => {
    expect(getInitialTheme(null, true)).toBe<Theme>("dark");
    expect(getInitialTheme(null, false)).toBe<Theme>("light");
  });
});
