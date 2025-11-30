"use client";

import { useMemo, useCallback } from "react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Plus, Pencil, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { CustomerFilter } from "./_components/customer-filter";
import { Loading } from "@/components/page/loading";

import { useCustomers, type Customer } from "./hooks/use-customers";
import { mapCustomerParamsToQuery, useCustomerParams } from "./hooks/use-customer-params";
// --------------------
// columns
// --------------------
const customerColumns: ColumnDef<Customer>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const customer = row.original;
      return (
        <div className="flex flex-col font-medium">
          <p>{`${customer.firstNameTh} ${customer.lastNameTh}`}</p>
          <p className="text-muted-foreground text-xs">
            ({customer.firstNameEn} {customer.lastNameEn})
          </p>
        </div>
      );
    },
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => <Badge variant="outline">{row.original.type}</Badge>,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => <div>{row.original.email || "-"}</div>,
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => <div>{row.original.phone || "-"}</div>,
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
];

export default function CustomersPage() {
  // --------------------
  // params
  // --------------------
  const { page, pageSize, search, type, passportExpiryFrom, passportExpiryTo, setParams } = useCustomerParams();

  const customerQuery = mapCustomerParamsToQuery({
    page,
    pageSize,
    search,
    type,
    passportExpiryFrom,
    passportExpiryTo,
  });

  // --------------------
  // data fetching
  // --------------------
  const { data, isLoading, error } = useCustomers(customerQuery);

  const customers = data?.data ?? [];
  const total = data?.total ?? 0;

  const pageCount = useMemo(() => {
    if (!total || !pageSize) return 0;
    return Math.ceil(total / pageSize);
  }, [total, pageSize]);

  // --------------------
  // table instance
  // --------------------
  const table = useDataTableInstance({
    data: customers,
    columns: customerColumns,
    enableRowSelection: false,
    manualPagination: true,
    pageCount,
    defaultPageSize: pageSize,
    defaultPageIndex: page - 1,
    getRowId: (row) => row.id,
  });

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
          <p className="text-destructive">Failed to load customers. Please try again.</p>
        </div>
      </div>
    );
  }

  // --------------------
  // render
  // --------------------
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

      {/* Filter & Search form */}
      <CustomerFilter />

      <div className="relative flex flex-col gap-4 overflow-auto">
        <div className="overflow-hidden rounded-md border">
          <DataTable table={table} columns={customerColumns} />
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
