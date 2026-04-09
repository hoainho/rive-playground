import { useState, useCallback } from "react";
import type { Preset, PlaygroundState } from "../types";
import { SM_INPUT_BOOLEAN, SM_INPUT_NUMBER } from "../types";

const STORAGE_KEY = "rive-playground-presets";
const MAX_PRESETS = 20;

function loadFromStorage(): Preset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Preset[];
  } catch {
    return [];
  }
}

function saveToStorage(presets: Preset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {}
}

export function usePresets() {
  const [presets, setPresets] = useState<Preset[]>(loadFromStorage);

  const savePreset = useCallback((name: string, state: PlaygroundState): Preset => {
    const preset: Preset = {
      id: `preset-${Date.now()}`,
      name: name.trim(),
      artboard: state.selectedArtboard,
      stateMachine: state.selectedStateMachine,
      inputs: state.smInputs
        .filter((i) => i.type === SM_INPUT_BOOLEAN || i.type === SM_INPUT_NUMBER)
        .map((i) => ({ name: i.name, type: i.type === SM_INPUT_BOOLEAN ? "boolean" : "number", value: i.value })),
      viewModelProps: state.viewModelProps
        .filter((p) => p.value !== undefined)
        .map((p) => ({ path: p.path, type: p.type, value: p.value })),
      textRuns: state.textRuns.map((t) => ({ name: t.name, value: t.value })),
      createdAt: new Date().toISOString(),
    };

    setPresets((prev) => {
      const next = [preset, ...prev].slice(0, MAX_PRESETS);
      saveToStorage(next);
      return next;
    });
    return preset;
  }, []);

  const deletePreset = useCallback((id: string) => {
    setPresets((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveToStorage(next);
      return next;
    });
  }, []);

  return { presets, savePreset, deletePreset };
}
