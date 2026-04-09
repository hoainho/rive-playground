import { useState, useCallback, useRef, useEffect } from "react";

interface Props {
  fileName: string;
  onLoadBuffer: (buffer: ArrayBuffer, fileName: string) => void;
  onLoadUrl: (url: string) => void;
  isLoading: boolean;
}

export function FileOpener({ fileName, onLoadBuffer, onLoadUrl, isLoading }: Props) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          onLoadBuffer(reader.result, file.name);
          setOpen(false);
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [onLoadBuffer],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file?.name.endsWith(".riv")) handleFile(file);
    },
    [handleFile],
  );

  const handleUrlSubmit = useCallback(() => {
    const trimmed = url.trim();
    const urlWithoutQuery = trimmed.split("?")[0].split("#")[0];
    if (trimmed && urlWithoutQuery.toLowerCase().endsWith(".riv")) {
      onLoadUrl(trimmed);
      setUrl("");
      setOpen(false);
    }
  }, [url, onLoadUrl]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => urlInputRef.current?.focus(), 50);
    }
  }, [open]);

  return (
    <div className="file-opener" ref={panelRef}>
      <button
        className={`file-opener-btn ${open ? "active" : ""}`}
        onClick={() => setOpen((v) => !v)}
        title="Open a different .riv file"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7a2 2 0 0 1 2-2h3.5L10 7h9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
          <line x1="12" y1="11" x2="12" y2="17" />
          <polyline points="9 14 12 11 15 14" />
        </svg>
        <span className="file-opener-name">{isLoading ? "Loading…" : fileName}</span>
        <svg className={`file-opener-chevron ${open ? "rotated" : ""}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="file-opener-panel">
          <div
            className={`file-opener-dropzone ${isDragging ? "dragging" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Drop .riv file or <u>browse</u></span>
            <input
              ref={fileRef}
              type="file"
              accept=".riv"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) { handleFile(file); e.target.value = ""; }
              }}
            />
          </div>

          <div className="file-opener-divider">
            <span />
            <small>or load from URL</small>
            <span />
          </div>

          <div className="file-opener-url-row">
            <input
              ref={urlInputRef}
              type="url"
              className="url-input"
              placeholder="https://cdn.rive.app/example.riv"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
            />
            <button className="url-btn" onClick={handleUrlSubmit} disabled={isLoading}>
              Load
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
