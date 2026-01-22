"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useDebounce } from "@/hooks/use-debounce";

interface TripFilterProps {
  onFilterChange?: () => void;
}

type UpdateParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  startDateFrom?: string;
  startDateTo?: string;
};

export function TripFilter({ onFilterChange }: TripFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initial values from URL
  const searchQuery = searchParams.get("search") || "";
  const startDateFromQuery = searchParams.get("startDateFrom") || "";
  const startDateToQuery = searchParams.get("startDateTo") || "";

  // Local state (init จาก URL แค่ตอน mount)
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [startDateFrom, setStartDateFrom] = useState(startDateFromQuery);
  const [startDateTo, setStartDateTo] = useState(startDateToQuery);

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
    setParam("startDateFrom", updates.startDateFrom);
    setParam("startDateTo", updates.startDateTo);

    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  const pushWithParams = (updates: UpdateParams) => {
    const newQuery = buildQueryString(updates);
    router.push(`/dashboard/trips${newQuery}`, { scroll: false });
    onFilterChange?.();
  };

  useEffect(() => {
    if (debouncedSearch === searchQuery) return;

    pushWithParams({ search: debouncedSearch, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, searchQuery]);

  // Sync URL → local state (รองรับ back/forward / external change)
  useEffect(() => {
    setSearchInput(searchQuery);
    setStartDateFrom(startDateFromQuery);
    setStartDateTo(startDateToQuery);
  }, [searchQuery, startDateFromQuery, startDateToQuery]);

  return (
    <div className="flex flex-col items-end justify-end gap-4 md:flex-row">
      {/* Filter: Trip start date range */}
      <Popover>
        <div className="relative w-full md:w-[260px]">
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start pr-8 text-left font-normal md:w-[260px]",
                !startDateFrom && !startDateTo && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDateFrom || startDateTo ? (
                <span className="truncate">
                  {startDateFrom ? format(new Date(startDateFrom), "dd MMM yyyy") : "..."} -{" "}
                  {startDateTo ? format(new Date(startDateTo), "dd MMM yyyy") : "..."}
                </span>
              ) : (
                "Trip start date range"
              )}
            </Button>
          </PopoverTrigger>
          {(startDateFrom || startDateTo) && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
              onClick={(e) => {
                e.stopPropagation();
                setStartDateFrom("");
                setStartDateTo("");
                pushWithParams({
                  startDateFrom: "",
                  startDateTo: "",
                  page: 1,
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
              from: startDateFrom ? new Date(startDateFrom) : undefined,
              to: startDateTo ? new Date(startDateTo) : undefined,
            }}
            onSelect={(range) => {
              const from = range?.from ? format(range.from, "yyyy-MM-dd") : "";
              const to = range?.to ? format(range.to, "yyyy-MM-dd") : "";
              setStartDateFrom(from);
              setStartDateTo(to);
              pushWithParams({
                startDateFrom: from,
                startDateTo: to,
                page: 1,
              });
            }}
            fromYear={2000}
            toYear={2100}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Search */}
      <div className="relative w-full flex-1 md:max-w-sm">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          type="text"
          placeholder="Search by trip code, trip name, IATA code"
          className="w-full pr-9 pl-9 md:w-full md:max-w-sm"
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
              pushWithParams({ search: "", page: 1 });
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )} */}
      </div>
    </div>
  );
}
