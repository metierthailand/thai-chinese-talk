"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  useSearchCustomers,
  useCustomer,
  useCreateCustomer,
  CustomerFormValues,
} from "@/app/dashboard/customers/hooks/use-customers";
import { CustomerForm } from "@/app/dashboard/customers/_components/customer-form";
import { Booking } from "../hooks/use-bookings";
import { useTrips, useTrip } from "@/app/dashboard/trips/hooks/use-trips";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAllTags } from "@/app/dashboard/tags/hooks/use-tags";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { DragDropUpload } from "@/components/upload-image";
import Image from "next/image";
import { X } from "lucide-react";
import { toast } from "sonner";
import { PaymentForm } from "./payment-form";

// Sales User interface
interface SalesUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
}

// Fetch sales users
async function fetchSalesUsers(): Promise<SalesUser[]> {
  const res = await fetch("/api/users/sales");
  if (!res.ok) {
    throw new Error("Failed to fetch sales users");
  }
  return res.json();
}

const formSchema = z.object({
  customerId: z.string().min(1, { message: "Customer is required" }),
  tripId: z.string().min(1, { message: "Trip is required" }),
  salesUserId: z.string().min(1, { message: "Sales user is required" }),
  companionCustomerIds: z.array(z.string()).optional(),
  note: z.string().optional(),
  extraPriceForSingleTraveller: z.string().optional(),
  roomType: z.enum(["DOUBLE_BED", "TWIN_BED"]),
  extraPricePerBed: z.string().optional(),
  roomNote: z.string().optional(),
  seatType: z.enum(["WINDOW", "MIDDLE", "AISLE"]),
  seatClass: z.enum(["FIRST_CLASS", "BUSINESS_CLASS", "LONG_LEG"]).optional(),
  extraPricePerSeat: z.string().optional(),
  seatNote: z.string().optional(),
  extraPricePerBag: z.string().optional(),
  bagNote: z.string().optional(),
  discountPrice: z.string().optional(),
  discountNote: z.string().optional(),
  paymentStatus: z.enum(["DEPOSIT_PENDING", "DEPOSIT_PAID", "FULLY_PAID", "CANCELLED"]),
  firstPaymentRatio: z.enum(["FIRST_PAYMENT_100", "FIRST_PAYMENT_50", "FIRST_PAYMENT_30"]),
  firstPaymentAmount: z.string().min(1, { message: "First payment amount is required" }),
  firstPaymentProof: z.string().optional(),
});

export type BookingFormValues = z.infer<typeof formSchema>;

interface BookingFormProps {
  mode: "create" | "edit" | "view";
  initialData?: Partial<BookingFormValues>;
  onSubmit?: (values: BookingFormValues) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  booking?: Booking;
}

export function BookingForm({ mode, initialData, onSubmit, onCancel, isLoading = false, booking }: BookingFormProps) {
  const readOnly = mode === "view";
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [salesUserSearchOpen, setSalesUserSearchOpen] = useState(false);
  const [salesUserSearchQuery, setSalesUserSearchQuery] = useState("");
  const [companionSearchOpen, setCompanionSearchOpen] = useState(false);
  const [companionSearchQuery, setCompanionSearchQuery] = useState("");
  const [createCustomerDialogOpen, setCreateCustomerDialogOpen] = useState(false);
  const [enableSingleTravellerPrice, setEnableSingleTravellerPrice] = useState(false);
  const [enableBagPrice, setEnableBagPrice] = useState(false);
  const [enableDiscount, setEnableDiscount] = useState(false);
  const [enableBedPrice, setEnableBedPrice] = useState(false);
  const [enableSeatPrice, setEnableSeatPrice] = useState(false);

  // Get today's date in YYYY-MM-DD format for filtering trips that haven't started
  const today = format(new Date(), "yyyy-MM-dd");

  // In edit mode, fetch the current trip separately to ensure it's available
  const { data: currentTrip } = useTrip(mode === "edit" && booking?.tripId ? booking.tripId : undefined);

  // Fetch trips using TanStack Query - filter for trips that haven't started yet
  // In edit mode, we also need the current trip, so we fetch all trips
  const { data: tripsResponse } = useTrips(1, 1000, undefined, mode === "edit" ? undefined : today, undefined);
  const { data: salesUsers = [] } = useQuery({
    queryKey: ["salesUsers"],
    queryFn: fetchSalesUsers,
  });
  const { data: allTagsResponse } = useAllTags();
  const createCustomerMutation = useCreateCustomer();

  // Transform tags data for CustomerForm
  const tags =
    allTagsResponse?.map((tag) => ({
      id: tag.id,
      name: tag.name,
    })) || [];

  // Filter trips to only include those that haven't started (startDate > today)
  // In edit mode, also include the trip that's already selected in the booking
  const trips = useMemo(() => {
    const allTrips = tripsResponse?.data || [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    now.setMinutes(0, 0, 0);

    const currentTripId = mode === "edit" && booking?.tripId ? booking.tripId : null;

    // In edit mode, add current trip if it's not in the list
    const tripsList = [...allTrips];
    if (mode === "edit" && currentTrip && !tripsList.find((t) => t.id === currentTrip.id)) {
      tripsList.push(currentTrip);
    }

    return tripsList.filter((trip) => {
      // In edit mode, always include the trip that's already selected
      if (currentTripId && trip.id === currentTripId) {
        return true;
      }

      const tripStartDate = new Date(trip.startDate);
      tripStartDate.setHours(0, 0, 0, 0);
      tripStartDate.setMinutes(0, 0, 0);
      // Only show trips where startDate is after today (not today or past)
      return tripStartDate > now;
    });
  }, [tripsResponse?.data, mode, booking?.tripId, currentTrip]);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: "",
      tripId: "",
      salesUserId: "",
      companionCustomerIds: [],
      note: "",
      extraPriceForSingleTraveller: "",
      roomType: "DOUBLE_BED" as const,
      extraPricePerBed: "0",
      roomNote: "",
      seatType: "WINDOW" as const,
      seatClass: undefined,
      extraPricePerSeat: "",
      seatNote: "",
      extraPricePerBag: "",
      bagNote: "",
      discountPrice: "",
      discountNote: "",
      paymentStatus: "DEPOSIT_PENDING" as const,
      firstPaymentRatio: "FIRST_PAYMENT_50" as const,
      firstPaymentAmount: "",
      firstPaymentProof: "",
    },
  });

  const customerId = form.watch("customerId");
  const tripId = form.watch("tripId");
  const companionCustomerIdsValue = form.watch("companionCustomerIds");
  const companionCustomerIds = useMemo(() => companionCustomerIdsValue || [], [companionCustomerIdsValue]);
  const extraPriceForSingleTraveller = form.watch("extraPriceForSingleTraveller");
  const extraPricePerBed = form.watch("extraPricePerBed");
  const extraPricePerSeat = form.watch("extraPricePerSeat");
  const extraPricePerBag = form.watch("extraPricePerBag");
  const discountPrice = form.watch("discountPrice");
  const firstPaymentRatio = form.watch("firstPaymentRatio");
  const salesUserId = form.watch("salesUserId");

  // Calculate total amount and first payment amount
  const calculatedAmounts = useMemo(() => {
    const selectedTrip = trips.find((t) => t.id === tripId);
    if (!selectedTrip) return { totalAmount: 0, firstPaymentAmount: 0 };

    const basePrice = Number(selectedTrip.standardPrice) || 0;
    const extraSingle = extraPriceForSingleTraveller ? Number(extraPriceForSingleTraveller) : 0;
    const extraBedPrice = extraPricePerBed ? Number(extraPricePerBed) : 0;
    const extraSeatPrice = extraPricePerSeat ? Number(extraPricePerSeat) : 0;
    const extraBagPrice = extraPricePerBag ? Number(extraPricePerBag) : 0;
    const discount = discountPrice ? Number(discountPrice) : 0;
    const totalAmount = basePrice + extraSingle + extraBedPrice + extraSeatPrice + extraBagPrice - discount;

    let firstPaymentAmount = 0;
    switch (firstPaymentRatio) {
      case "FIRST_PAYMENT_100":
        firstPaymentAmount = totalAmount;
        break;
      case "FIRST_PAYMENT_50":
        firstPaymentAmount = totalAmount * 0.5;
        break;
      case "FIRST_PAYMENT_30":
        firstPaymentAmount = totalAmount * 0.3;
        break;
    }

    return { totalAmount, firstPaymentAmount };
  }, [
    tripId,
    trips,
    extraPriceForSingleTraveller,
    extraPricePerBed,
    extraPricePerSeat,
    extraPricePerBag,
    discountPrice,
    firstPaymentRatio,
  ]);

  // Update firstPaymentAmount when calculated amounts change
  useEffect(() => {
    if (calculatedAmounts.firstPaymentAmount > 0 && mode === "create") {
      const calculatedValue = calculatedAmounts.firstPaymentAmount.toFixed(2);
      const currentValue = form.getValues("firstPaymentAmount");
      // Only update if the calculated value is different from current value
      // This prevents infinite loops but ensures it stays in sync
      if (currentValue !== calculatedValue) {
        form.setValue("firstPaymentAmount", calculatedValue, { shouldValidate: false });
      }
    }
  }, [calculatedAmounts.firstPaymentAmount, form, mode]);

  // Fetch companion customers (customers already booked in the same trip)
  const { data: companionBookingsResponse } = useQuery({
    queryKey: ["companionBookings", tripId],
    queryFn: async () => {
      if (!tripId) return [];
      const res = await fetch(`/api/bookings?tripId=${tripId}&pageSize=1000`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    },
    enabled: !!tripId,
  });

  const availableCompanionCustomers = useMemo(() => {
    const companionBookings = companionBookingsResponse || [];
    if (!companionBookings.length) return [];
    return companionBookings
      .filter((b: Booking) => b.customerId !== customerId)
      .map((b: Booking) => ({
        id: b.customerId,
        firstNameTh: b.customer.firstNameTh,
        lastNameTh: b.customer.lastNameTh,
        firstNameEn: b.customer.firstNameEn,
        lastNameEn: b.customer.lastNameEn,
        email: b.customer.email,
      }));
  }, [companionBookingsResponse, customerId]);

  const { data: searchResults = [], isLoading: isSearching } = useSearchCustomers(customerSearchQuery, 10);
  const { data: selectedCustomerData } = useCustomer(
    customerId && !searchResults.find((c) => c.id === customerId) ? customerId : undefined,
  );

  const { data: bookingCustomerData } = useCustomer(
    booking?.customerId && !selectedCustomerData && mode === "edit" ? booking.customerId : undefined,
  );

  const selectedCustomer = useMemo(() => {
    if (!customerId) {
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
    const found = searchResults.find((c) => c.id === customerId);
    if (found) return found;
    if (selectedCustomerData) return selectedCustomerData;
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

  const selectedSalesUser = useMemo(() => {
    if (!salesUserId) return null;
    return salesUsers.find((u) => u.id === salesUserId) || null;
  }, [salesUserId, salesUsers]);

  const selectedCompanions = useMemo(() => {
    const ids = companionCustomerIds || [];
    return availableCompanionCustomers.filter((c: { id: string }) => ids.includes(c.id));
  }, [availableCompanionCustomers, companionCustomerIds]);

  // Filter sales users by search query
  const filteredSalesUsers = useMemo(() => {
    if (!salesUserSearchQuery.trim()) return salesUsers;
    const query = salesUserSearchQuery.toLowerCase();
    return salesUsers.filter(
      (u) =>
        u.firstName.toLowerCase().includes(query) ||
        u.lastName.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query),
    );
  }, [salesUsers, salesUserSearchQuery]);

  // Filter companion customers by search query
  const filteredCompanionCustomers = useMemo(() => {
    if (!companionSearchQuery.trim()) return availableCompanionCustomers;
    const query = companionSearchQuery.toLowerCase();
    return availableCompanionCustomers.filter(
      (c: { firstNameTh: string; lastNameTh: string; firstNameEn: string; lastNameEn: string; email?: string }) =>
        c.firstNameTh.toLowerCase().includes(query) ||
        c.lastNameTh.toLowerCase().includes(query) ||
        c.firstNameEn.toLowerCase().includes(query) ||
        c.lastNameEn.toLowerCase().includes(query) ||
        (c.email && c.email.toLowerCase().includes(query)),
    );
  }, [availableCompanionCustomers, companionSearchQuery]);

  // Reset form when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      const singleTravellerPrice = initialData.extraPriceForSingleTraveller || "";
      const bagPrice = initialData.extraPricePerBag || "";
      const discount = initialData.discountPrice || "";
      const bedPrice = initialData.extraPricePerBed || "";
      const seatPrice = initialData.extraPricePerSeat || "";

      // Set toggle states based on whether values exist
      setEnableSingleTravellerPrice(!!singleTravellerPrice && singleTravellerPrice !== "0");
      setEnableBagPrice(!!bagPrice && bagPrice !== "0");
      setEnableDiscount(!!discount && discount !== "0");
      setEnableBedPrice(!!bedPrice && bedPrice !== "0");
      setEnableSeatPrice(!!seatPrice && seatPrice !== "0");

      form.reset(
        {
          customerId: initialData.customerId || "",
          tripId: initialData.tripId || "",
          salesUserId: initialData.salesUserId || "",
          companionCustomerIds: initialData.companionCustomerIds || [],
          note: initialData.note || "",
          extraPriceForSingleTraveller: singleTravellerPrice,
          roomType: (initialData.roomType as "DOUBLE_BED" | "TWIN_BED") || ("DOUBLE_BED" as const),
          extraPricePerBed: initialData.extraPricePerBed || "0",
          roomNote: initialData.roomNote || "",
          seatType: (initialData.seatType as "WINDOW" | "MIDDLE" | "AISLE") || ("WINDOW" as const),
          seatClass: (initialData.seatClass as "FIRST_CLASS" | "BUSINESS_CLASS" | "LONG_LEG" | undefined) || undefined,
          extraPricePerSeat: initialData.extraPricePerSeat || "",
          seatNote: initialData.seatNote || "",
          extraPricePerBag: bagPrice,
          bagNote: initialData.bagNote || "",
          discountPrice: discount,
          discountNote: initialData.discountNote || "",
          paymentStatus:
            (initialData.paymentStatus as "DEPOSIT_PENDING" | "DEPOSIT_PAID" | "FULLY_PAID" | "CANCELLED") ||
            ("DEPOSIT_PENDING" as const),
          firstPaymentRatio:
            (initialData.firstPaymentRatio as "FIRST_PAYMENT_100" | "FIRST_PAYMENT_50" | "FIRST_PAYMENT_30") ||
            ("FIRST_PAYMENT_50" as const),
          firstPaymentAmount: initialData.firstPaymentAmount || "",
          firstPaymentProof: initialData.firstPaymentProof || "",
        },
        { keepDefaultValues: false },
      );
    }
  }, [initialData, form]);

  // Ensure tripId is set when trips are loaded (fixes issue where Select clears value)
  useEffect(() => {
    if (mode === "edit" && initialData?.tripId && trips.length > 0) {
      const tripExists = trips.some((t) => t.id === initialData.tripId);
      const currentTripId = form.getValues("tripId");

      // If trip exists in list but form doesn't have it, set it
      if (tripExists && currentTripId !== initialData.tripId) {
        form.setValue("tripId", initialData.tripId, { shouldDirty: false });
      }
    }
  }, [trips, initialData?.tripId, mode, form]);

  console.log({ initialData });
  console.log({ formValues: form.getValues() });

  const handleTripChange = (newTripId: string) => {
    form.setValue("tripId", newTripId);
    // Clear companion customers when trip changes
    form.setValue("companionCustomerIds", []);
  };

  const handleAddCompanion = (customerId: string) => {
    const current = form.getValues("companionCustomerIds") || [];
    if (!current.includes(customerId)) {
      form.setValue("companionCustomerIds", [...current, customerId]);
    }
    setCompanionSearchOpen(false);
    setCompanionSearchQuery("");
  };

  const handleRemoveCompanion = (customerId: string) => {
    const current = form.getValues("companionCustomerIds") || [];
    form.setValue(
      "companionCustomerIds",
      current.filter((id) => id !== customerId),
    );
  };

  const handleSubmit = async (values: BookingFormValues) => {
    if (!onSubmit || readOnly) return;

    // In create mode, ensure firstPaymentAmount matches calculated value
    if (mode === "create") {
      const calculatedValue = calculatedAmounts.firstPaymentAmount.toFixed(2);
      const enteredValue = parseFloat(values.firstPaymentAmount);
      const expectedValue = parseFloat(calculatedValue);

      // If values don't match, use the calculated value
      if (Math.abs(enteredValue - expectedValue) > 0.01) {
        values.firstPaymentAmount = calculatedValue;
      }
    }

    await onSubmit(values);
  };

  const handleCreateCustomer = async (values: CustomerFormValues) => {
    try {
      const newCustomer = await createCustomerMutation.mutateAsync(values);
      // Select the newly created customer
      form.setValue("customerId", newCustomer.id);
      setCreateCustomerDialogOpen(false);
      setCustomerSearchQuery("");
    } catch (error) {
      // Error is already handled by the mutation
      console.error("Failed to create customer:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Basic Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Basic Information</h3>

          {/* Customer Field */}
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel required={!readOnly}>Customer</FormLabel>
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
                          className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
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
                            <div className="text-muted-foreground py-6 text-center text-sm">Searching...</div>
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
                                      customer.id === field.value ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {customer.firstNameTh} {customer.lastNameTh}
                                    </span>
                                    <span className="text-muted-foreground text-xs">
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
                        <div className="border-t p-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              setCustomerSearchOpen(false);
                              setCreateCustomerDialogOpen(true);
                            }}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Create New Customer
                          </Button>
                        </div>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Trip Field */}
          <FormField
            control={form.control}
            name="tripId"
            render={({ field }) => (
              <FormItem>
                <FormLabel required={!readOnly}>Trip</FormLabel>
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
                    value={field.value || ""}
                    key={`trip-select-${trips.length}-${field.value || ""}`}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a trip package" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {trips.map((trip) => (
                        <SelectItem key={trip.id} value={trip.id} disabled={trip._count?.bookings >= trip.pax}>
                          {trip.name} ({format(new Date(trip.startDate), "dd MMM")} -{" "}
                          {format(new Date(trip.endDate), "dd MMM")})
                          {trip._count?.bookings >= trip.pax ? " [FULL]" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Sales User Field */}
          <FormField
            control={form.control}
            name="salesUserId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel required={!readOnly}>Sales User</FormLabel>
                {readOnly ? (
                  <FormControl>
                    <Input
                      value={selectedSalesUser ? `${selectedSalesUser.firstName} ${selectedSalesUser.lastName}` : ""}
                      disabled
                    />
                  </FormControl>
                ) : (
                  <Popover open={salesUserSearchOpen} onOpenChange={setSalesUserSearchOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                        >
                          {selectedSalesUser
                            ? `${selectedSalesUser.firstName} ${selectedSalesUser.lastName}`
                            : "Search for a sales user..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search sales users by name or email..."
                          value={salesUserSearchQuery}
                          onValueChange={setSalesUserSearchQuery}
                        />
                        <CommandList>
                          {filteredSalesUsers.length === 0 ? (
                            <CommandEmpty>No sales users found.</CommandEmpty>
                          ) : (
                            <CommandGroup>
                              {filteredSalesUsers.map((user) => (
                                <CommandItem
                                  value={user.id}
                                  key={user.id}
                                  onSelect={() => {
                                    field.onChange(user.id);
                                    setSalesUserSearchOpen(false);
                                    setSalesUserSearchQuery("");
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      user.id === field.value ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {user.firstName} {user.lastName}
                                    </span>
                                    <span className="text-muted-foreground text-xs">{user.email}</span>
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

          {/* Companion Customers */}
          <FormField
            control={form.control}
            name="companionCustomerIds"
            render={() => (
              <FormItem>
                <FormLabel>Companion Customers</FormLabel>
                <FormDescription>
                  Select customers who are already booked in the same trip to join this booking
                </FormDescription>
                {readOnly ? (
                  <div className="space-y-2">
                    {selectedCompanions.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No companion customers</p>
                    ) : (
                      selectedCompanions.map(
                        (c: {
                          id: string;
                          firstNameTh: string;
                          lastNameTh: string;
                          firstNameEn: string;
                          lastNameEn: string;
                        }) => (
                          <div key={c.id} className="text-sm">
                            {c.firstNameTh} {c.lastNameTh} ({c.firstNameEn} {c.lastNameEn})
                          </div>
                        ),
                      )
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Popover open={companionSearchOpen} onOpenChange={setCompanionSearchOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start"
                          disabled={!tripId || availableCompanionCustomers.length === 0}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          {tripId
                            ? availableCompanionCustomers.length === 0
                              ? "No available companion customers"
                              : "Add companion customer"
                            : "Select trip first"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Search companion customers..."
                            value={companionSearchQuery}
                            onValueChange={setCompanionSearchQuery}
                          />
                          <CommandList>
                            {filteredCompanionCustomers.length === 0 ? (
                              <CommandEmpty>No companion customers found.</CommandEmpty>
                            ) : (
                              <CommandGroup>
                                {filteredCompanionCustomers
                                  .filter((c: { id: string }) => !companionCustomerIds.includes(c.id))
                                  .map(
                                    (customer: {
                                      id: string;
                                      firstNameTh: string;
                                      lastNameTh: string;
                                      firstNameEn: string;
                                      lastNameEn: string;
                                      email?: string;
                                    }) => (
                                      <CommandItem
                                        key={customer.id}
                                        value={customer.id}
                                        onSelect={() => handleAddCompanion(customer.id)}
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium">
                                            {customer.firstNameTh} {customer.lastNameTh}
                                          </span>
                                          <span className="text-muted-foreground text-xs">
                                            {customer.firstNameEn} {customer.lastNameEn}
                                            {customer.email && ` • ${customer.email}`}
                                          </span>
                                        </div>
                                      </CommandItem>
                                    ),
                                  )}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {selectedCompanions.length > 0 && (
                      <div className="space-y-2">
                        {selectedCompanions.map(
                          (c: {
                            id: string;
                            firstNameTh: string;
                            lastNameTh: string;
                            firstNameEn: string;
                            lastNameEn: string;
                          }) => (
                            <div key={c.id} className="flex items-center justify-between rounded-md border p-2">
                              <span className="text-sm">
                                {c.firstNameTh} {c.lastNameTh} ({c.firstNameEn} {c.lastNameEn})
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveCompanion(c.id)}
                              >
                                Remove
                              </Button>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Note */}
          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Add a note about this booking..."
                    className="resize-none"
                    {...field}
                    disabled={readOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Pricing Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Pricing & Extras</h3>

          <div className="border-primary/20 bg-primary/5 rounded-lg border-2 p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <FormLabel className="text-base font-semibold">Calculated Total Amount</FormLabel>
                <FormDescription className="text-xs">Base price + extras - discount</FormDescription>
              </div>
              <div className="text-right">
                <div className="text-primary text-2xl font-bold">
                  {calculatedAmounts.totalAmount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="text-muted-foreground text-xs">THB</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="extraPriceForSingleTraveller"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Extra Price for Single Traveller (THB)</FormLabel>
                    <div className="flex items-center space-x-2">
                      <FormLabel htmlFor="single-traveller-toggle" className="cursor-pointer text-sm font-normal">
                        {enableSingleTravellerPrice ? "Enabled" : "Disabled"}
                      </FormLabel>
                      <Switch
                        id="single-traveller-toggle"
                        checked={enableSingleTravellerPrice}
                        onCheckedChange={(checked) => {
                          setEnableSingleTravellerPrice(checked);
                          if (!checked) {
                            field.onChange("");
                          }
                        }}
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.00"
                      {...field}
                      disabled={readOnly || !enableSingleTravellerPrice}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="extraPricePerBag"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Extra Price per Bag (THB)</FormLabel>
                    <div className="flex items-center space-x-2">
                      <FormLabel htmlFor="bag-price-toggle" className="cursor-pointer text-sm font-normal">
                        {enableBagPrice ? "Enabled" : "Disabled"}
                      </FormLabel>
                      <Switch
                        id="bag-price-toggle"
                        checked={enableBagPrice}
                        onCheckedChange={(checked) => {
                          setEnableBagPrice(checked);
                          if (!checked) {
                            field.onChange("");
                          }
                        }}
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.00"
                      {...field}
                      disabled={readOnly || !enableBagPrice}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bagNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bag Note</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add note about bags..."
                      className="resize-none"
                      {...field}
                      disabled={readOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="discountPrice"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Discount Price (THB)</FormLabel>
                    <div className="flex items-center space-x-2">
                      <FormLabel htmlFor="discount-toggle" className="cursor-pointer text-sm font-normal">
                        {enableDiscount ? "Enabled" : "Disabled"}
                      </FormLabel>
                      <Switch
                        id="discount-toggle"
                        checked={enableDiscount}
                        onCheckedChange={(checked) => {
                          setEnableDiscount(checked);
                          if (!checked) {
                            field.onChange("");
                          }
                        }}
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.00"
                      {...field}
                      disabled={readOnly || !enableDiscount}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="discountNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount Note</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add note about discount..."
                      className="resize-none"
                      {...field}
                      disabled={readOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Room Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Room Information</h3>

          <div className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="roomType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room Type</FormLabel>
                  {readOnly ? (
                    <FormControl>
                      <Input value={field.value} disabled />
                    </FormControl>
                  ) : (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DOUBLE_BED">Double Bed</SelectItem>
                        <SelectItem value="TWIN_BED">Twin Bed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="extraPricePerBed"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Extra Price per Bed (THB)</FormLabel>
                    <div className="flex items-center space-x-2">
                      <FormLabel htmlFor="bed-price-toggle" className="cursor-pointer text-sm font-normal">
                        {enableBedPrice ? "Enabled" : "Disabled"}
                      </FormLabel>
                      <Switch
                        id="bed-price-toggle"
                        checked={enableBedPrice}
                        onCheckedChange={(checked) => {
                          setEnableBedPrice(checked);
                          if (!checked) {
                            field.onChange("");
                          }
                        }}
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.00"
                      {...field}
                      disabled={readOnly || !enableBedPrice}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="roomNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room Note</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add note about room..."
                      className="resize-none"
                      {...field}
                      disabled={readOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Seat Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Seat Information</h3>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="seatType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Seat Type</FormLabel>
                  {readOnly ? (
                    <FormControl>
                      <Input value={field.value} disabled />
                    </FormControl>
                  ) : (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="WINDOW">Window</SelectItem>
                        <SelectItem value="MIDDLE">Middle</SelectItem>
                        <SelectItem value="AISLE">Aisle</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="seatClass"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seat Upgrade</FormLabel>
                  {readOnly ? (
                    <FormControl>
                      <Input value={field.value || ""} disabled />
                    </FormControl>
                  ) : (
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select seat class" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="FIRST_CLASS">First Class</SelectItem>
                        <SelectItem value="BUSINESS_CLASS">Business Class</SelectItem>
                        <SelectItem value="LONG_LEG">Long Leg</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="extraPricePerSeat"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Extra Price per Seat (THB)</FormLabel>
                    <div className="flex items-center space-x-2">
                      <FormLabel htmlFor="seat-price-toggle" className="cursor-pointer text-sm font-normal">
                        {enableSeatPrice ? "Enabled" : "Disabled"}
                      </FormLabel>
                      <Switch
                        id="seat-price-toggle"
                        checked={enableSeatPrice}
                        onCheckedChange={(checked) => {
                          setEnableSeatPrice(checked);
                          if (!checked) {
                            field.onChange("");
                          }
                        }}
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.00"
                      {...field}
                      disabled={readOnly || !enableSeatPrice}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="seatNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Seat Note</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add note about seat..."
                      className="resize-none"
                      {...field}
                      disabled={readOnly}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Payment Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Payment Information</h3>

          <div className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="paymentStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Status</FormLabel>
                  {readOnly ? (
                    <FormControl>
                      <Input value={field.value} disabled />
                    </FormControl>
                  ) : (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DEPOSIT_PENDING">Deposit Pending</SelectItem>
                        <SelectItem value="DEPOSIT_PAID">Deposit Paid</SelectItem>
                        <SelectItem value="FULLY_PAID">Fully Paid</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="firstPaymentRatio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Payment Ratio</FormLabel>
                  {readOnly ? (
                    <FormControl>
                      <Input value={field.value} disabled />
                    </FormControl>
                  ) : (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="FIRST_PAYMENT_100">100% (Full Payment)</SelectItem>
                        <SelectItem value="FIRST_PAYMENT_50">50% (Half Payment)</SelectItem>
                        <SelectItem value="FIRST_PAYMENT_30">30% (Deposit)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 items-start gap-4">
            <div className="space-y-2">
              <FormLabel>Calculated First Payment Amount (THB)</FormLabel>
              <Input
                type="text"
                value={calculatedAmounts.firstPaymentAmount.toFixed(2)}
                disabled
                className="font-semibold"
              />
              <FormDescription>Based on total amount and payment ratio</FormDescription>
            </div>

            <FormField
              control={form.control}
              name="firstPaymentAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Payment Amount (THB) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0.00"
                      {...field}
                      disabled={readOnly || mode === "create"}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value);
                        // If user manually changes the value in create mode, validate it matches calculated
                        if (mode === "create" && value) {
                          const calculated = calculatedAmounts.firstPaymentAmount.toFixed(2);
                          const entered = parseFloat(value);
                          const expected = parseFloat(calculated);
                          if (Math.abs(entered - expected) > 0.01) {
                            // Show warning but don't block - let backend validate
                            console.warn(
                              `First payment amount (${entered}) does not match calculated value (${expected}). The calculated value will be used.`,
                            );
                          }
                        }
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    {mode === "create" ? "Auto-calculated based on ratio" : "Enter the actual first payment amount"}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {mode === "create" && (
            <FormField
              control={form.control}
              name="firstPaymentProof"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proof of Payment</FormLabel>
                  {readOnly ? (
                    <FormControl>
                      {field.value ? (
                        <div className="space-y-2">
                          <div className="bg-muted relative h-48 w-full overflow-hidden rounded-md border">
                            <Image
                              src={field.value}
                              alt="Proof of Payment"
                              fill
                              className="object-contain"
                              unoptimized
                            />
                          </div>
                          <a
                            href={field.value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary text-sm underline"
                          >
                            View proof of payment
                          </a>
                        </div>
                      ) : (
                        <Input value="No proof uploaded" disabled />
                      )}
                    </FormControl>
                  ) : (
                    <>
                      <FormControl>
                        {field.value ? (
                          <div className="space-y-2">
                            <div className="bg-muted relative h-48 w-full overflow-hidden rounded-md border">
                              <Image
                                src={field.value}
                                alt="Proof of Payment"
                                fill
                                className="object-contain"
                                unoptimized
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute top-2 right-2"
                                onClick={() => field.onChange("")}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <a
                              href={field.value}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary text-sm underline"
                            >
                              View proof of payment
                            </a>
                          </div>
                        ) : (
                          <DragDropUpload
                            acceptedFileTypes={[
                              "image/jpeg",
                              "image/png",
                              "image/jpg",
                              ".jpg",
                              ".jpeg",
                              ".png",
                              "application/pdf",
                              ".pdf",
                            ]}
                            maxFileSize={10 * 1024 * 1024} // 10MB
                            folderName="payment-proofs"
                            multiple={false}
                            onUploadSuccess={(url) => {
                              field.onChange(url);
                            }}
                            onUploadError={(error) => {
                              toast.error(error);
                            }}
                            className="w-full"
                          />
                        )}
                      </FormControl>
                      <FormDescription>Upload proof of payment (max 10MB, JPG/PNG/PDF only)</FormDescription>
                    </>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {!readOnly && (
          <div className="flex justify-end space-x-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
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

      {/* Additional Payments Section (Edit Mode Only) - Outside form to avoid nested forms */}
      {mode === "edit" && booking && (
        <div className="mt-6 space-y-4">
          <Separator />
          <h3 className="text-lg font-semibold">Additional Payments</h3>

          {/* Calculate total amount and paid amount */}
          {(() => {
            const basePrice = booking.trip?.standardPrice || 0;
            const extraSingle = booking.extraPriceForSingleTraveller || 0;
            const extraBedPrice = booking.extraPricePerBed || 0;
            const extraSeatPrice = booking.extraPricePerSeat || 0;
            const extraBagPrice = booking.extraPricePerBag || 0;
            const discount = booking.discountPrice || 0;
            const totalAmount = basePrice + extraSingle + extraBedPrice + extraSeatPrice + extraBagPrice - discount;

            const firstAmount = booking.firstPayment?.amount || 0;
            const secondAmount = booking.secondPayment?.amount || 0;
            const thirdAmount = booking.thirdPayment?.amount || 0;
            const paidAmount = firstAmount + secondAmount + thirdAmount;
            const remainingAmount = totalAmount - paidAmount;
            const isFullyPaid = paidAmount >= totalAmount;

            return (
              <div className="space-y-4">
                <div className="bg-muted grid grid-cols-3 gap-4 rounded-md p-4">
                  <div>
                    <p className="text-muted-foreground text-sm">Total Amount</p>
                    <p className="text-lg font-semibold">
                      {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} THB
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Paid Amount</p>
                    <p className="text-lg font-semibold">
                      {paidAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} THB
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Remaining</p>
                    <p
                      className={`text-lg font-semibold ${remainingAmount > 0 ? "text-destructive" : "text-green-600"}`}
                    >
                      {remainingAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} THB
                    </p>
                  </div>
                </div>

                {isFullyPaid ? (
                  <div className="rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      ✓ Payment Status: FULLY_PAID - All payments have been completed
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!booking.secondPayment && (
                      <div className="rounded-md border p-4">
                        <h4 className="mb-2 font-medium">Second Payment</h4>
                        <PaymentForm
                          bookingId={booking.id}
                          booking={{
                            secondPaymentId:
                              (booking as Booking & { secondPaymentId?: string | null }).secondPaymentId || null,
                            thirdPaymentId:
                              (booking as Booking & { thirdPaymentId?: string | null }).thirdPaymentId || null,
                          }}
                          onSuccess={() => {
                            toast.success("Second payment added successfully");
                            // Refresh the page or refetch booking data
                            window.location.reload();
                          }}
                        />
                      </div>
                    )}

                    {booking.secondPayment && !booking.thirdPayment && (
                      <div className="rounded-md border p-4">
                        <h4 className="mb-2 font-medium">Third Payment</h4>
                        <PaymentForm
                          bookingId={booking.id}
                          booking={{
                            secondPaymentId:
                              (booking as Booking & { secondPaymentId?: string | null }).secondPaymentId || null,
                            thirdPaymentId:
                              (booking as Booking & { thirdPaymentId?: string | null }).thirdPaymentId || null,
                          }}
                          onSuccess={() => {
                            toast.success("Third payment added successfully");
                            // Refresh the page or refetch booking data
                            window.location.reload();
                          }}
                        />
                      </div>
                    )}

                    {booking.secondPayment && booking.thirdPayment && (
                      <div className="bg-muted rounded-md p-4">
                        <p className="text-muted-foreground text-sm">
                          All payments have been added (maximum 3 payments)
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Create Customer Dialog */}
      <Dialog open={createCustomerDialogOpen} onOpenChange={setCreateCustomerDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Customer</DialogTitle>
          </DialogHeader>
          <CustomerForm
            mode="create"
            onSubmit={handleCreateCustomer}
            onCancel={() => setCreateCustomerDialogOpen(false)}
            isLoading={createCustomerMutation.isPending}
            availableTags={tags}
          />
        </DialogContent>
      </Dialog>
    </Form>
  );
}
