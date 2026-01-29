"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarIcon, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

interface CommissionFilterProps {
  onFilterChange?: () => void;
}

type UpdateParams = {
  search?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
};

export function CommissionFilter({ onFilterChange }: CommissionFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initial values from URL
  const searchQuery = searchParams.get("search") || "";
  const createdAtFromQuery = searchParams.get("createdAtFrom") || "";
  const createdAtToQuery = searchParams.get("createdAtTo") || "";

  // Local state (init จาก URL แค่ตอน mount)
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [createdAtFrom, setCreatedAtFrom] = useState(createdAtFromQuery);
  const [createdAtTo, setCreatedAtTo] = useState(createdAtToQuery);

  // Debounced search
  const debouncedSearch = useDebounce(searchInput, 500);

  // --- Helper: build query string from current params + updates ---
  const buildQueryString = (updates: UpdateParams) => {
    const params = new URLSearchParams(searchParams.toString());

    const setParam = (key: string, value: string | undefined) => {
      if (value === undefined) return; // ไม่แตะ key นี้ถ้าไม่ได้ส่งมา

      if (value === "") {
        params.delete(key);
        return;
      }

      params.set(key, value);
    };

    setParam("search", updates.search);
    setParam("createdAtFrom", updates.createdAtFrom);
    setParam("createdAtTo", updates.createdAtTo);

    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  const pushWithParams = (updates: UpdateParams) => {
    const newQuery = buildQueryString(updates);
    router.push(`/dashboard/commissions${newQuery}`, { scroll: false });
    onFilterChange?.();
  };

  useEffect(() => {
    if (debouncedSearch === searchQuery) return;

    pushWithParams({ search: debouncedSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, searchQuery]);

  // Sync URL → local state (รองรับ back/forward / external change)
  useEffect(() => {
    setSearchInput(searchQuery);
    setCreatedAtFrom(createdAtFromQuery);
    setCreatedAtTo(createdAtToQuery);
  }, [searchQuery, createdAtFromQuery, createdAtToQuery]);

  return (
    <div className="flex flex-col items-end justify-end gap-4 lg:flex-row">
      <div className="flex w-full flex-col gap-4 lg:w-auto lg:flex-row">
        {/* Filter: Commission created date range */}
        <Popover>
          <div className="relative w-full lg:w-[320px]">
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start pr-8 text-left font-normal lg:w-[320px]",
                  !createdAtFrom && !createdAtTo && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {createdAtFrom || createdAtTo ? (
                  <span className="truncate">
                    {createdAtFrom ? format(new Date(createdAtFrom), "dd MMM yyyy") : "..."} -{" "}
                    {createdAtTo ? format(new Date(createdAtTo), "dd MMM yyyy") : "..."}
                  </span>
                ) : (
                  "Commission created date range"
                )}
              </Button>
            </PopoverTrigger>
            {(createdAtFrom || createdAtTo) && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
                onClick={(e) => {
                  e.stopPropagation();
                  setCreatedAtFrom("");
                  setCreatedAtTo("");
                  pushWithParams({
                    createdAtFrom: "",
                    createdAtTo: "",
                  });
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              captionLayout="dropdown"
              mode="range"
              numberOfMonths={2}
              selected={{
                from: createdAtFrom ? new Date(createdAtFrom) : undefined,
                to: createdAtTo ? new Date(createdAtTo) : undefined,
              }}
              onSelect={(range) => {
                // Send start/end of selected day(s) in user's timezone as ISO so API
                // filters by "that calendar day" (avoids timezone mismatch).
                const from = range?.from
                  ? new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate(), 0, 0, 0, 0).toISOString()
                  : "";
                const to = range?.to
                  ? new Date(range.to.getFullYear(), range.to.getMonth(), range.to.getDate(), 23, 59, 59, 999).toISOString()
                  : "";
                setCreatedAtFrom(from);
                setCreatedAtTo(to);
                pushWithParams({
                  createdAtFrom: from,
                  createdAtTo: to,
                });
              }}
              fromYear={2000}
              toYear={2100}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Search */}
      <div className="relative w-full flex-1 lg:max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          type="text"
          placeholder="Search by sales user name..."
          className="w-full pr-9 pl-9 lg:w-full lg:max-w-sm"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        {/* {searchInput && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
            onClick={() => {
              setSearchInput("");
              pushWithParams({ search: "" });
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )} */}
      </div>
    </div>
  );
}
