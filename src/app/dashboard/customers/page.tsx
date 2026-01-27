"use client";

import { useMemo, useCallback } from "react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Edit, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { CustomerFilter } from "./_components/customer-filter";
import { Loading } from "@/components/page/loading";

import { CustomerWithTotalTrips, useCustomers } from "./hooks/use-customers";
import { mapCustomerParamsToQuery, useCustomerParams } from "./hooks/use-customers-params";
import { format } from "date-fns";
// --------------------
// columns
// --------------------
const customerColumns: ColumnDef<CustomerWithTotalTrips>[] = [
  {
    accessorKey: "name",
    header: "Customer name",
    cell: ({ row }) => {
      const customer = row.original;
      const hasThaiName = customer.firstNameTh && customer.lastNameTh;
      const thaiName = hasThaiName ? `${customer.firstNameTh} ${customer.lastNameTh}` : null;
      const englishName = `${customer.firstNameEn} ${customer.lastNameEn}`;

      return (
        <div className="flex flex-col font-medium max-w-[240px] truncate">
          <p>{englishName}</p>
          {thaiName && (
            <p className="text-muted-foreground text-xs">
              ({thaiName})
            </p>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "phoneNumber",
    header: "Phone number",
    cell: ({ row }) => <div>{row.original.phoneNumber || "-"}</div>,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => <div className="max-w-[180px] truncate">{row.original.email || "-"}</div>,
  },
  {
    accessorKey: "dateOfBirth",
    header: "Date of birth",
    cell: ({ row }) => <div>{format(new Date(row.original.dateOfBirth || ""), "dd MMM yyyy")}</div>,
  },
  {
    accessorKey: "totalTrips",
    header: "Total trips",
    cell: ({ row }) => <div>{row.original.totalTrips || "-"}</div>,
  },
  {
    accessorKey: "tags",
    header: "Tags",
    cell: ({ row }) => <div className="max-w-[100px] truncate">{row.original.tags.map((tag) => tag.tag.name).join(", ")}</div>,
  },
  {
    accessorKey: "createdAt",
    header: "Created date",
    cell: ({ row }) => <div>{format(new Date(row.original.createdAt || ""), "dd MMM yyyy")}</div>,
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
            <Edit className="h-4 w-4" />
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
  const { page, pageSize, search, type, passportExpiryFrom, passportExpiryTo, tagIds, setParams } = useCustomerParams();

  const customerQuery = mapCustomerParamsToQuery({
    page,
    pageSize,
    search,
    type,
    passportExpiryFrom,
    passportExpiryTo,
    tagIds,
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
  // render
  // --------------------
  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Customers</h2>
          <p className="text-muted-foreground">Manage your individual and corporate clients.</p>
        </div>
        {/* <Link href="/dashboard/customers/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Customer
          </Button>
        </Link> */}
      </div>

      {/* Filter & Search form */}
      <CustomerFilter />

      <div className="relative flex flex-col gap-4 overflow-auto">
        {isLoading ? (
          <Loading />
        ) : error ? (
          <div className="space-y-8 p-8">
            <div className="flex h-64 items-center justify-center">
              <p className="text-destructive">Failed to load customers. Please try again.</p>
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
