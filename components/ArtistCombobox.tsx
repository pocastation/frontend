"use client";

import { useEffect, useRef, useState } from "react";
import { INPUT_CLASS } from "@/lib/ui";

export type ArtistOption = { id: number; name: string };

// 아티스트가 늘어날수록 <select> 스크롤이 비현실적이라, 검색해서 좁혀 고르는 콤보박스로 대체.
export default function ArtistCombobox({
  id,
  options,
  value,
  onChange,
  placeholder = "스타명 검색",
}: {
  id: string;
  options: ArtistOption[];
  value: number | "";
  onChange: (id: number | "") => void;
  placeholder?: string;
}) {
  const selected = options.find((o) => o.id === value) ?? null;
  const [query, setQuery] = useState(selected?.name ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 외부에서(폼 리셋 등) value가 바뀌면 입력창 텍스트도 즉시 맞춰야 함
    setQuery(selected?.name ?? "");
  }, [selected?.name]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery(selected?.name ?? "");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selected?.name]);

  const filtered =
    query.trim() === "" || query === selected?.name
      ? options
      : options.filter((o) => o.name.toLowerCase().includes(query.toLowerCase()));

  function selectOption(option: ArtistOption) {
    onChange(option.id);
    setQuery(option.name);
    setIsOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen && (e.key === "ArrowDown" || e.key === "Enter")) {
      setIsOpen(true);
      return;
    }
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const option = filtered[highlightedIndex];
      if (option) selectOption(option);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setQuery(selected?.name ?? "");
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={`${id}-listbox`}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(0);
          if (e.target.value.trim() === "") onChange("");
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        className={INPUT_CLASS}
      />
      {isOpen && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-r2 border border-border bg-surface py-1 shadow-modal"
        >
          {filtered.length === 0 ? (
            <li className="px-3.5 py-2 text-sm text-text-3">검색 결과가 없어요</li>
          ) : (
            filtered.map((option, index) => (
              <li
                key={option.id}
                role="option"
                aria-selected={option.id === value}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectOption(option);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`cursor-pointer px-3.5 py-2 text-sm ${
                  index === highlightedIndex ? "bg-primary-soft text-primary" : "text-text-1"
                } ${option.id === value ? "font-bold" : ""}`}
              >
                {option.name}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
