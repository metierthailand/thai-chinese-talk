"use client";

import { use, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useCommissionDetails, type CommissionDetail } from "../hooks/use-commissions";
import { Loading } from "@/components/page/loading";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";

export default function CommissionDetailPage({ params }: { params: Promise<{ agentId: string }> }) {
    const { agentId } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();

    const createdAtFrom = searchParams.get("createdAtFrom") || undefined;
    const createdAtTo = searchParams.get("createdAtTo") || undefined;
    const agentName = searchParams.get("agentName") || "";

    const { data: details, isLoading, error } = useCommissionDetails(agentId, createdAtFrom, createdAtTo);

    const columns: ColumnDef<CommissionDetail>[] = useMemo(
        () => [
            {
                accessorKey: "tripCode",
                header: "Trip code",
                cell: ({ row }) => <div className="font-mono">{row.original.tripCode}</div>,
            },
            {
                accessorKey: "customerName",
                header: "Customer name",
            },
            {
                accessorKey: "totalPeople",
                header: "Total people",
                cell: ({ row }) => row.original.totalPeople,
            },
            {
                accessorKey: "commissionAmount",
                header: "Total commission amount",
                cell: ({ row }) => (
                    <div className="font-medium">
                        {row.original.commissionAmount.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}{" "}
                        THB
                    </div>
                ),
            },
        ],
        [],
    );

    const totalPeople = details?.reduce((sum, d) => sum + d.totalPeople, 0) ?? 0;
    const totalCommission = details?.reduce((sum, d) => sum + d.commissionAmount, 0) ?? 0;

    // Always initialize table instance to keep hook order consistent
    const table = useDataTableInstance({
        data: details || [],
        columns,
        enableRowSelection: false,
        manualPagination: false,
    });

    if (isLoading) {
        return <Loading />;
    }

    if (error) {
        return (
            <div className="space-y-8 p-8">
                <div className="flex h-64 items-center justify-center">
                    <p className="text-destructive">Failed to load commission details. Please try again.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-sm text-muted-foreground">Sales</div>
                    <h1 className="text-3xl font-bold tracking-tight">{agentName || "Commission Detail"}</h1>
                    {(createdAtFrom || createdAtTo) && (
                        <p className="text-muted-foreground mt-1 text-sm">
                            Date range: {createdAtFrom ?? "..."} - {createdAtTo ?? "..."}
                        </p>
                    )}
                </div>
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
            </div>

            <div className="rounded-md border">
                <DataTable table={table} columns={columns} />
            </div>

            <div className="flex justify-end gap-6 text-sm">
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Total people</span>
                    <span className="font-semibold">{totalPeople}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Total commission</span>
                    <span className="font-semibold">
                        {totalCommission.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} THB
                    </span>
                </div>
            </div>
        </div>
    );
}
