"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { LEAD_SOURCE_LABELS, LEAD_SOURCE_VALUES, LEAD_STATUS_LABELS, LEAD_STATUS_VALUES } from "@/lib/constants/lead";

interface LeadFilterProps {
  onFilterChange?: () => void;
}

type UpdateParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  source?: string;
};

export function LeadFilter({ onFilterChange }: LeadFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initial values from URL
  const searchQuery = searchParams.get("search") || "";
  const statusFilter = searchParams.get("status") || "ALL";
  const sourceFilter = searchParams.get("source") || "ALL";

  // Local state
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [status, setStatus] = useState(statusFilter || "ALL");
  const [source, setSource] = useState(sourceFilter || "ALL");

  // Debounced values
  const debouncedSearch = useDebounce(searchInput, 500);

  // Helper: build query string from current params + updates
  const buildQueryString = (updates: UpdateParams) => {
    const params = new URLSearchParams(searchParams.toString());

    const setParam = (key: string, value: string | undefined, defaultValue?: string) => {
      if (value === undefined) return;

      if (value === "" || (defaultValue !== undefined && value === defaultValue)) {
        params.delete(key);
        return;
      }

      params.set(key, value);
    };

    setParam("page", updates.page?.toString(), "1");
    setParam("pageSize", updates.pageSize?.toString(), "10");
    setParam("search", updates.search);
    setParam("status", updates.status, "ALL");
    setParam("source", updates.source, "ALL");

    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  const pushWithParams = (updates: UpdateParams) => {
    const newQuery = buildQueryString(updates);
    router.push(`/dashboard/leads${newQuery}`, { scroll: false });
    onFilterChange?.();
  };

  // 🔹 1) Sync debounced search → URL
  useEffect(() => {
    if (debouncedSearch === searchQuery) return;
    pushWithParams({ search: debouncedSearch, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, searchQuery]);

  // 🔹 2) Sync URL → local state (รองรับ back/forward / external change)
  useEffect(() => {
    setSearchInput(searchQuery);
    setStatus(statusFilter || "ALL");
    setSource(sourceFilter || "ALL");
  }, [searchQuery, statusFilter, sourceFilter]);

  const handleClearSearch = () => {
    setSearchInput("");
    // ไม่ต้อง push ตรง ๆ ปล่อยให้ debounced effect จัดการ
  };

  return (
    <div className="flex flex-col items-end justify-end gap-4 lg:flex-row">
      <div className="flex w-full flex-col gap-4 lg:w-auto md:flex-row">
        {/* Status filter */}
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            pushWithParams({ status: value, page: 1 });
          }}
        >
          <SelectTrigger className="w-full lg:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {LEAD_STATUS_VALUES.map((status) => (
              <SelectItem key={status} value={status}>
                {LEAD_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Source filter */}
        <Select
          value={source}
          onValueChange={(value) => {
            setSource(value);
            pushWithParams({ source: value, page: 1 });
          }}
        >
          <SelectTrigger className="w-full lg:w-40">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Sources</SelectItem>
            {LEAD_SOURCE_VALUES.map((source) => (
              <SelectItem key={source} value={source}>
                {LEAD_SOURCE_LABELS[source]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Search by customer name */}
      <div className="relative w-full lg:w-100">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          type="text"
          placeholder="Search by name, trip interest, or sales name..."
          className="w-full pr-9 pl-9 lg:w-full lg:max-w-sm"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        {/* {searchInput && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
            onClick={handleClearSearch}
          >
            <X className="h-4 w-4" />
          </Button>
        )} */}
      </div>
    </div>
  );
}
