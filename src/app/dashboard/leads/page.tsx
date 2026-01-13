"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Pencil } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { DataTable } from "@/components/data-table/data-table";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useLeads, type Lead } from "./hooks/use-leads";
import { useLeadsParams, mapLeadsParamsToQuery } from "./hooks/use-leads-params";
import { LeadFilter } from "./_components/lead-filter";
import { Loading } from "@/components/page/loading";

export default function LeadsPage() {
  const router = useRouter();

  // --------------------
  // params
  // --------------------
  const { page, pageSize, search, status, source, customerId, setParams } = useLeadsParams();

  const leadsQuery = mapLeadsParamsToQuery({
    page,
    pageSize,
    search,
    status,
    source,
    customerId,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "INTERESTED":
        return "bg-blue-500";
      case "BOOKED":
        return "bg-green-500";
      case "COMPLETED":
        return "bg-emerald-500";
      case "CANCELLED":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const columns: ColumnDef<Lead>[] = useMemo(
    () => [
      {
        accessorKey: "tripInterest",
        header: "Trip Interest",
        cell: ({ row }) => row.original.tripInterest || "-",
      },
      {
        accessorKey: "customer",
        header: "Customer",
        cell: ({ row }) => {
          const lead = row.original;
          if (lead.newCustomer) {
            return (
              <div className="flex flex-col">
                <Badge variant="outline" className="mt-1 w-fit">
                  New
                </Badge>
                <span className="font-medium">
                  {lead.firstName} {lead.lastName}
                </span>
                <span className="text-muted-foreground text-xs">{lead.email || lead.phoneNumber || "-"}</span>
              </div>
            );
          }
          const customer = lead.customer;
          if (!customer) return <div className="text-muted-foreground">-</div>;
          return (
            <div className="flex flex-col">
              <span className="font-medium">
                {customer.firstNameTh} {customer.lastNameTh}
              </span>
              <span className="text-muted-foreground text-xs">
                ({customer.firstNameEn} {customer.lastNameEn})
              </span>
              <span className="text-muted-foreground text-xs">{customer.email || "-"}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "phoneNumber",
        header: "Phone",
        cell: ({ row }) => row.original.phoneNumber || "-",
      },
      {
        accessorKey: "pax",
        header: "Pax",
        cell: ({ row }) => row.original.pax || "-",
      },
      {
        accessorKey: "salesUser",
        header: "Sales Name",
        cell: ({ row }) => {
          const salesUser = row.original.salesUser;
          if (!salesUser) return <div className="text-muted-foreground">-</div>;
          return (
            <div>
              {salesUser.firstName} {salesUser.lastName}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge className={getStatusColor(row.original.status)}>{row.original.status.replace("_", " ")}</Badge>
        ),
      },
      {
        accessorKey: "source",
        header: "Source",
        cell: ({ row }) => row.original.source,
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Link href={`/dashboard/leads/${row.original.id}`}>
              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/dashboard/leads/${row.original.id}/edit`}>
              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                <Pencil className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        ),
      },
    ],
    [],
  );

  // --------------------
  // data fetching
  // --------------------
  const {
    data: leadsResponse,
    isLoading,
    error,
  } = useLeads(
    leadsQuery.page,
    leadsQuery.pageSize,
    leadsQuery.search,
    leadsQuery.status,
    leadsQuery.source,
    leadsQuery.customerId,
  );

  const leads = useMemo(() => leadsResponse?.data ?? [], [leadsResponse?.data]);
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
    manualPagination: true,
    pageCount,
    getRowId: (row) => row.id,
  });

  // --------------------
  // handlers
  // --------------------
  const handlePageChange = useCallback(
    (newPageIndex: number) => {
      setParams({ page: newPageIndex + 1 });
    },
    [setParams],
  );

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      setParams({ pageSize: newPageSize, page: 1 });
    },
    [setParams],
  );

  // --------------------
  // states
  // --------------------
  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="space-y-8 p-8">
        <div className="flex h-64 items-center justify-center">
          <p className="text-destructive">Failed to load leads. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Leads</h2>
          <p className="text-muted-foreground">Track and manage your leads.</p>
        </div>
        <Link href="/dashboard/leads/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Lead
          </Button>
        </Link>
      </div>

      {/* Filter & Search form */}
      <LeadFilter />

      <div className="relative flex flex-col gap-4 overflow-auto">
        <div className="overflow-hidden rounded-md border">
          <DataTable table={table} columns={columns} onRowClick={(row) => router.push(`/dashboard/leads/${row.id}`)} />
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
