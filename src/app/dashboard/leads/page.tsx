"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface Lead {
  id: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
  };
  status: string;
  source: string;
  destinationInterest: string | null;
  potentialValue: number | null;
  updatedAt: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const res = await fetch("/api/leads");
        if (!res.ok) throw new Error("Failed to fetch leads");
        const data = await res.json();
        setLeads(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, []);

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

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sales Pipeline</h2>
          <p className="text-muted-foreground">
            Track and manage your sales leads.
          </p>
        </div>
        <Link href="/dashboard/leads/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Lead
          </Button>
        </Link>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No leads found.
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                >
                  <TableCell className="font-medium">
                    {lead.customer.firstName} {lead.customer.lastName}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(lead.status)}>
                      {lead.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{lead.destinationInterest || "-"}</TableCell>
                  <TableCell>
                    {lead.potentialValue
                      ? new Intl.NumberFormat("th-TH", {
                          style: "currency",
                          currency: "THB",
                        }).format(lead.potentialValue)
                      : "-"}
                  </TableCell>
                  <TableCell>{lead.source}</TableCell>
                  <TableCell>
                    {format(new Date(lead.updatedAt), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
