"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface TagSearchProps {
  search: string;
  onSearchChange: (search: string) => void;
}

export function TagSearch({ search, onSearchChange }: TagSearchProps) {
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebounce(searchInput, 500);

  // 1) sync debounced input -> parent
  useEffect(() => {
    if (debouncedSearch !== search) {
      onSearchChange(debouncedSearch);
    }
  }, [debouncedSearch, search, onSearchChange]);

  // 2) sync parent search -> input
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const handleClear = () => {
    setSearchInput("");
  };

  return (
    <div className="relative w-full md:w-80">
      <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
      <Input
        type="text"
        placeholder="Search by tag name"
        className="pr-9 pl-9"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
      />
      {/* {searchInput && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
        </Button>
      )} */}
    </div>
  );
}
