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

interface CustomerFilterProps {
  onFilterChange?: () => void;
}

type UpdateParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  passportExpiryFrom?: string;
  passportExpiryTo?: string;
};

export function CustomerFilter({ onFilterChange }: CustomerFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initial values from URL
  const searchQuery = searchParams.get("search") || "";
  const passportExpiryFrom = searchParams.get("passportExpiryFrom") || "";
  const passportExpiryTo = searchParams.get("passportExpiryTo") || "";

  // Local state (init จาก URL แค่ตอน mount)
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [expiryFrom, setExpiryFrom] = useState(passportExpiryFrom);
  const [expiryTo, setExpiryTo] = useState(passportExpiryTo);

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
    setParam("passportExpiryFrom", updates.passportExpiryFrom);
    setParam("passportExpiryTo", updates.passportExpiryTo);

    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  const pushWithParams = (updates: UpdateParams) => {
    const newQuery = buildQueryString(updates);
    router.push(`/dashboard/customers${newQuery}`, { scroll: false });
    onFilterChange?.();
  };

  useEffect(() => {
    if (debouncedSearch === searchQuery) return;

    pushWithParams({ search: debouncedSearch, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, searchQuery]);

  return (
    <div className="flex flex-col items-center justify-end gap-4 md:flex-row">
      {/* Filter: Passport expiry range */}
      <Popover>
        <div className="relative w-full md:w-[260px]">
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start pr-8 text-left font-normal md:w-[260px]",
                !expiryFrom && !expiryTo && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {expiryFrom || expiryTo ? (
                <span className="truncate">
                  {expiryFrom ? format(new Date(expiryFrom), "dd MMM yyyy") : "..."} -{" "}
                  {expiryTo ? format(new Date(expiryTo), "dd MMM yyyy") : "..."}
                </span>
              ) : (
                "Passport expiry range"
              )}
            </Button>
          </PopoverTrigger>
          {(expiryFrom || expiryTo) && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
              onClick={(e) => {
                e.stopPropagation();
                setExpiryFrom("");
                setExpiryTo("");
                pushWithParams({
                  passportExpiryFrom: "",
                  passportExpiryTo: "",
                  page: 1,
                });
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar
            captionLayout="dropdown"
            mode="range"
            numberOfMonths={2}
            selected={{
              from: expiryFrom ? new Date(expiryFrom) : undefined,
              to: expiryTo ? new Date(expiryTo) : undefined,
            }}
            onSelect={(range) => {
              const from = range?.from ? format(range.from, "yyyy-MM-dd") : "";
              const to = range?.to ? format(range.to, "yyyy-MM-dd") : "";
              setExpiryFrom(from);
              setExpiryTo(to);
              pushWithParams({
                passportExpiryFrom: from,
                passportExpiryTo: to,
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
      <div className="relative w-full md:w-80">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search by name, email, or phone..."
          className="w-full pr-9 pl-9 md:w-80"
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
