"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

const MONTHS = [
  { value: "1", label: "Jan" },
  { value: "2", label: "Feb" },
  { value: "3", label: "Mar" },
  { value: "4", label: "Apr" },
  { value: "5", label: "May" },
  { value: "6", label: "Jun" },
  { value: "7", label: "Jul" },
  { value: "8", label: "Aug" },
  { value: "9", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];

function getYears() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear - 10; y <= currentYear + 10; y++) {
    years.push({ value: String(y), label: String(y) });
  }
  return years;
}

function startOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1, 0, 0, 0, 0).toISOString();
}

function endOfMonth(year: number, month: number) {
  return new Date(year, month, 0, 23, 59, 59, 999).toISOString();
}

interface CommissionFilterProps {
  onFilterChange?: () => void;
  /** Hide search input (e.g. on agent detail page where filtering by sales name is not needed) */
  hideSearch?: boolean;
}

type UpdateParams = {
  search?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
};

export function CommissionFilter({ onFilterChange, hideSearch }: CommissionFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initial values from URL
  const searchQuery = searchParams.get("search") || "";
  const createdAtFromQuery = searchParams.get("createdAtFrom") || "";
  const createdAtToQuery = searchParams.get("createdAtTo") || "";

  // Local state (init จาก URL แค่ตอน mount)
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [createdAtFrom, setCreatedAtFrom] = useState(createdAtFromQuery);
  const [createdAtTo, setCreatedAtTo] = useState(createdAtToQuery);
  // Pending month/year when user has selected only one (so Select shows value until both are set)
  const [pendingMonth, setPendingMonth] = useState("");
  const [pendingYear, setPendingYear] = useState("");

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
    router.push(`${pathname}${newQuery}`, { scroll: false });
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
    if (!createdAtFromQuery) {
      setPendingMonth("");
      setPendingYear("");
    }
  }, [searchQuery, createdAtFromQuery, createdAtToQuery]);

  const years = useMemo(() => getYears(), []);

  // Derive month/year: from URL when filter is applied, else from pending (partial selection)
  const dateFrom = createdAtFrom ? new Date(createdAtFrom) : null;
  const selectedMonth = dateFrom
    ? String(dateFrom.getMonth() + 1)
    : pendingMonth;
  const selectedYear = dateFrom
    ? String(dateFrom.getFullYear())
    : pendingYear;

  const applyMonthYear = (month: string, year: string) => {
    if (!month || !year) {
      setPendingMonth(month);
      setPendingYear(year);
      return;
    }
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const from = startOfMonth(y, m);
    const to = endOfMonth(y, m);
    setPendingMonth("");
    setPendingYear("");
    setCreatedAtFrom(from);
    setCreatedAtTo(to);
    pushWithParams({ createdAtFrom: from, createdAtTo: to });
  };

  const displayLabel =
    selectedMonth && selectedYear
      ? `${MONTHS.find((m) => m.value === selectedMonth)?.label ?? selectedMonth} ${selectedYear}`
      : selectedMonth
        ? MONTHS.find((m) => m.value === selectedMonth)?.label ?? selectedMonth
        : selectedYear
          ? selectedYear
          : "Month / Year";

  return (
    <div className="flex flex-col items-end justify-end gap-4 lg:flex-row">
      <div className="flex w-full flex-col gap-4 lg:w-auto lg:flex-row">
        {/* Filter: Trip start month/year (single month) */}
        <Popover>
          <div className="relative w-full lg:w-[280px]">
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start pr-8 text-left font-normal lg:w-[280px]",
                  !createdAtFrom &&
                    !createdAtTo &&
                    !pendingMonth &&
                    !pendingYear &&
                    "text-muted-foreground",
                )}
              >
                <span className="truncate">{displayLabel}</span>
              </Button>
            </PopoverTrigger>
            {(createdAtFrom || createdAtTo || pendingMonth || pendingYear) && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingMonth("");
                  setPendingYear("");
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
            <div className="flex flex-col gap-3 p-4">
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={selectedMonth}
                  onValueChange={(v) => applyMonthYear(v, selectedYear)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedYear}
                  onValueChange={(v) => applyMonthYear(selectedMonth, v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y.value} value={y.value}>
                        {y.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Search (hidden on agent detail page) */}
      {!hideSearch && (
        <div className="relative w-full flex-1 lg:max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search by sales name"
            className="w-full pr-9 pl-9 lg:w-full lg:max-w-sm"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
