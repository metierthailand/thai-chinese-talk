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

interface TaskFilterProps {
  onFilterChange?: () => void;
}

type UpdateParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  deadlineFrom?: string;
  deadlineTo?: string;
};

export function TaskFilter({ onFilterChange }: TaskFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initial values from URL
  const searchQuery = searchParams.get("search") || "";
  const statusQuery = searchParams.get("status") || "";
  const deadlineFromQuery = searchParams.get("deadlineFrom") || "";
  const deadlineToQuery = searchParams.get("deadlineTo") || "";

  // Local state (init จาก URL แค่ตอน mount)
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [status, setStatus] = useState(statusQuery || "ALL");
  const [deadlineFrom, setDeadlineFrom] = useState(deadlineFromQuery);
  const [deadlineTo, setDeadlineTo] = useState(deadlineToQuery);

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
    setParam("status", updates.status, "ALL");
    setParam("deadlineFrom", updates.deadlineFrom);
    setParam("deadlineTo", updates.deadlineTo);

    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  const pushWithParams = (updates: UpdateParams) => {
    const newQuery = buildQueryString(updates);
    router.push(`/dashboard/tasks${newQuery}`, { scroll: false });
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
    setStatus(statusQuery || "ALL");
    setDeadlineFrom(deadlineFromQuery);
    setDeadlineTo(deadlineToQuery);
  }, [searchQuery, statusQuery, deadlineFromQuery, deadlineToQuery]);

  return (
    <div className="flex flex-col items-end justify-end gap-4 lg:flex-row">
      <div className="flex w-full flex-col gap-4 lg:w-auto lg:flex-row">
        {/* Filter: Status */}
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            pushWithParams({ status: value, page: 1 });
          }}
        >
          <SelectTrigger className="w-full lg:w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="TODO">To-do</SelectItem>
            <SelectItem value="IN_PROGRESS">In progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter: Deadline date range */}
        <Popover>
          <div className="relative w-full lg:w-[260px]">
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start pr-8 text-left font-normal lg:w-[260px]",
                  !deadlineFrom && !deadlineTo && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {deadlineFrom || deadlineTo ? (
                  <span className="truncate">
                    {deadlineFrom ? format(new Date(deadlineFrom), "dd MMM yyyy") : "..."} -{" "}
                    {deadlineTo ? format(new Date(deadlineTo), "dd MMM yyyy") : "..."}
                  </span>
                ) : (
                  "Deadline date range"
                )}
              </Button>
            </PopoverTrigger>
            {(deadlineFrom || deadlineTo) && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeadlineFrom("");
                  setDeadlineTo("");
                  pushWithParams({
                    deadlineFrom: "",
                    deadlineTo: "",
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
                from: deadlineFrom ? new Date(deadlineFrom) : undefined,
                to: deadlineTo ? new Date(deadlineTo) : undefined,
              }}
              onSelect={(range) => {
                const from = range?.from ? format(range.from, "yyyy-MM-dd") : "";
                const to = range?.to ? format(range.to, "yyyy-MM-dd") : "";
                setDeadlineFrom(from);
                setDeadlineTo(to);
                pushWithParams({
                  deadlineFrom: from,
                  deadlineTo: to,
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
          placeholder="Search by topic, customer name"
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
