"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface FamilyFilterProps {
  onFilterChange?: () => void;
}

type UpdateParams = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export function FamilyFilter({ onFilterChange }: FamilyFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initial values from URL
  const searchQuery = searchParams.get("search") || "";

  // Local state (init จาก URL แค่ตอน mount)
  const [searchInput, setSearchInput] = useState(searchQuery);

  // Debounced search
  const debouncedSearch = useDebounce(searchInput, 500);

  // --- Helper: build query string from current params + updates ---
  const buildQueryString = (updates: UpdateParams) => {
    const params = new URLSearchParams(searchParams.toString());

    const setParam = (key: string, value: string | undefined, defaultValue?: string) => {
      if (value === undefined) return; // ไม่แตะ key นี้ถ้าไม่ได้ส่งมา

      if (value === "" || (defaultValue !== undefined && value === defaultValue)) {
        params.delete(key);
        return;
      }

      params.set(key, value);
    };

    setParam("page", updates.page?.toString(), "1");
    setParam("pageSize", updates.pageSize?.toString(), "10");
    setParam("search", updates.search);

    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  const pushWithParams = (updates: UpdateParams) => {
    const newQuery = buildQueryString(updates);
    router.push(`/dashboard/families${newQuery}`, { scroll: false });
    onFilterChange?.();
  };

  useEffect(() => {
    if (debouncedSearch === searchQuery) return;

    pushWithParams({ search: debouncedSearch, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, searchQuery]);

  return (
    <div className="flex items-center justify-end gap-4">
      {/* Search */}
      <div className="relative w-full flex-1 md:max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search by name, customer name"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full pl-9 md:w-full md:max-w-sm"
        />
      </div>
    </div>
  );
}
