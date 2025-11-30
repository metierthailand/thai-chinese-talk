"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerInteractions } from "@/app/dashboard/customers/_components/customer-interactions";
import { CustomerTasks } from "@/app/dashboard/customers/_components/customer-tasks";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { formatDecimal } from "@/lib/utils";
import type {
  CustomerLeadSummary,
  CustomerBookingSummary,
} from "@/app/dashboard/customers/hooks/use-customers";

interface CustomerTabsProps {
  customerId: string;
  leads: CustomerLeadSummary[];
  bookings: CustomerBookingSummary[];
}

export function CustomerTabs({
  customerId,
  leads,
  bookings,
}: CustomerTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "interactions";

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "interactions") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    const newUrl = params.toString() ? `?${params.toString()}` : "";
    router.push(`/dashboard/customers/${customerId}${newUrl}`, { scroll: false });
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="interactions">Interactions</TabsTrigger>
        <TabsTrigger value="tasks">Tasks</TabsTrigger>
        <TabsTrigger value="leads">Leads</TabsTrigger>
        <TabsTrigger value="bookings">Bookings</TabsTrigger>
      </TabsList>

      <TabsContent value="interactions" className="mt-6">
        <CustomerInteractions customerId={customerId} />
      </TabsContent>

      <TabsContent value="tasks" className="mt-6">
        <CustomerTasks customerId={customerId} />
      </TabsContent>

      <TabsContent value="leads" className="mt-6">
        <div className="space-y-4">
          {leads.length === 0 ? (
            <p className="text-muted-foreground">No leads found.</p>
          ) : (
            leads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between rounded-md border p-4">
                <div>
                  <div className="font-medium">{lead.destinationInterest || "General Inquiry"}</div>
                  <div className="text-muted-foreground text-sm">Status: {lead.status}</div>
                </div>
                <Link href={`/dashboard/leads/${lead.id}`}>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </Link>
              </div>
            ))
          )}
        </div>
      </TabsContent>

      <TabsContent value="bookings" className="mt-6">
        <div className="space-y-4">
          {bookings.length === 0 ? (
            <p className="text-muted-foreground">No bookings found.</p>
          ) : (
            bookings.map((booking) => (
              <Link key={booking.id} href={`/dashboard/bookings/${booking.id}`}>
                <div className="rounded-md border p-4">
                  <div className="font-medium">{booking.trip.name}</div>
                  <div className="text-muted-foreground text-sm">
                    {format(new Date(booking.trip.startDate), "PP")} - {format(new Date(booking.trip.endDate), "PP")}
                  </div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    Status: {booking.status} | Amount: {formatDecimal(booking.totalAmount)}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

