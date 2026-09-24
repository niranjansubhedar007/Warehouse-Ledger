"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Item } from "@/lib/types";
import { Search } from "@/components/icons";

export function ItemCombobox({
  items,
  value,
  onChange,
  placeholder = "Select an item",
}: {
  items: Item[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 280, maxHeight: 240 });
  const selected = items.find((item) => String(item.id) === String(value));
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return items;
    return items.filter((item) => item.name.toLowerCase().includes(normalizedQuery));
  }, [items, query]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (
        !containerRef.current?.contains(event.target as Node) &&
        !menuRef.current?.contains(event.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    const updateMenuPosition = () => {
      const trigger = containerRef.current?.getBoundingClientRect();
      if (!trigger) return;
      const spaceBelow = window.innerHeight - trigger.bottom - 12;
      const spaceAbove = trigger.top - 12;
      const openAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(140, Math.min(240, openAbove ? spaceAbove : spaceBelow));
      setMenuPosition({
        top: openAbove ? Math.max(8, trigger.top - maxHeight - 4) : trigger.bottom + 4,
        left: Math.min(Math.max(8, trigger.left), window.innerWidth - Math.min(280, trigger.width) - 8),
        width: Math.max(220, Math.min(280, trigger.width)),
        maxHeight,
      });
    };
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open]);

  return (
    <div className="item-combobox" ref={containerRef}>
      <button
        type="button"
        className={`input item-combobox-trigger ${!selected ? "text-muted" : ""}`}
        onClick={() => {
          setOpen((current) => !current);
          setQuery("");
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selected?.name || placeholder}</span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div
          className="item-combobox-menu"
          ref={menuRef}
          style={{
            position: "fixed",
            top: menuPosition.top,
            left: menuPosition.left,
            width: menuPosition.width,
            zIndex: 100,
          }}
        >
          <div className="item-combobox-search">
            <Search size={15} />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search item name"
              aria-label="Search item name"
            />
          </div>
          <div className="item-combobox-options" role="listbox" style={{ maxHeight: menuPosition.maxHeight - 50 }}>
            {filteredItems.length === 0 ? (
              <div className="item-combobox-empty">No items found</div>
            ) : (
              filteredItems.map((item) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={String(item.id) === String(value)}
                  className={`item-combobox-option ${String(item.id) === String(value) ? "selected" : ""}`}
                  key={item.id}
                  onClick={() => {
                    onChange(String(item.id));
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  {item.name}
                </button>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
