import { useEffect, useRef } from "react";
import type { RiveEvent } from "../../types";

interface Props {
  events: RiveEvent[];
  onClear: () => void;
}

export function EventsPanel({ events, onClear }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && events.length > 0) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events.length]);

  return (
    <div className="panel">
      <div className="panel-header">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        Events
        {events.length > 0 && (
          <span className="events-badge">{events.length}</span>
        )}
        {events.length > 0 && (
          <button className="events-clear-btn" onClick={onClear} type="button" title="Clear events">
            Clear
          </button>
        )}
      </div>
      <div className="panel-body events-body" ref={scrollRef}>
        {events.length === 0 ? (
          <div className="empty-hint">No events fired yet. Interact with the animation to trigger events.</div>
        ) : (
          events.map((ev) => (
            <div key={ev.id} className="event-row">
              <span className="event-ts">{ev.timestamp}</span>
              <span className="event-name">{ev.name}</span>
              <span className={`event-type-badge event-type-${ev.type}`}>
                {ev.type === "openUrl" ? "url" : "event"}
              </span>
              {ev.url && (
                <a className="event-url" href={ev.url} target="_blank" rel="noopener noreferrer">
                  {ev.url.length > 32 ? ev.url.slice(0, 32) + "…" : ev.url}
                </a>
              )}
              {ev.properties && Object.keys(ev.properties).length > 0 && (
                <div className="event-props">
                  {Object.entries(ev.properties).map(([k, v]) => (
                    <span key={k} className="event-prop-chip">
                      {k}={String(v)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
