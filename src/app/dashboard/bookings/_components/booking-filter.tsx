"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CalendarIcon, Search, X, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useDebounce } from "@/hooks/use-debounce";
import { useTrips, useTrip } from "@/app/dashboard/trips/hooks/use-trips";

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
  tripId?: string;
};

export function BookingFilter({ onFilterChange }: BookingFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initial values from URL
  const searchQuery = searchParams.get("search") || "";
  const statusQuery = searchParams.get("status") || "";
  const tripStartDateFromQuery = searchParams.get("tripStartDateFrom") || "";
  const tripStartDateToQuery = searchParams.get("tripStartDateTo") || "";
  const tripIdQuery = searchParams.get("tripId") || "";

  // Local state (init จาก URL แค่ตอน mount)
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [paymentStatus, setPaymentStatus] = useState(statusQuery || "ALL");
  const [tripStartDateFrom, setTripStartDateFrom] = useState(tripStartDateFromQuery);
  const [tripStartDateTo, setTripStartDateTo] = useState(tripStartDateToQuery);
  const [tripId, setTripId] = useState(tripIdQuery);
  const [tripSearchOpen, setTripSearchOpen] = useState(false);
  const [tripSearchQuery, setTripSearchQuery] = useState("");

  // Debounced search
  const debouncedSearch = useDebounce(searchInput, 500);
  const debouncedTripSearch = useDebounce(tripSearchQuery, 300);

  // Trips for combobox (search by code/name)
  const { data: tripsResponse } = useTrips(1, 100, debouncedTripSearch || undefined);
  const trips = tripsResponse?.data ?? [];
  const { data: selectedTrip } = useTrip(tripId || undefined);

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
    setParam("tripId", updates.tripId);

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
    setTripId(tripIdQuery);
  }, [searchQuery, statusQuery, tripStartDateFromQuery, tripStartDateToQuery, tripIdQuery]);

  return (
    <div className="flex flex-col items-end justify-end gap-4 lg:flex-row">
      <div className="flex w-full flex-col gap-4 lg:w-auto md:flex-row">
        {/* Filter: Payment Status */}
        <Select
          value={paymentStatus}
          onValueChange={(value) => {
            setPaymentStatus(value);
            pushWithParams({ paymentStatus: value, page: 1 });
          }}
        >
          <SelectTrigger className="w-full lg:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All payment status</SelectItem>
            <SelectItem value="DEPOSIT_PENDING">Deposit pending</SelectItem>
            <SelectItem value="DEPOSIT_PAID">Deposit paid</SelectItem>
            <SelectItem value="FULLY_PAID">Fully paid</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter: Trip code */}
        <Popover open={tripSearchOpen} onOpenChange={setTripSearchOpen}>
          <div className="relative w-full lg:w-[280px]">
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className={cn(
                  "w-full justify-between pr-8 text-left font-normal lg:w-[280px]",
                  !tripId && "text-muted-foreground",
                )}
              >
                <span className="truncate">
                  {selectedTrip ? selectedTrip.code : "Trip code"}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            {tripId && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-8 h-7 w-7 -translate-y-1/2"
                onClick={(e) => {
                  e.stopPropagation();
                  setTripId("");
                  setTripSearchQuery("");
                  pushWithParams({ tripId: "", page: 1 });
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                value={tripSearchQuery}
                onValueChange={setTripSearchQuery}
                placeholder="Search by trip code or name..."
              />
              <CommandList>
                {trips.length === 0 ? (
                  <CommandEmpty>
                    {tripSearchQuery ? "No trips found." : "Start typing to search..."}
                  </CommandEmpty>
                ) : (
                  <CommandGroup>
                    {trips.map((trip) => (
                      <CommandItem
                        value={trip.id}
                        key={trip.id}
                        onSelect={() => {
                          setTripId(trip.id);
                          pushWithParams({ tripId: trip.id, page: 1 });
                          setTripSearchOpen(false);
                          setTripSearchQuery("");
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            trip.id === tripId ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {trip.code}
                            {(trip.paidBookingsCount ?? 0) >= trip.pax ? " [FULL]" : ""}
                          </span>
                          <span className="text-muted-foreground text-sm">
                            {trip.name}{" "}
                            {(() => {
                              const start = new Date(trip.startDate);
                              const end = new Date(trip.endDate);
                              const sameYear = start.getFullYear() === end.getFullYear();
                              return sameYear
                                ? `(${format(start, "dd MMM")} - ${format(end, "dd MMM yyyy")})`
                                : `(${format(start, "dd MMM yyyy")} - ${format(end, "dd MMM yyyy")})`;
                            })()}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

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
                // Send start/end of selected day(s) in user's timezone as ISO so API
                // filters by "that calendar day" (avoids timezone mismatch).
                const from = range?.from
                  ? new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate(), 0, 0, 0, 0).toISOString()
                  : "";
                const to = range?.to
                  ? new Date(range.to.getFullYear(), range.to.getMonth(), range.to.getDate(), 23, 59, 59, 999).toISOString()
                  : "";
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
      <div className="relative w-full lg:w-96">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          type="text"
          placeholder="Search by customer name"
          className="pl-9"
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
