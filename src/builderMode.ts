import type { AppMode } from "./appMode";

export function useManualReferenceInputs(mode: AppMode) {
  return mode === "generator";
}
