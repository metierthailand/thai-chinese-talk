"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useDebounce } from "@/hooks/use-debounce";

interface BookingFilterProps {
  onFilterChange?: () => void;
}

type UpdateParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  paymentStatus?: string;
  tripStartDateFrom?: string;
  tripStartDateTo?: string;
};

export function BookingFilter({ onFilterChange }: BookingFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initial values from URL
  const searchQuery = searchParams.get("search") || "";
  const statusQuery = searchParams.get("status") || "";
  const tripStartDateFromQuery = searchParams.get("tripStartDateFrom") || "";
  const tripStartDateToQuery = searchParams.get("tripStartDateTo") || "";

  // Local state (init จาก URL แค่ตอน mount)
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [paymentStatus, setPaymentStatus] = useState(statusQuery || "ALL");
  const [tripStartDateFrom, setTripStartDateFrom] = useState(tripStartDateFromQuery);
  const [tripStartDateTo, setTripStartDateTo] = useState(tripStartDateToQuery);

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
    setParam("status", updates.paymentStatus, "ALL");
    setParam("tripStartDateFrom", updates.tripStartDateFrom);
    setParam("tripStartDateTo", updates.tripStartDateTo);

    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  const pushWithParams = (updates: UpdateParams) => {
    const newQuery = buildQueryString(updates);
    router.push(`/dashboard/bookings${newQuery}`, { scroll: false });
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
    setPaymentStatus(statusQuery || "ALL");
    setTripStartDateFrom(tripStartDateFromQuery);
    setTripStartDateTo(tripStartDateToQuery);
  }, [searchQuery, statusQuery, tripStartDateFromQuery, tripStartDateToQuery]);

  return (
    <div className="flex flex-col items-end justify-end gap-4 lg:flex-row">
      <div className="flex w-full flex-col gap-4 lg:w-auto lg:flex-row">
        {/* Filter: Payment Status */}
        <Select
          value={paymentStatus}
          onValueChange={(value) => {
            setPaymentStatus(value);
            pushWithParams({ paymentStatus: value, page: 1 });
          }}
        >
          <SelectTrigger className="w-full lg:w-40">
            <SelectValue placeholder="Filter payment status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All status</SelectItem>
            <SelectItem value="DEPOSIT_PENDING">Deposit pending</SelectItem>
            <SelectItem value="DEPOSIT_PAID">Deposit paid</SelectItem>
            <SelectItem value="FULLY_PAID">Fully paid</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter: Trip start date range */}
        <Popover>
          <div className="relative w-full lg:w-[260px]">
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start pr-8 text-left font-normal lg:w-[260px]",
                  !tripStartDateFrom && !tripStartDateTo && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {tripStartDateFrom || tripStartDateTo ? (
                  <span className="truncate">
                    {tripStartDateFrom ? format(new Date(tripStartDateFrom), "dd MMM yyyy") : "..."} -{" "}
                    {tripStartDateTo ? format(new Date(tripStartDateTo), "dd MMM yyyy") : "..."}
                  </span>
                ) : (
                  "Trip start date range"
                )}
              </Button>
            </PopoverTrigger>
            {(tripStartDateFrom || tripStartDateTo) && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
                onClick={(e) => {
                  e.stopPropagation();
                  setTripStartDateFrom("");
                  setTripStartDateTo("");
                  pushWithParams({
                    tripStartDateFrom: "",
                    tripStartDateTo: "",
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
                from: tripStartDateFrom ? new Date(tripStartDateFrom) : undefined,
                to: tripStartDateTo ? new Date(tripStartDateTo) : undefined,
              }}
              onSelect={(range) => {
                const from = range?.from ? format(range.from, "yyyy-MM-dd") : "";
                const to = range?.to ? format(range.to, "yyyy-MM-dd") : "";
                setTripStartDateFrom(from);
                setTripStartDateTo(to);
                pushWithParams({
                  tripStartDateFrom: from,
                  tripStartDateTo: to,
                  page: 1,
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
          placeholder="Search customer name (TH/EN)..."
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
