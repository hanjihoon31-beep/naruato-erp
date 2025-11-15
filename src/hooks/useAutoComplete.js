import { useCallback, useEffect, useMemo, useState } from "react";

const defaultGetLabel = (item) => (typeof item === "string" ? item : item?.label || item?.name || "");

const defaultFilter = (items = [], query = "", getLabel = defaultGetLabel) => {
  if (!query) return items;
  const term = query.toLowerCase();
  return items.filter((item) => (getLabel(item) || "").toLowerCase().includes(term));
};

export default function useAutoComplete(
  items = [],
  {
    getLabel = defaultGetLabel,
    onSelect,
    limit = 20,
    filter = defaultFilter,
    autoSelectOnExactMatch = false,
  } = {}
) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const suggestions = useMemo(() => {
    const filtered = filter(items, query, getLabel);
    return filtered.slice(0, limit);
  }, [items, query, filter, getLabel, limit]);

  useEffect(() => {
    if (!suggestions.length) {
      setHighlightedIndex(-1);
      return;
    }
    setHighlightedIndex((prev) => {
      if (prev >= 0 && prev < suggestions.length) return prev;
      return 0;
    });
  }, [suggestions]);

  useEffect(() => {
    if (!autoSelectOnExactMatch) return;
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return;
    const exactMatch = suggestions.find(
      (item) => (getLabel(item) || "").toLowerCase() === trimmed
    );
    if (exactMatch) {
      selectItem(exactMatch);
    }
  }, [autoSelectOnExactMatch, getLabel, query, selectItem, suggestions]);

  const openList = useCallback(() => {
    if (suggestions.length) {
      setIsOpen(true);
    }
  }, [suggestions.length]);

  const closeList = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleInputChange = useCallback((value) => {
    setQuery(value);
    setIsOpen(true);
  }, []);

  const selectItem = useCallback(
    (item) => {
      if (!item) return;
      const label = getLabel(item);
      setQuery(label);
      setIsOpen(false);
      onSelect?.(item);
    },
    [getLabel, onSelect]
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (!suggestions.length) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setIsOpen(true);
        setHighlightedIndex((prev) => {
          const next = prev + 1;
          return next >= suggestions.length ? 0 : next;
        });
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setIsOpen(true);
        setHighlightedIndex((prev) => {
          const next = prev - 1;
          return next < 0 ? suggestions.length - 1 : next;
        });
      } else if (event.key === "Enter") {
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          event.preventDefault();
          selectItem(suggestions[highlightedIndex]);
        }
      } else if (event.key === "Escape") {
        closeList();
      }
    },
    [suggestions, highlightedIndex, closeList, selectItem]
  );

  const reset = useCallback(() => {
    setQuery("");
    setHighlightedIndex(-1);
    setIsOpen(false);
  }, []);

  return {
    query,
    suggestions,
    isOpen: isOpen && suggestions.length > 0,
    highlightedIndex,
    setQuery: handleInputChange,
    handleKeyDown,
    handleSelect: selectItem,
    openList,
    closeList,
    reset,
  };
}
