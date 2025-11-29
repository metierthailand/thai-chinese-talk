"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Pencil, Search, X } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { DataTable } from "@/components/data-table/data-table";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useLeads, type Lead } from "./hooks/use-leads";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function LeadsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const searchQuery = searchParams.get("search") || "";
  const statusFilter = searchParams.get("status") || "ALL";
  const sourceFilter = searchParams.get("source") || "ALL";
  const minPotentialQuery = searchParams.get("minPotential") || "";
  const maxPotentialQuery = searchParams.get("maxPotential") || "";

  const [searchInput, setSearchInput] = useState(searchQuery);
  const debouncedSearch = useDebounce(searchInput, 500);
  const isClearing = useRef(false);

  const [status, setStatus] = useState(statusFilter || "ALL");
  const [source, setSource] = useState(sourceFilter || "ALL");
  const [minPotential, setMinPotential] = useState(minPotentialQuery);
  const [maxPotential, setMaxPotential] = useState(maxPotentialQuery);
  const debouncedMinPotential = useDebounce(minPotential, 500);
  const debouncedMaxPotential = useDebounce(maxPotential, 500);

  const updateSearchParams = useCallback(
    (updates: {
      page?: number;
      pageSize?: number;
      search?: string;
      status?: string;
      source?: string;
      minPotential?: string;
      maxPotential?: string;
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

      if (updates.status !== undefined) {
        if (updates.status === "ALL" || updates.status === "") {
          params.delete("status");
        } else {
          params.set("status", updates.status);
        }
      }

      if (updates.source !== undefined) {
        if (updates.source === "ALL" || updates.source === "") {
          params.delete("source");
        } else {
          params.set("source", updates.source);
        }
      }

      if (updates.minPotential !== undefined) {
        if (!updates.minPotential) {
          params.delete("minPotential");
        } else {
          params.set("minPotential", updates.minPotential);
        }
      }

      if (updates.maxPotential !== undefined) {
        if (!updates.maxPotential) {
          params.delete("maxPotential");
        } else {
          params.set("maxPotential", updates.maxPotential);
        }
      }

      const newUrl = params.toString() ? `?${params.toString()}` : "";
      router.push(`/dashboard/leads${newUrl}`, { scroll: false });
    },
    [searchParams, router]
  );

  // Sync debounced search to URL
  useEffect(() => {
    if (isClearing.current) {
      return;
    }
    if (debouncedSearch !== searchQuery) {
      updateSearchParams({ search: debouncedSearch, page: 1 });
    }
  }, [debouncedSearch, searchQuery, updateSearchParams]);

  // Sync debounced budget range to URL
  useEffect(() => {
    if (isClearing.current) {
      return;
    }
    if (
      debouncedMinPotential !== minPotentialQuery ||
      debouncedMaxPotential !== maxPotentialQuery
    ) {
      updateSearchParams({
        minPotential: debouncedMinPotential || undefined,
        maxPotential: debouncedMaxPotential || undefined,
        page: 1,
      });
    }
  }, [
    debouncedMinPotential,
    debouncedMaxPotential,
    minPotentialQuery,
    maxPotentialQuery,
    updateSearchParams,
  ]);

  // Sync URL search & filters to inputs
  useEffect(() => {
    if (!isClearing.current && searchQuery !== searchInput) {
      setSearchInput(searchQuery);
    }
    if (statusFilter !== status) {
      setStatus(statusFilter || "ALL");
    }
    if (sourceFilter !== source) {
      setSource(sourceFilter || "ALL");
    }
    if (minPotentialQuery !== minPotential) {
      setMinPotential(minPotentialQuery);
    }
    if (maxPotentialQuery !== maxPotential) {
      setMaxPotential(maxPotentialQuery);
    }
    if (isClearing.current && searchQuery === "") {
      isClearing.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchQuery,
    statusFilter,
    sourceFilter,
    minPotentialQuery,
    maxPotentialQuery,
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "NEW":
        return "bg-blue-500";
      case "QUOTED":
        return "bg-yellow-500";
      case "FOLLOW_UP":
        return "bg-purple-500";
      case "CLOSED_WON":
        return "bg-green-500";
      case "CLOSED_LOST":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const columns: ColumnDef<Lead>[] = useMemo(
    () => [
      {
        accessorKey: "customer",
        header: "Customer",
        cell: ({ row }) => {
          const customer = row.original.customer;
          return (
            <div className="flex flex-col">
              <span className="font-medium">
                {customer.firstNameTh} {customer.lastNameTh}
              </span>
              <span className="text-xs text-muted-foreground">
                ({customer.firstNameEn} {customer.lastNameEn})
              </span>
              <span className="text-xs text-muted-foreground">
                {customer.email || "-"}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge className={getStatusColor(row.original.status)}>
            {row.original.status.replace("_", " ")}
          </Badge>
        ),
      },
      {
        accessorKey: "destinationInterest",
        header: "Destination",
        cell: ({ row }) => row.original.destinationInterest || "-",
      },
      {
        accessorKey: "potentialValue",
        header: "Value",
        cell: ({ row }) =>
          row.original.potentialValue
            ? new Intl.NumberFormat("th-TH", {
                style: "currency",
                currency: "THB",
              }).format(row.original.potentialValue)
            : "-",
      },
      {
        accessorKey: "source",
        header: "Source",
        cell: ({ row }) => row.original.source,
      },
      {
        accessorKey: "updatedAt",
        header: "Last Updated",
        cell: ({ row }) =>
          format(new Date(row.original.updatedAt), "dd MMM yyyy"),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Link href={`/dashboard/leads/${row.original.id}`}>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => e.stopPropagation()}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/dashboard/leads/${row.original.id}/edit`}>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => e.stopPropagation()}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        ),
      },
    ],
    []
  );

  const { data: leadsResponse, isLoading, error } = useLeads(
    page,
    pageSize,
    searchQuery || undefined,
    status || undefined,
    source || undefined,
    debouncedMinPotential || undefined,
    debouncedMaxPotential || undefined
  );

  const leads = useMemo(
    () => leadsResponse?.data ?? [],
    [leadsResponse?.data]
  );
  const total = leadsResponse?.total ?? 0;

  const pageCount = useMemo(() => {
    if (total > 0 && pageSize > 0) {
      return Math.ceil(total / pageSize);
    }
    return 0;
  }, [total, pageSize]);

  const table = useDataTableInstance({
    data: leads,
    columns,
    enableRowSelection: false,
    defaultPageSize: pageSize,
    defaultPageIndex: page - 1,
    getRowId: (row) => row.id,
  });

  useEffect(() => {
    table.setOptions((prev) => ({
      ...prev,
      manualPagination: true,
      pageCount,
      data: leads,
    }));
  }, [pageCount, leads, table]);

  const handlePageChange = useCallback(
    (newPageIndex: number) => {
      updateSearchParams({ page: newPageIndex + 1 });
    },
    [updateSearchParams]
  );

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      updateSearchParams({ pageSize: newPageSize, page: 1 });
    },
    [updateSearchParams]
  );

  if (isLoading) {
    return (
      <div className="space-y-8 p-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">Loading leads...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8 p-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-destructive">
            Failed to load leads. Please try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sales Pipeline</h2>
          <p className="text-muted-foreground">
            Track and manage your sales leads.
          </p>
        </div>
        <Link href="/dashboard/leads/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Lead
          </Button>
        </Link>
      </div>

      {/* Search & filters */}
      <div className="flex items-center justify-end gap-4">
        {/* Status filter */}
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            updateSearchParams({ status: value, page: 1 });
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="NEW">New</SelectItem>
            <SelectItem value="QUOTED">Quoted</SelectItem>
            <SelectItem value="FOLLOW_UP">Follow Up</SelectItem>
            <SelectItem value="CLOSED_WON">Closed Won</SelectItem>
            <SelectItem value="CLOSED_LOST">Closed Lost</SelectItem>
          </SelectContent>
        </Select>

        {/* Source filter */}
        <Select
          value={source}
          onValueChange={(value) => {
            setSource(value);
            updateSearchParams({ source: value, page: 1 });
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Sources</SelectItem>
            <SelectItem value="WEBSITE">Website</SelectItem>
            <SelectItem value="WALKIN">Walk-in</SelectItem>
            <SelectItem value="REFERRAL">Referral</SelectItem>
            <SelectItem value="SOCIAL">Social Media</SelectItem>
            <SelectItem value="LINE">LINE</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>

        {/* Budget range filter (potentialValue) */}
        <div className="flex items-center gap-2">
          <Input
            type="number"
            className="w-24"
            placeholder="Min ฿"
            value={minPotential}
            onChange={(e) => {
              setMinPotential(e.target.value);
            }}
          />
          <span className="text-muted-foreground text-sm">-</span>
          <Input
            type="number"
            className="w-24"
            placeholder="Max ฿"
            value={maxPotential}
            onChange={(e) => {
              setMaxPotential(e.target.value);
            }}
          />
        </div>

        {/* Search by customer name */}
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search customer name (TH/EN)..."
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
            onRowClick={(row) => router.push(`/dashboard/leads/${row.id}`)}
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
