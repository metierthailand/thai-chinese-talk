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

interface TripFilterProps {
  onFilterChange?: () => void;
}

type UpdateParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  selectedDate?: string;
  type?: string;
  status?: string;
};

export function TripFilter({ onFilterChange }: TripFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initial values from URL
  const searchQuery = searchParams.get("search") || "";
  const selectedDateQuery = searchParams.get("selectedDate") || "";
  const typeQuery = searchParams.get("type") || "ALL";
  const statusQuery = searchParams.get("status") || "ALL";

  // Local state (init จาก URL แค่ตอน mount)
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [selectedDate, setSelectedDate] = useState(selectedDateQuery);
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
    setParam("selectedDate", updates.selectedDate);
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
    setSelectedDate(selectedDateQuery);
    setType(typeQuery || "ALL");
    setStatus(statusQuery || "ALL");
  }, [searchQuery, selectedDateQuery, typeQuery, statusQuery]);

  return (
    <div className="flex flex-col items-end justify-end gap-4 md:flex-row">
      <div className="flex w-full flex-col gap-4 md:w-auto md:flex-row">
        {/* Filter: Trip type */}
        <Select
          value={type}
          onValueChange={(value) => {
            setType(value);
            pushWithParams({ type: value, page: 1 });
          }}
        >
          <SelectTrigger className="w-full md:w-40">
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
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="Trip status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="UPCOMING">Upcoming</SelectItem>
            <SelectItem value="SOLD_OUT">Sold Out</SelectItem>
            <SelectItem value="ON_TRIP">On Trip</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filter: Selected date */}
      <Popover>
        <div className="relative w-full md:w-[260px]">
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start pr-8 text-left font-normal md:w-[260px]",
                !selectedDate && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? (
                <span className="truncate">
                  {format(new Date(selectedDate), "dd MMM yyyy")}
                </span>
              ) : (
                "Trip date range"
              )}
            </Button>
          </PopoverTrigger>
          {selectedDate && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDate("");
                pushWithParams({
                  selectedDate: "",
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
            mode="single"
            selected={selectedDate ? new Date(selectedDate) : undefined}
            onSelect={(date) => {
              const dateStr = date ? format(date, "yyyy-MM-dd") : "";
              setSelectedDate(dateStr);
              pushWithParams({
                selectedDate: dateStr,
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
