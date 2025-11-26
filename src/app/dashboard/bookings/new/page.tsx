"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";

const formSchema = z.object({
  customerId: z.string().min(1, { message: "Customer is required" }),
  tripId: z.string().min(1, { message: "Trip is required" }),
  totalAmount: z.string().min(1, { message: "Total amount is required" }),
  paidAmount: z.string().optional(),
  status: z.string().optional(),
  visaStatus: z.string().optional(),
});

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
}

interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  price: number;
  maxCapacity: number;
  _count: { bookings: number };
}

export default function NewBookingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [customersRes, tripsRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/trips"),
      ]);

      if (customersRes.ok) {
        setCustomers(await customersRes.json());
      }
      if (tripsRes.ok) {
        setTrips(await tripsRes.json());
      }
    };
    fetchData();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: "",
      tripId: "",
      totalAmount: "",
      paidAmount: "0",
      status: "PENDING",
      visaStatus: "NOT_REQUIRED",
    },
  });

  const handleTripChange = (tripId: string) => {
    form.setValue("tripId", tripId);
    const selectedTrip = trips.find((t) => t.id === tripId);
    if (selectedTrip && selectedTrip.price) {
      form.setValue("totalAmount", selectedTrip.price.toString());
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const selectedTrip = trips.find((t) => t.id === values.tripId);
      
      // Construct payload matching the new API expectation (if API was updated to take tripId)
      // Or if API still expects flat fields, we map them here.
      // Let's assume we updated API to take tripId, OR we send the flat fields derived from trip.
      // Wait, I haven't updated the Booking POST API yet to accept tripId!
      // I need to update the API first or send the flat fields.
      // Actually, the schema change REMOVED tripName, destination, startDate, endDate from Booking.
      // So the API MUST be updated to accept tripId.
      
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        throw new Error("Failed to create booking");
      }

      router.push("/dashboard/bookings");
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 space-y-8 max-w-2xl mx-auto">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">New Booking</h2>
      </div>

      <div className="rounded-md border p-6 bg-card">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.firstName} {customer.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tripId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Trip</FormLabel>
                  <Select
                    onValueChange={handleTripChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a trip package" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {trips.map((trip) => (
                        <SelectItem key={trip.id} value={trip.id} disabled={trip._count.bookings >= trip.maxCapacity}>
                          {trip.name} ({format(new Date(trip.startDate), "dd MMM")} - {format(new Date(trip.endDate), "dd MMM")}) 
                          {trip._count.bookings >= trip.maxCapacity ? " [FULL]" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Amount (THB)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paidAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paid Amount (THB)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Booking Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        <SelectItem value="REFUNDED">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="visaStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visa Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="NOT_REQUIRED">Not Required</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Booking"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
