"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Search, X, Eye } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useCustomers, type Customer } from "./hooks/use-customers";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CustomersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get pagination and search from URL params
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const searchQuery = searchParams.get("search") || "";
  const typeFilter = searchParams.get("type") || "ALL";
  const passportExpiryFrom = searchParams.get("passportExpiryFrom") || "";
  const passportExpiryTo = searchParams.get("passportExpiryTo") || "";

  // Local state for search input (for controlled input)
  const [searchInput, setSearchInput] = useState(searchQuery);

  // Debounce search input to avoid too many API calls
  const debouncedSearch = useDebounce(searchInput, 500);

  // Ref to track if we're manually clearing (to prevent race condition)
  const isClearing = useRef(false);

  // Local state for filters
  const [type, setType] = useState(typeFilter || "ALL");
  const [expiryFrom, setExpiryFrom] = useState(passportExpiryFrom);
  const [expiryTo, setExpiryTo] = useState(passportExpiryTo);

  // Function to update URL params
  const updateSearchParams = useCallback(
    (updates: {
      page?: number;
      pageSize?: number;
      search?: string;
      type?: string;
      passportExpiryFrom?: string;
      passportExpiryTo?: string;
    }) => {
      const params = new URLSearchParams(searchParams.toString());

      if (updates.page !== undefined) {
        if (updates.page === 1) {
          params.delete("page");
        } else {
          params.set("page", updates.page.toString());
        }
      }

      if (updates.pageSize !== undefined) {
        if (updates.pageSize === 10) {
          params.delete("pageSize");
        } else {
          params.set("pageSize", updates.pageSize.toString());
        }
      }

      if (updates.search !== undefined) {
        if (updates.search === "") {
          params.delete("search");
        } else {
          params.set("search", updates.search);
        }
      }

      if (updates.type !== undefined) {
        if (updates.type === "ALL" || updates.type === "") {
          params.delete("type");
        } else {
          params.set("type", updates.type);
        }
      }

      if (updates.passportExpiryFrom !== undefined) {
        if (!updates.passportExpiryFrom) {
          params.delete("passportExpiryFrom");
        } else {
          params.set("passportExpiryFrom", updates.passportExpiryFrom);
        }
      }

      if (updates.passportExpiryTo !== undefined) {
        if (!updates.passportExpiryTo) {
          params.delete("passportExpiryTo");
        } else {
          params.set("passportExpiryTo", updates.passportExpiryTo);
        }
      }

      const newUrl = params.toString() ? `?${params.toString()}` : "";
      router.push(`/dashboard/customers${newUrl}`, { scroll: false });
    },
    [searchParams, router]
  );

  // Sync debounced search to URL (skip if we're clearing)
  useEffect(() => {
    if (isClearing.current) {
      return;
    }
    if (debouncedSearch !== searchQuery) {
      updateSearchParams({ search: debouncedSearch, page: 1 }); // Reset to page 1 when searching
    }
  }, [debouncedSearch, searchQuery, updateSearchParams]);

  // Sync URL search & filters to inputs (for browser back/forward)
  useEffect(() => {
    if (!isClearing.current && searchQuery !== searchInput) {
      setSearchInput(searchQuery);
    }
    if (typeFilter !== type) {
      setType(typeFilter || "ALL");
    }
    if (passportExpiryFrom !== expiryFrom) {
      setExpiryFrom(passportExpiryFrom);
    }
    if (passportExpiryTo !== expiryTo) {
      setExpiryTo(passportExpiryTo);
    }
    if (isClearing.current && searchQuery === "") {
      isClearing.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, typeFilter, passportExpiryFrom, passportExpiryTo]);

  const columns: ColumnDef<Customer>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => {
          const customer = row.original;
          return (
            <div className="font-medium">
              {`${customer.firstNameTh} ${customer.lastNameTh}`}
              <span className="text-muted-foreground ml-2 text-sm">
                ({customer.firstNameEn} {customer.lastNameEn})
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => {
          return (
            <Badge variant="outline">
              {row.original.type}
            </Badge>
          );
        },
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => {
          return <div>{row.original.email || "-"}</div>;
        },
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => {
          return <div>{row.original.phone || "-"}</div>;
        },
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Link href={`/dashboard/customers/${row.original.id}`}>
              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/dashboard/customers/${row.original.id}/edit`}>
              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                <Pencil className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        ),
      },
    ],
    []
  );

  // Use TanStack Query to fetch customers
  const { data: customersResponse, isLoading, error } = useCustomers(
    page,
    pageSize,
    searchQuery || undefined,
    type || undefined,
    expiryFrom || undefined,
    expiryTo || undefined
  );

  const customers = useMemo(() => customersResponse?.data ?? [], [customersResponse?.data]);
  const total = customersResponse?.total ?? 0;

  // Calculate page count
  const pageCount = useMemo(() => {
    if (total > 0 && pageSize > 0) {
      return Math.ceil(total / pageSize);
    }
    return 0;
  }, [total, pageSize]);

  const table = useDataTableInstance({
    data: customers,
    columns,
    enableRowSelection: false,
    defaultPageSize: pageSize,
    defaultPageIndex: page - 1,
    getRowId: (row) => row.id,
  });

  // Set manual pagination mode
  useEffect(() => {
    table.setOptions((prev) => ({
      ...prev,
      manualPagination: true,
      pageCount,
      data: customers,
    }));
  }, [pageCount, customers, table]);

  // Handlers for pagination changes
  const handlePageChange = useCallback(
    (newPageIndex: number) => {
      updateSearchParams({ page: newPageIndex + 1 });
    },
    [updateSearchParams]
  );

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      updateSearchParams({ pageSize: newPageSize, page: 1 }); // Reset to page 1 when changing page size
    },
    [updateSearchParams]
  );

  if (isLoading) {
    return (
      <div className="space-y-8 p-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">Loading customers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8 p-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-destructive">Failed to load customers. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
          <p className="text-muted-foreground">Manage your individual and corporate clients.</p>
        </div>
        <Link href="/dashboard/customers/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Customer
          </Button>
        </Link>
      </div>

      {/* Search form */}
      <div className="flex items-center justify-end gap-4">
        {/* Filter: Type */}
        <Select
          value={type}
          onValueChange={(value) => {
            setType(value);
            updateSearchParams({ type: value, page: 1 });
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Filter type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="INDIVIDUAL">Individual</SelectItem>
            <SelectItem value="CORPORATE">Corporate</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter: Passport expiry range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[260px] justify-start text-left font-normal",
                !expiryFrom && !expiryTo && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {expiryFrom || expiryTo ? (
                <span className="truncate">
                  {expiryFrom
                    ? format(new Date(expiryFrom), "dd MMM yyyy")
                    : "..."}{" "}
                  -{" "}
                  {expiryTo
                    ? format(new Date(expiryTo), "dd MMM yyyy")
                    : "..."}
                </span>
              ) : (
                "Passport expiry range"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              captionLayout="dropdown"
              mode="range"
              numberOfMonths={2}
              selected={{
                from: expiryFrom ? new Date(expiryFrom) : undefined,
                to: expiryTo ? new Date(expiryTo) : undefined,
              }}
              onSelect={(range) => {
                const from = range?.from
                  ? format(range.from, "yyyy-MM-dd")
                  : "";
                const to = range?.to
                  ? format(range.to, "yyyy-MM-dd")
                  : "";
                setExpiryFrom(from);
                setExpiryTo(to);
                updateSearchParams({
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

        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            className="pl-9 pr-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
              onClick={() => {
                isClearing.current = true;
                setSearchInput("");
                updateSearchParams({ search: "", page: 1 });
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="relative flex flex-col gap-4 overflow-auto">
        <div className="overflow-hidden rounded-md border">
          <DataTable
            table={table}
            columns={columns}
          />
        </div>
        <DataTablePagination
          table={table}
          total={total}
          pageSize={pageSize}
          pageIndex={page - 1}
          pageCount={pageCount}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    </div>
  );
}
