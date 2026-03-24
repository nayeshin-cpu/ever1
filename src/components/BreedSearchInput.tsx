"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { BREEDS, type Breed } from "@/data/breeds";

interface BreedSearchInputProps {
  value: string; // 영문명 (내부 저장값)
  onChange: (englishName: string) => void;
  placeholder?: string;
}

export default function BreedSearchInput({
  value,
  onChange,
  placeholder = "품종을 검색하세요",
}: BreedSearchInputProps) {
  const [query, setQuery] = useState(() => {
    if (value) {
      const found = BREEDS.find((b) => b.en === value);
      return found ? found.ko : value;
    }
    return "";
  });
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered =
    query.length >= 2
      ? BREEDS.filter(
          (b) =>
            b.ko.toLowerCase().includes(query.toLowerCase()) ||
            b.en.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 8)
      : [];

  const handleSelect = useCallback(
    (breed: Breed) => {
      setQuery(breed.ko);
      onChange(breed.en);
      setIsOpen(false);
      setHighlightIndex(-1);
    },
    [onChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(val.length >= 2);
    setHighlightIndex(-1);
    if (!val) {
      onChange("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filtered.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev < filtered.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev > 0 ? prev - 1 : filtered.length - 1
      );
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(filtered[highlightIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightIndex(-1);
    }
  };

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setHighlightIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // value prop이 외부에서 변경될 때 query 동기화
  useEffect(() => {
    if (value) {
      const found = BREEDS.find((b) => b.en === value);
      if (found) setQuery(found.ko);
    } else {
      setQuery("");
    }
  }, [value]);

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (query.length >= 2) setIsOpen(true);
        }}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        autoComplete="off"
      />
      {isOpen && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {filtered.map((breed, idx) => (
            <li
              key={breed.en}
              onMouseDown={() => handleSelect(breed)}
              onMouseEnter={() => setHighlightIndex(idx)}
              className={`cursor-pointer px-4 py-2.5 text-sm ${
                idx === highlightIndex
                  ? "bg-amber-50 text-amber-900"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="font-medium">{breed.ko}</span>
              <span className="ml-2 text-gray-400">{breed.en}</span>
            </li>
          ))}
        </ul>
      )}
      {isOpen && query.length >= 2 && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-400 shadow-lg">
          일치하는 품종이 없습니다
        </div>
      )}
    </div>
  );
}
