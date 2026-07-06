export type Theme = "light" | "dark";

export const themeStorageKey = "ingress-manager-theme";

export function normalizeTheme(value: string | null): Theme | null {
  return value === "light" || value === "dark" ? value : null;
}

export function getInitialTheme(savedTheme: string | null, prefersDark: boolean): Theme {
  return normalizeTheme(savedTheme) ?? (prefersDark ? "dark" : "light");
}
