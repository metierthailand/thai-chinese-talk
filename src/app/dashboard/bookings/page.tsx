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

interface Booking {
  id: string;
  customer: {
    firstName: string;
    lastName: string;
  };
  trip: {
    name: string;
    destination: string;
    startDate: string;
  };
  status: string;
  visaStatus: string;
  totalAmount: number;
  paidAmount: number;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await fetch("/api/bookings");
        if (!res.ok) throw new Error("Failed to fetch bookings");
        const data = await res.json();
        setBookings(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED": return "bg-green-500";
      case "PENDING": return "bg-yellow-500";
      case "CANCELLED": return "bg-red-500";
      case "COMPLETED": return "bg-blue-500";
      default: return "bg-gray-500";
    }
  };

  const getVisaStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED": return "bg-green-100 text-green-800 hover:bg-green-100";
      case "PENDING": return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "REJECTED": return "bg-red-100 text-red-800 hover:bg-red-100";
      default: return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bookings</h2>
          <p className="text-muted-foreground">
            Manage trip bookings and visa statuses.
          </p>
        </div>
        <Link href="/dashboard/bookings/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Booking
          </Button>
        </Link>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Trip</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Visa</TableHead>
              <TableHead>Payment</TableHead>
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
            ) : bookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No bookings found.
                </TableCell>
              </TableRow>
            ) : (
              bookings.map((booking) => (
                <TableRow
                  key={booking.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/dashboard/bookings/${booking.id}`)}
                >
                  <TableCell className="font-medium">
                    {booking.customer.firstName} {booking.customer.lastName}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{booking.trip.name}</span>
                      <span className="text-xs text-muted-foreground">{booking.trip.destination}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(booking.trip.startDate), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(booking.status)}>
                      {booking.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getVisaStatusColor(booking.visaStatus)}>
                      {booking.visaStatus.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span>Total: {booking.totalAmount.toLocaleString()}</span>
                      <span className={booking.paidAmount >= booking.totalAmount ? "text-green-600" : "text-yellow-600"}>
                        Paid: {booking.paidAmount.toLocaleString()}
                      </span>
                    </div>
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
