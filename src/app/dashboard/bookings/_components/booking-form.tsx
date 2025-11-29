"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useSearchCustomers, useCustomer } from "@/app/dashboard/customers/hooks/use-customers";
import { Booking } from "../hooks/use-bookings";

const formSchema = z.object({
  customerId: z.string().min(1, { message: "Customer is required" }),
  tripId: z.string().min(1, { message: "Trip is required" }),
  totalAmount: z.string().min(1, { message: "Total amount is required" }),
  paidAmount: z.string().optional(),
  status: z.string().optional(),
  visaStatus: z.string().optional(),
});

export type BookingFormValues = z.infer<typeof formSchema>;

interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  price?: number | null;
  maxCapacity: number;
  _count: { bookings: number };
}

interface BookingFormProps {
  mode: "create" | "edit" | "view";
  initialData?: Partial<BookingFormValues>;
  onSubmit?: (values: BookingFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  booking?: Booking; // For fallback values in edit mode
}

export function BookingForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  booking,
}: BookingFormProps) {
  const readOnly = mode === "view";
  const [trips, setTrips] = useState<Trip[]>([]);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");

  const form = useForm<BookingFormValues>({
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

  const customerId = form.watch("customerId");
  const { data: searchResults = [], isLoading: isSearching } = useSearchCustomers(
    customerSearchQuery,
    10
  );
  const { data: selectedCustomerData } = useCustomer(
    customerId && !searchResults.find((c) => c.id === customerId) ? customerId : undefined
  );

  // If booking is loaded and customerId is set, fetch customer data for display (edit mode)
  const { data: bookingCustomerData } = useCustomer(
    booking?.customerId && !selectedCustomerData && mode === "edit" ? booking.customerId : undefined
  );

  // Find selected customer to display name
  const selectedCustomer = useMemo(() => {
    if (!customerId) {
      // If no customerId in form but booking has customer data, use booking customer (edit mode)
      if (booking?.customer && mode === "edit") {
        return {
          id: booking.customerId,
          firstNameTh: booking.customer.firstNameTh,
          lastNameTh: booking.customer.lastNameTh,
          firstNameEn: booking.customer.firstNameEn,
          lastNameEn: booking.customer.lastNameEn,
          email: booking.customer.email || "",
          phone: "",
        };
      }
      return null;
    }
    // Try to find in search results first
    const found = searchResults.find((c) => c.id === customerId);
    if (found) return found;
    // If not found, use fetched customer data
    if (selectedCustomerData) return selectedCustomerData;
    // If still not found and booking has customer data, use booking customer (edit mode)
    if (booking?.customer && booking.customerId === customerId && mode === "edit") {
      return {
        id: booking.customerId,
        firstNameTh: booking.customer.firstNameTh,
        lastNameTh: booking.customer.lastNameTh,
        firstNameEn: booking.customer.firstNameEn,
        lastNameEn: booking.customer.lastNameEn,
        email: booking.customer.email || "",
        phone: "",
      };
    }
    return bookingCustomerData || null;
  }, [customerId, searchResults, selectedCustomerData, booking, bookingCustomerData, mode]);

  useEffect(() => {
    const fetchTrips = async () => {
      // Fetch all trips for dropdown (use large pageSize to get all)
      const tripsRes = await fetch("/api/trips?page=1&pageSize=1000");
      if (tripsRes.ok) {
        const response = await tripsRes.json();
        setTrips(response.data || []);
      }
    };
    fetchTrips();
  }, []);

  // Reset form when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      form.reset({
        customerId: initialData.customerId || "",
        tripId: initialData.tripId || "",
        totalAmount: initialData.totalAmount || "",
        paidAmount: initialData.paidAmount || "0",
        status: initialData.status || "PENDING",
        visaStatus: initialData.visaStatus || "NOT_REQUIRED",
      });
    }
  }, [initialData, form]);

  const handleTripChange = (tripId: string) => {
    form.setValue("tripId", tripId);
    const selectedTrip = trips.find((t) => t.id === tripId);
    if (selectedTrip && selectedTrip.price) {
      form.setValue("totalAmount", selectedTrip.price.toString());
    }
  };

  async function handleSubmit(values: BookingFormValues) {
    if (!onSubmit || readOnly) return;
    // Transform empty strings to undefined for status and visaStatus
    const transformedValues: BookingFormValues = {
      ...values,
      status: values.status === "" ? undefined : values.status,
      visaStatus: values.visaStatus === "" ? undefined : values.visaStatus,
    };
    await onSubmit(transformedValues);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="customerId"
          render={({ field }) => (
              <FormItem className="flex flex-col">
              <FormLabel>Customer</FormLabel>
              {readOnly ? (
                <FormControl>
                  <Input
                    value={
                      selectedCustomer
                        ? `${selectedCustomer.firstNameTh} ${selectedCustomer.lastNameTh} (${selectedCustomer.firstNameEn} ${selectedCustomer.lastNameEn})`
                        : ""
                    }
                    disabled
                  />
                </FormControl>
              ) : (
                <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {selectedCustomer
                          ? `${selectedCustomer.firstNameTh} ${selectedCustomer.lastNameTh} (${selectedCustomer.firstNameEn} ${selectedCustomer.lastNameEn})`
                          : "Search for a customer..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Search customers by name, email, or phone..."
                      value={customerSearchQuery}
                      onValueChange={setCustomerSearchQuery}
                    />
                    <CommandList>
                      {isSearching ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          Searching...
                        </div>
                      ) : searchResults.length === 0 ? (
                        <CommandEmpty>
                          {customerSearchQuery ? "No customers found." : "Start typing to search..."}
                        </CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {searchResults.map((customer) => (
                            <CommandItem
                              value={customer.id}
                              key={customer.id}
                              onSelect={() => {
                                field.onChange(customer.id);
                                setCustomerSearchOpen(false);
                                setCustomerSearchQuery("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  customer.id === field.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {customer.firstNameTh} {customer.lastNameTh}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {customer.firstNameEn} {customer.lastNameEn}
                                  {customer.email && ` • ${customer.email}`}
                                  {customer.phone && ` • ${customer.phone}`}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              )}
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
              {readOnly ? (
                <FormControl>
                  <Input
                    value={
                      booking?.trip
                        ? `${booking.trip.name} (${format(new Date(booking.trip.startDate), "dd MMM")} - ${format(new Date(booking.trip.endDate), "dd MMM")})`
                        : trips.find((t) => t.id === field.value)?.name || ""
                    }
                    disabled
                  />
                </FormControl>
              ) : (
                <Select
                  onValueChange={handleTripChange}
                  value={field.value || (mode === "edit" && booking?.tripId) || ""}
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
              )}
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
                  <Input type="number" placeholder="0.00" {...field} disabled={readOnly} />
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
                  <Input type="number" placeholder="0.00" {...field} disabled={readOnly} />
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
                {readOnly ? (
                  <FormControl>
                    <Input
                      value={field.value || booking?.status || ""}
                      disabled
                    />
                  </FormControl>
                ) : (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || (mode === "edit" && booking?.status) || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
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
                )}
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
                {readOnly ? (
                  <FormControl>
                    <Input
                      value={field.value || booking?.visaStatus || ""}
                      disabled
                    />
                  </FormControl>
                ) : (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || (mode === "edit" && booking?.visaStatus) || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select visa status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="NOT_REQUIRED">Not Required</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {!readOnly && (
          <div className="flex justify-end space-x-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? mode === "create"
                  ? "Creating..."
                  : "Updating..."
                : mode === "create"
                  ? "Create Booking"
                  : "Update Booking"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}

