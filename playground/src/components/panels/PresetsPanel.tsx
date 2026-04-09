import { useState } from "react";
import type { Preset, PlaygroundState } from "../../types";

interface Props {
  presets: Preset[];
  state: PlaygroundState;
  onSave: (name: string) => void;
  onApply: (preset: Preset) => void;
  onDelete: (id: string) => void;
}

export function PresetsPanel({ presets, state, onSave, onApply, onDelete }: Props) {
  const [saving, setSaving] = useState(false);
  const [presetName, setPresetName] = useState("");

  const handleSave = () => {
    const name = presetName.trim() || `Preset ${presets.length + 1}`;
    onSave(name);
    setPresetName("");
    setSaving(false);
  };

  if (!state.isLoaded) return null;

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        Presets
        {presets.length > 0 && <span className="events-badge">{presets.length}</span>}
      </div>
      <div className="panel-body">
        {saving ? (
          <div className="preset-save-form">
            <input
              type="text"
              className="text-input"
              placeholder="Preset name…"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setSaving(false); }}
              autoFocus
            />
            <div className="preset-save-actions">
              <button className="preset-btn preset-btn-primary" onClick={handleSave} type="button">Save</button>
              <button className="preset-btn" onClick={() => setSaving(false)} type="button">Cancel</button>
            </div>
          </div>
        ) : (
          <button className="preset-btn preset-btn-full" onClick={() => setSaving(true)} type="button">
            + Save current state
          </button>
        )}

        {presets.length === 0 && !saving && (
          <div className="empty-hint">No presets saved yet. Configure inputs and save a preset to reuse later.</div>
        )}

        {presets.map((preset) => (
          <div key={preset.id} className="preset-row">
            <div className="preset-info">
              <span className="preset-name">{preset.name}</span>
              <span className="preset-meta">{preset.artboard} · {formatDate(preset.createdAt)}</span>
            </div>
            <div className="preset-actions">
              <button className="preset-btn preset-btn-apply" onClick={() => onApply(preset)} type="button">Apply</button>
              <button className="preset-btn preset-btn-delete" onClick={() => onDelete(preset.id)} type="button">✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
