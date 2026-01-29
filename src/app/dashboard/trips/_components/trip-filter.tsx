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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TRIP_STATUS_LABELS, type TripStatus } from "@/lib/constants/trip";

interface TripFilterProps {
  onFilterChange?: () => void;
}

type UpdateParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  tripDateFrom?: string;
  tripDateTo?: string;
  type?: string;
  status?: string;
};

export function TripFilter({ onFilterChange }: TripFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initial values from URL
  const searchQuery = searchParams.get("search") || "";
  const tripDateFromQuery = searchParams.get("tripDateFrom") || "";
  const tripDateToQuery = searchParams.get("tripDateTo") || "";
  const typeQuery = searchParams.get("type") || "ALL";
  const statusQuery = searchParams.get("status") || "ALL";

  // Local state (init จาก URL แค่ตอน mount)
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [tripDateFrom, setTripDateFrom] = useState(tripDateFromQuery);
  const [tripDateTo, setTripDateTo] = useState(tripDateToQuery);
  const [type, setType] = useState(typeQuery || "ALL");
  const [status, setStatus] = useState(statusQuery || "ALL");

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
    setParam("tripDateFrom", updates.tripDateFrom);
    setParam("tripDateTo", updates.tripDateTo);
    setParam("type", updates.type, "ALL");
    setParam("status", updates.status, "ALL");

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
    setTripDateFrom(tripDateFromQuery);
    setTripDateTo(tripDateToQuery);
    setType(typeQuery || "ALL");
    setStatus(statusQuery || "ALL");
  }, [searchQuery, tripDateFromQuery, tripDateToQuery, typeQuery, statusQuery]);

  return (
    <div className="flex flex-col items-end justify-end gap-4 lg:flex-row">
      <div className="flex w-full flex-col gap-4 lg:w-auto md:flex-row">
        {/* Filter: Trip type */}
        <Select
          value={type}
          onValueChange={(value) => {
            setType(value);
            pushWithParams({ type: value, page: 1 });
          }}
        >
          <SelectTrigger className="w-full lg:w-40">
            <SelectValue placeholder="Trip type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="GROUP_TOUR">Group Tour</SelectItem>
            <SelectItem value="PRIVATE_TOUR">Private Tour</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter: Trip status */}
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            pushWithParams({ status: value, page: 1 });
          }}
        >
          <SelectTrigger className="w-full lg:w-40">
            <SelectValue placeholder="Trip status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {(Object.keys(TRIP_STATUS_LABELS) as TripStatus[]).map((status) => (
              <SelectItem key={status} value={status}>
                {TRIP_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex w-full flex-col gap-4 lg:w-auto md:flex-row">
        {/* Filter: Trip date range */}
        <Popover>
          <div className="relative w-full lg:w-[260px]">
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start pr-8 text-left font-normal lg:w-[260px]",
                  !tripDateFrom && !tripDateTo && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {tripDateFrom || tripDateTo ? (
                  <span className="truncate">
                    {tripDateFrom ? format(new Date(tripDateFrom), "dd MMM yyyy") : "..."} -{" "}
                    {tripDateTo ? format(new Date(tripDateTo), "dd MMM yyyy") : "..."}
                  </span>
                ) : (
                  "Trip date range"
                )}
              </Button>
            </PopoverTrigger>
            {(tripDateFrom || tripDateTo) && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
                onClick={(e) => {
                  e.stopPropagation();
                  setTripDateFrom("");
                  setTripDateTo("");
                  pushWithParams({
                    tripDateFrom: "",
                    tripDateTo: "",
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
                from: tripDateFrom ? new Date(tripDateFrom) : undefined,
                to: tripDateTo ? new Date(tripDateTo) : undefined,
              }}
              onSelect={(range) => {
                // Send start/end of selected day(s) in user's timezone as ISO
                const from = range?.from
                  ? new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate(), 0, 0, 0, 0).toISOString()
                  : "";
                const to = range?.to
                  ? new Date(range.to.getFullYear(), range.to.getMonth(), range.to.getDate(), 23, 59, 59, 999).toISOString()
                  : "";
                setTripDateFrom(from);
                setTripDateTo(to);
                pushWithParams({
                  tripDateFrom: from,
                  tripDateTo: to,
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
        <div className="relative w-full lg:w-96">
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
    </div>
  );
}
