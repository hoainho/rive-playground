import { useState } from "react";

interface Props {
  name: string;
  onFire: () => void;
}

export function TriggerControl({ name, onFire }: Props) {
  const [fired, setFired] = useState(false);

  const handleFire = () => {
    onFire();
    setFired(true);
    setTimeout(() => setFired(false), 300);
  };

  return (
    <div className="control-row">
      <label className="control-label">{name}</label>
      <button
        className={`trigger-btn ${fired ? "fired" : ""}`}
        onClick={handleFire}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: "4px"}}><path d="M12 2c0 6-6 8-6 14a6 6 0 0 0 12 0c0-6-6-8-6-14z"/><path d="M12 12c0 3-2 4-2 7a2 2 0 0 0 4 0c0-3-2-4-2-7z"/></svg>
        Fire
      </button>
    </div>
  );
}
