import { useState } from "react";
import type { ViewModelProperty, ListAction } from "../../types";
import { TypeBadge } from "./TypeBadge";

interface Props {
  prop: ViewModelProperty;
  onListAction: (action: ListAction) => void;
  renderChildren: (children: ViewModelProperty[]) => React.ReactNode;
}

export function ListControl({ prop, onListAction, renderChildren }: Props) {
  const [expanded, setExpanded] = useState(false);
  const itemCount = prop.children?.length ?? 0;

  return (
    <div className="vm-nested">
      <button
        className="vm-toggle"
        onClick={() => setExpanded((v) => !v)}
        type="button"
      >
        <TypeBadge type="list" />
        <span>{prop.name}</span>
        <span className="vm-list-count">({itemCount} {itemCount === 1 ? "item" : "items"})</span>
        <span className="vm-toggle-icon">
          {expanded
            ? <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
            : <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M10 7l5 5-5 5z"/></svg>
          }
        </span>
      </button>

      {expanded && (
        <div className="vm-children">
          {itemCount === 0 ? (
            <div className="vm-list-empty">No items</div>
          ) : (
            prop.children && renderChildren(prop.children)
          )}
          <button
            className="vm-list-add-btn"
            type="button"
            onClick={() => onListAction({ action: "add", listPath: prop.path })}
            title={prop.listItemType ? `Add ${prop.listItemType}` : "Add item"}
          >
            + Add Item
          </button>
        </div>
      )}
    </div>
  );
}
