import { useState } from "react";
import type { TextRunEntry } from "../../types";
import { TextControl } from "../controls/TextControl";

interface Props {
  textRuns: TextRunEntry[];
  onSetTextRun: (name: string, value: string) => void;
  onAddTextRun: (name: string) => void;
}

export function TextRunPanel({ textRuns, onSetTextRun, onAddTextRun }: Props) {
  const [newName, setNewName] = useState("");

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (trimmed) {
      onAddTextRun(trimmed);
      setNewName("");
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        Text Runs
      </div>
      <div className="panel-body">
        {textRuns.map((tr) => (
          <TextControl
            key={tr.name}
            name={tr.name}
            value={tr.value}
            onChange={(v) => onSetTextRun(tr.name, v)}
          />
        ))}

        <div className="add-row">
          <input
            type="text"
            className="text-input"
            placeholder="Text run name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button className="add-btn" onClick={handleAdd}>
            + Add
          </button>
        </div>

        {textRuns.length === 0 && (
          <div className="empty-hint">
            Add text run names to inspect and edit them. Names must match the
            text run node names in Rive Editor.
          </div>
        )}
      </div>
    </div>
  );
}
