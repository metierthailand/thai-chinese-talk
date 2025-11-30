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
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useSearchCustomers, useCustomer } from "@/app/dashboard/customers/hooks/use-customers";
import { Booking } from "../hooks/use-bookings";
import { useTrips} from "@/app/dashboard/trips/hooks/use-trips";
import { useLeads } from "@/app/dashboard/leads/hooks/use-leads";
import { useAgents } from "../hooks/use-agents";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PaymentForm } from "./payment-form";

const formSchema = z.object({
  customerId: z.string().min(1, { message: "Customer is required" }),
  tripId: z.string().min(1, { message: "Trip is required" }),
  leadId: z.string().optional(),
  agentId: z.string().optional(),
  totalAmount: z.string().min(1, { message: "Total amount is required" }),
  paidAmount: z.string().optional(),
  status: z.string().optional(),
  visaStatus: z.string().optional(),
});

export type BookingFormValues = z.infer<typeof formSchema>;

interface BookingFormProps {
  mode: "create" | "edit" | "view";
  initialData?: Partial<BookingFormValues>;
  onSubmit?: (values: BookingFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  booking?: Booking; // For fallback values in edit mode
  onPaymentAdded?: () => void;
}

export function BookingForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  booking,
  onPaymentAdded,
}: BookingFormProps) {
  const readOnly = mode === "view";
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Get today's date in YYYY-MM-DD format for filtering trips that haven't started
  const today = format(new Date(), "yyyy-MM-dd");
  
  // Fetch trips using TanStack Query - filter for trips that haven't started yet
  const { data: tripsResponse } = useTrips(1, 1000, undefined, today, undefined);
  const { data: agents = [] } = useAgents();
  
  // Filter trips to only include those that haven't started (startDate >= today)
  const trips = useMemo(() => {
    if (!tripsResponse?.data) return [];
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
    return tripsResponse.data.filter((trip) => {
      const tripStartDate = new Date(trip.startDate);
      tripStartDate.setHours(0, 0, 0, 0);
      return tripStartDate >= now;
    });
  }, [tripsResponse?.data]);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: "",
      tripId: "",
      leadId: "no_lead", // Use a specific value for "No Lead" to handle Select reset
      agentId: "",
      totalAmount: "",
      paidAmount: "0",
      status: "PENDING",
      visaStatus: "NOT_REQUIRED",
    },
  });

  const customerId = form.watch("customerId");
  
  // Fetch leads for the selected customer
  const { data: leadsResponse } = useLeads(1, 100, undefined, undefined, undefined, undefined, undefined, customerId);
  const customerLeads = leadsResponse?.data || [];

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


  // Reset form when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      form.reset({
        customerId: initialData.customerId || "",
        tripId: initialData.tripId || "",
        leadId: initialData.leadId || "no_lead",
        agentId: initialData.agentId || "",
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
      leadId: values.leadId === "no_lead" ? undefined : values.leadId,
      agentId: values.agentId === "" ? undefined : values.agentId,
      status: values.status === "" ? undefined : values.status,
      visaStatus: values.visaStatus === "" ? undefined : values.visaStatus,
    };
    await onSubmit(transformedValues);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Customer Field */}
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="leadId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lead (Optional)</FormLabel>
                {readOnly ? (
                  <FormControl>
                    <Input
                      value={
                        booking?.leadId
                          ? "Linked to Lead" // Ideally fetch lead details to show
                          : "No Lead"
                      }
                      disabled
                    />
                  </FormControl>
                ) : (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!customerId || customerLeads.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={!customerId ? "Select a customer first" : customerLeads.length === 0 ? "No leads found" : "Select a lead"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="no_lead">No Lead</SelectItem>
                      {customerLeads.map((lead) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.source} - {lead.status} ({format(new Date(lead.createdAt), "dd MMM")})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="agentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Agent (Optional)</FormLabel>
                {readOnly ? (
                  <FormControl>
                    <Input
                      value={
                        agents.find((a) => a.id === field.value)?.name || "Auto-assign"
                      }
                      disabled
                    />
                  </FormControl>
                ) : (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Auto-assign to me" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name} ({agent.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
                  <Input type="number" placeholder="0.00" {...field} disabled />
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
                <div className="flex items-center justify-between">
                  <FormLabel>Paid Amount (THB)</FormLabel>
                  {mode === "edit" && booking && (
                    <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="h-6 text-xs" type="button">
                          <Plus className="mr-1 h-3 w-3" /> Add Payment
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Payment</DialogTitle>
                        </DialogHeader>
                        <PaymentForm
                          bookingId={booking.id}
                          onSuccess={() => {
                            setPaymentDialogOpen(false);
                            if (onPaymentAdded) onPaymentAdded();
                          }}
                          onCancel={() => setPaymentDialogOpen(false)}
                        />
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    {...field} 
                    disabled={readOnly || mode === "edit"} 
                  />
                </FormControl>
                {mode === "edit" && (
                  <p className="text-[0.8rem] text-muted-foreground">
                    To update paid amount, please add a payment.
                  </p>
                )}
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
