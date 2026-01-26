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
import { Check, ChevronsUpDown, Plus, Eye, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  useSearchCustomers,
  useCustomer,
  useCreateCustomer,
  CustomerFormValues,
} from "@/app/dashboard/customers/hooks/use-customers";
import { usePassportsByCustomer } from "@/app/dashboard/customers/hooks/use-passport";
import { CustomerForm } from "@/app/dashboard/customers/_components/customer-form";
import { Booking } from "../hooks/use-bookings";
import { useTrips, useTrip } from "@/app/dashboard/trips/hooks/use-trips";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAllTags } from "@/app/dashboard/tags/hooks/use-tags";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { DragDropUpload } from "@/components/upload-image";
import { X } from "lucide-react";
import { toast } from "sonner";
import { PaymentForm } from "./payment-form";
import { DeleteDialog } from "../../_components/delete-dialog";

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
  customerId: z.string().min(1, { message: "Please select the information." }),
  tripId: z.string().min(1, { message: "Please select the information." }),
  salesUserId: z.string().min(1, { message: "Please select the information." }),
  passportId: z.string().min(1, { message: "Please select the information." }),
  companionCustomerIds: z.array(z.string()).optional(),
  note: z.string().optional(),
  extraPriceForSingleTraveller: z.string().optional(),
  roomType: z.enum(["DOUBLE_BED", "TWIN_BED"], { message: "Please select the information." }),
  extraPricePerBed: z.string().optional(),
  roomNote: z.string().optional(),
  seatType: z.enum(["WINDOW", "MIDDLE", "AISLE"], { message: "Please select the information." }),
  seatClass: z.enum(["FIRST_CLASS", "BUSINESS_CLASS", "LONG_LEG"]).optional(),
  extraPricePerSeat: z.string().optional(),
  seatNote: z.string().optional(),
  extraPricePerBag: z.string().optional(),
  bagNote: z.string().optional(),
  discountPrice: z.string().optional(),
  discountNote: z.string().optional(),
  paymentStatus: z.enum(["DEPOSIT_PENDING", "DEPOSIT_PAID", "FULLY_PAID", "CANCELLED"]),
  firstPaymentRatio: z.enum(["FIRST_PAYMENT_100", "FIRST_PAYMENT_50", "FIRST_PAYMENT_30"]),
  firstPaymentAmount: z.string().min(1, { message: "Please fill in the information." }),
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
  const [tripSearchOpen, setTripSearchOpen] = useState(false);
  const [tripSearchQuery, setTripSearchQuery] = useState("");
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
  const [proofDialogOpen, setProofDialogOpen] = useState(false);
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);
  const [proofTitle, setProofTitle] = useState<string>("");
  const [deletingCompanionId, setDeletingCompanionId] = useState<string | null>(null);


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
      passportId: "",
      companionCustomerIds: [],
      note: "",
      extraPriceForSingleTraveller: "",
      roomType: undefined,
      extraPricePerBed: "",
      roomNote: "",
      seatType: undefined,
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

  // Fetch passports for selected customer
  const { data: customerPassports = [] } = usePassportsByCustomer(customerId);
  const extraPriceForSingleTraveller = form.watch("extraPriceForSingleTraveller");
  const extraPricePerBed = form.watch("extraPricePerBed");
  const extraPricePerSeat = form.watch("extraPricePerSeat");
  const extraPricePerBag = form.watch("extraPricePerBag");
  const discountPrice = form.watch("discountPrice");
  const firstPaymentRatio = form.watch("firstPaymentRatio");
  const salesUserId = form.watch("salesUserId");

  // Update extraPriceForSingleTraveller when tripId changes and enableSingleTravellerPrice is true
  useEffect(() => {
    if (enableSingleTravellerPrice && tripId) {
      const selectedTrip = trips.find((t) => t.id === tripId);
      if (selectedTrip?.extraPricePerPerson) {
        form.setValue("extraPriceForSingleTraveller", selectedTrip.extraPricePerPerson);
      }
    }
  }, [tripId, enableSingleTravellerPrice, trips, form]);

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

    // Use Map to deduplicate customers by ID
    const customerMap = new Map<string, {
      id: string;
      firstNameTh: string;
      lastNameTh: string;
      firstNameEn: string;
      lastNameEn: string;
      email?: string;
    }>();

    companionBookings
      .filter((b: Booking) => b.customerId !== customerId)
      .forEach((b: Booking) => {
        if (!customerMap.has(b.customerId)) {
          customerMap.set(b.customerId, {
            id: b.customerId,
            firstNameTh: b.customer.firstNameTh,
            lastNameTh: b.customer.lastNameTh,
            firstNameEn: b.customer.firstNameEn,
            lastNameEn: b.customer.lastNameEn,
            email: b.customer.email,
          });
        }
      });

    return Array.from(customerMap.values());
  }, [companionBookingsResponse, customerId]);

  const { data: searchResults = [], isLoading: isSearching } = useSearchCustomers(customerSearchQuery, 10);
  const { data: selectedCustomerData } = useCustomer(
    customerId && !searchResults.find((c) => c.id === customerId) ? customerId : undefined,
  );

  // Filter trips based on search query (by trip code)
  const filteredTrips = useMemo(() => {
    if (!tripSearchQuery.trim()) {
      return trips;
    }
    const query = tripSearchQuery.toLowerCase();
    return trips.filter((trip) => trip.code.toLowerCase().includes(query));
  }, [trips, tripSearchQuery]);

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

      // Build reset data object, preserving actual values from initialData
      const resetData: BookingFormValues = {
        customerId: initialData.customerId ?? "",
        tripId: initialData.tripId ?? "",
        salesUserId: initialData.salesUserId ?? "",
        passportId: initialData.passportId ?? "",
        companionCustomerIds: initialData.companionCustomerIds ?? [],
        note: initialData.note ?? "",
        extraPriceForSingleTraveller: singleTravellerPrice,
        roomType: (initialData.roomType as "DOUBLE_BED" | "TWIN_BED") || ("" as unknown as "DOUBLE_BED" | "TWIN_BED"),
        extraPricePerBed: initialData.extraPricePerBed ?? "",
        roomNote: initialData.roomNote ?? "",
        seatType: (initialData.seatType as "WINDOW" | "MIDDLE" | "AISLE") || ("" as unknown as "WINDOW" | "MIDDLE" | "AISLE"),
        seatClass: initialData.seatClass
          ? (initialData.seatClass as "FIRST_CLASS" | "BUSINESS_CLASS" | "LONG_LEG")
          : undefined,
        extraPricePerSeat: initialData.extraPricePerSeat ?? "",
        seatNote: initialData.seatNote ?? "",
        extraPricePerBag: bagPrice,
        bagNote: initialData.bagNote ?? "",
        discountPrice: discount,
        discountNote: initialData.discountNote ?? "",
        paymentStatus: (() => {
          const validStatuses = ["DEPOSIT_PENDING", "DEPOSIT_PAID", "FULLY_PAID", "CANCELLED"] as const;
          const status = initialData.paymentStatus as string;
          return status && validStatuses.includes(status as typeof validStatuses[number])
            ? (status as typeof validStatuses[number])
            : ("DEPOSIT_PENDING" as const);
        })(),
        firstPaymentRatio: initialData.firstPaymentRatio
          ? (initialData.firstPaymentRatio as "FIRST_PAYMENT_100" | "FIRST_PAYMENT_50" | "FIRST_PAYMENT_30")
          : ("FIRST_PAYMENT_50" as const),
        firstPaymentAmount: initialData.firstPaymentAmount ?? "",
        firstPaymentProof: initialData.firstPaymentProof ?? "",
      };

      form.reset(resetData, { keepDefaultValues: false });
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

  // Set default passport to primary when customer is selected (only in create mode)
  useEffect(() => {
    // Skip in edit mode if initialData has passportId
    if (mode === "edit" && initialData?.passportId) {
      return;
    }

    const currentPassportId = form.getValues("passportId");
    
    if (customerId && customerPassports.length > 0 && !currentPassportId) {
      const primaryPassport = customerPassports.find((p) => p.isPrimary);
      if (primaryPassport) {
        form.setValue("passportId", primaryPassport.id, { shouldDirty: false });
      } else if (customerPassports.length > 0) {
        // If no primary, use the first one
        form.setValue("passportId", customerPassports[0].id, { shouldDirty: false });
      }
    } else if (!customerId && currentPassportId) {
      // Clear passport when customer is cleared
      form.setValue("passportId", "", { shouldDirty: false });
    }
  }, [customerId, customerPassports, form, mode, initialData?.passportId]);

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
      // Error will be handled by form component's handleSubmit
      // Only show toast if it's not a field-specific error
      if (error instanceof Error) {
        const fieldError = error as Error & { field?: string; fields?: Array<{ field: string; message: string }> };
        if (!fieldError.field && !fieldError.fields) {
          toast.error("Created unsuccessfully.");
        }
      } else {
        toast.error("Created unsuccessfully.");
      }
      throw error; // Re-throw to let form handle field errors
    }
  };

  const handleDeleteCompanion = (customerId: string) => {
    setDeletingCompanionId(customerId);
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Basic Information Section */}
          <div className="space-y-4">
            {/* <h3 className="text-lg font-semibold">Basic Information</h3> */}

            {/* Trip Field */}
            <FormField
              control={form.control}
              name="tripId"
              render={({ field }) => {
                const selectedTrip = trips.find((t) => t.id === field.value);
                return (
                  <FormItem>
                    <FormLabel required={!readOnly}>Trip code</FormLabel>
                    {readOnly ? (
                      <FormControl>
                        <Input
                          value={
                            booking?.trip
                              ? `${booking.trip.name} (${format(new Date(booking.trip.startDate), "dd MMM")} - ${format(new Date(booking.trip.endDate), "dd MMM")})`
                              : selectedTrip?.name || ""
                          }
                          disabled
                        />
                      </FormControl>
                    ) : (
                      <Popover open={tripSearchOpen} onOpenChange={setTripSearchOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                            >
                              {selectedTrip
                                ? `${selectedTrip.code}${selectedTrip._count?.bookings >= selectedTrip.pax ? " [FULL]" : ""}`
                                : "Search for a trip..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Search by trip code"
                              value={tripSearchQuery}
                              onValueChange={setTripSearchQuery}
                            />
                            <CommandList>
                              {filteredTrips.length === 0 ? (
                                <CommandEmpty>
                                  {tripSearchQuery ? "No trips found." : "Start typing to search..."}
                                </CommandEmpty>
                              ) : (
                                <CommandGroup>
                                  {filteredTrips.map((trip) => (
                                    <CommandItem
                                      value={trip.id}
                                      key={trip.id}
                                      disabled={trip._count?.bookings >= trip.pax}
                                      onSelect={() => {
                                        handleTripChange(trip.id);
                                        setTripSearchOpen(false);
                                        setTripSearchQuery("");
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          trip.id === field.value ? "opacity-100" : "opacity-0",
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span className="font-medium">
                                          {trip.code}
                                          {trip._count?.bookings >= trip.pax ? " [FULL]" : ""}
                                        </span>
                                        <span className="text-muted-foreground text-sm">
                                          {trip.name} ({format(new Date(trip.startDate), "dd MMM")} - {format(new Date(trip.endDate), "dd MMM")})
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
                );
              }}
            />

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
                            ? `${selectedCustomer.firstNameEn} ${selectedCustomer.lastNameEn}`
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
                              ? `${selectedCustomer.firstNameEn} ${selectedCustomer.lastNameEn}`
                              : "Search for a customer..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Search by customer name"
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
                                        {customer.firstNameEn} {customer.lastNameEn}
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

            {/* Passport */}
            <FormField
              control={form.control}
              name="passportId"
              render={({ field }) => (
                <FormItem className="flex flex-col w-full">
                  <FormLabel required={!readOnly}>Passport</FormLabel>
                  {readOnly ? (
                    <FormControl>
                      <Input
                        value={
                          customerPassports.find((p) => p.id === field.value)
                            ? `${customerPassports.find((p) => p.id === field.value)?.passportNumber} (${customerPassports.find((p) => p.id === field.value)?.issuingCountry})`
                            : ""
                        }
                        disabled
                      />
                    </FormControl>
                  ) : (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ""}
                      disabled={!customerId || customerPassports.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={customerId ? (customerPassports.length === 0 ? "No passports available" : "Select passport") : "Select customer first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customerPassports.map((passport) => (
                          <SelectItem key={passport.id} value={passport.id}>
                            {passport.passportNumber} ({passport.issuingCountry}){passport.isPrimary ? " - Primary" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  <FormLabel>Companion</FormLabel>
                  {readOnly ? (
                    <div className="space-y-2 p-2 border rounded-md bg-muted">
                      {selectedCompanions.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No companion</p>
                      ) : (
                        selectedCompanions.map(
                          (c: {
                            id: string;
                            firstNameTh: string;
                            lastNameTh: string;
                            firstNameEn: string;
                            lastNameEn: string;
                            email?: string;
                          }) => (
                            <div key={c.id} className="flex items-center justify-between">
                              <p className="text-sm">
                                {c.firstNameEn} {c.lastNameEn} {c.firstNameTh && c.lastNameTh && `(${c.firstNameTh} ${c.lastNameTh})`}
                              </p>
                              {c.email && <p className="text-sm text-muted-foreground">
                                {c.email}
                              </p>}
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
                              placeholder="Search by customer name"
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
                                              {customer.firstNameEn} {customer.lastNameEn}
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
                                  {c.firstNameEn} {c.lastNameEn}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteCompanion(c.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
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
          </div>

          {/* Pricing Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Cost summary</h3>

            <div className="border-primary/20 bg-primary/5 rounded-lg border-2 p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <FormLabel className="text-base font-semibold">Total amount</FormLabel>
                  <FormDescription className="text-xs">Standard price + extra prices - discount price</FormDescription>
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
                render={({ field }) => {
                  const selectedTrip = trips.find((t) => t.id === tripId);
                  const tripExtraPrice = selectedTrip?.extraPricePerPerson || "0";

                  return (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Extra price for single traveller</FormLabel>
                        <div className="flex items-center space-x-2">
                          <FormLabel htmlFor="single-traveller-toggle" className="cursor-pointer text-sm font-normal">
                            {enableSingleTravellerPrice ? "Enabled" : "Disabled"}
                          </FormLabel>
                          <Switch
                            id="single-traveller-toggle"
                            checked={enableSingleTravellerPrice}
                            onCheckedChange={(checked) => {
                              setEnableSingleTravellerPrice(checked);
                              if (checked) {
                                // When enabled, set value from trip's extraPricePerPerson
                                field.onChange(tripExtraPrice);
                              } else {
                                // When disabled, clear the value
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
                          disabled
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
          </div>

          <Separator />

          {/* Room Information Section */}
          <div className="space-y-4">
            {/* <h3 className="text-lg font-semibold">Room Information</h3> */}

            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="roomType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room type</FormLabel>
                    {readOnly ? (
                      <FormControl>
                        <Input value={field.value} disabled />
                      </FormControl>
                    ) : (
                      <Select onValueChange={field.onChange} value={field.value} key={`roomType-${field.value}`}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DOUBLE_BED">Double bed 大</SelectItem>
                          <SelectItem value="TWIN_BED">Twin bed 双</SelectItem>
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
                      <FormLabel>Extra price for extra bed</FormLabel>
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
                    <FormLabel>Note for room</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Note for room"
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

          <Separator />

          {/* Seat Information Section */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="seatType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Seat type</FormLabel>
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

            {/* <h3 className="text-lg font-semibold">Seat upgrade</h3> */}

            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="seatClass"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Seat upgrade type</FormLabel>
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
                              // Clear extraPricePerSeat when disable
                              form.setValue("extraPricePerSeat", "");
                              // Clear seatClass when disable
                              form.setValue("seatClass", undefined);
                            }
                          }}
                          disabled={readOnly}
                        />
                      </div>
                    </div>
                    {readOnly ? (
                      <FormControl>
                        <Input value={field.value || ""} disabled />
                      </FormControl>
                    ) : (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ""}
                        key={`seatClass-${field.value ?? "empty"}`}
                        disabled={!enableSeatPrice}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select seat class" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="FIRST_CLASS">First class</SelectItem>
                          <SelectItem value="BUSINESS_CLASS">Business class</SelectItem>
                          <SelectItem value="LONG_LEG">Long leg</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="extraPricePerSeat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Extra price for seat upgrade</FormLabel>
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
                    <FormLabel>Note for seat</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Note for seat"
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

          <Separator />

          <div className="grid grid-cols-1 gap-4">
            <FormField
              control={form.control}
              name="extraPricePerBag"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Extra price for bag upgrade</FormLabel>
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
                  <FormLabel>Note for bag</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Note for bag"
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
                    <FormLabel>Discount price</FormLabel>
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
                  <FormLabel>Note for discount</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Note for discount"
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

          {/* Sales User Field */}
          <FormField
            control={form.control}
            name="salesUserId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel required={!readOnly}>Sales</FormLabel>
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
                            : "Search for a sales..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search by sales name"
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

          {/* Note */}
          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note for booking</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Note for booking"
                    className="resize-none"
                    {...field}
                    disabled={readOnly}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Separator />

          {/* Payment Section */}
          <div className="space-y-4">
            {/* <h3 className="text-lg font-semibold">Payment Information</h3> */}

            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="paymentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Payment status</FormLabel>
                    {readOnly ? (
                      <FormControl>
                        <Input value={field.value} disabled />
                      </FormControl>
                    ) : (
                      <Select onValueChange={field.onChange} value={field.value} key={`paymentStatus-${field.value}`}>
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DEPOSIT_PENDING">Deposit pending</SelectItem>
                          <SelectItem value="DEPOSIT_PAID">Deposit paid</SelectItem>
                          <SelectItem value="FULLY_PAID">Fully paid</SelectItem>
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
                render={({ field }) => {
                  // Disable if there's already a payment made
                  const hasPayment = booking?.firstPayment !== undefined && booking?.firstPayment !== null;
                  const isDisabled = readOnly || hasPayment;

                  // Map value to display label
                  const getPaymentRatioLabel = (value: string) => {
                    switch (value) {
                      case "FIRST_PAYMENT_100":
                        return "100% (Full Payment)";
                      case "FIRST_PAYMENT_50":
                        return "50% (Half Payment)";
                      case "FIRST_PAYMENT_30":
                        return "30% (Deposit)";
                      default:
                        return value;
                    }
                  };

                  return (
                    <FormItem>
                      <FormLabel>1st payment (Ratio)</FormLabel>
                      {isDisabled ? (
                        <FormControl>
                          <Input value={getPaymentRatioLabel(field.value)} disabled />
                        </FormControl>
                      ) : (
                        <Select onValueChange={field.onChange} value={field.value} key={`firstPaymentRatio-${field.value}`}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="FIRST_PAYMENT_100">100% (Full payment)</SelectItem>
                            <SelectItem value="FIRST_PAYMENT_50">50% (Half payment)</SelectItem>
                            <SelectItem value="FIRST_PAYMENT_30">30% (Deposit)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {hasPayment && (
                        <FormDescription className="text-muted-foreground text-xs">
                          Cannot edit: Payment has already been made
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

            <div className="grid grid-cols-1 items-start gap-4">
              <FormField
                control={form.control}
                name="firstPaymentAmount"
                render={({ field }) => {
                  // Disable if there's already a payment made
                  const hasPayment = booking?.firstPayment !== undefined && booking?.firstPayment !== null;
                  const isDisabled = readOnly || mode === "create" || hasPayment;

                  return (
                    <FormItem>
                      <FormLabel required>1st payment</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0.00"
                          {...field}
                          disabled={isDisabled}
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
                      {/* <FormDescription>
                      {hasPayment
                        ? "Cannot edit: Payment has already been made"
                        : mode === "create"
                          ? "Auto-calculated based on ratio"
                          : "Enter the actual first payment amount"}
                    </FormDescription> */}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

            {mode === "create" && (
              <FormField
                control={form.control}
                name="firstPaymentProof"
                render={({ field }) => {
                  // Generate folder name from customer and trip
                  const getFolderName = () => {
                    if (!selectedCustomer || !tripId) {
                      return "payment-proofs";
                    }

                    const customerName = selectedCustomer.firstNameEn || selectedCustomer.firstNameTh || "";
                    const lastName = selectedCustomer.lastNameEn || selectedCustomer.lastNameTh || "";
                    const customerFullName = `${customerName}_${lastName}`
                      .replace(/[^a-zA-Z0-9ก-๙\s_]/g, "")
                      .replace(/\s+/g, "_")
                      .toLowerCase();

                    const selectedTrip = trips.find((t) => t.id === tripId);
                    if (!selectedTrip) {
                      return `payment-proofs/${customerFullName}`;
                    }

                    const tripName = selectedTrip.name
                      .replace(/[^a-zA-Z0-9ก-๙\s_]/g, "")
                      .replace(/\s+/g, "_")
                      .toLowerCase();

                    return `payment-proofs/${customerFullName}_${tripName}`;
                  };

                  return (
                    <FormItem>
                      <FormLabel>Proof of payment (1st payment)</FormLabel>
                      {readOnly ? (
                        <FormControl>
                          {field.value ? (
                            <div className="space-y-2">
                              <div className="bg-muted relative h-48 w-full overflow-hidden rounded-md border">
                                <picture>
                                  <img src={field.value} alt="Proof of Payment" className="object-contain" />
                                </picture>
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
                                  <picture>
                                    <img src={field.value} alt="Proof of Payment" className="object-contain" />
                                  </picture>
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
                                folderName={getFolderName()}
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
                        </>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
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
        {booking && (
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

              // Helper function to get proof of payment from payment ID
              const getProofOfPayment = (paymentId: string | null | undefined): string | null => {
                if (!paymentId || !booking.payments) return null;
                const payment = booking.payments.find((p) => p.id === paymentId);
                return payment?.proofOfPayment || null;
              };

              // Get proof of payment for each payment
              const firstPaymentProof = booking.firstPaymentId
                ? getProofOfPayment(booking.firstPaymentId)
                : initialData?.firstPaymentProof || null;
              const secondPaymentProof = booking.secondPaymentId
                ? getProofOfPayment(booking.secondPaymentId)
                : null;
              const thirdPaymentProof = booking.thirdPaymentId ? getProofOfPayment(booking.thirdPaymentId) : null;

              // Helper function to open proof dialog
              const openProofDialog = (url: string, title: string) => {
                setProofImageUrl(url);
                setProofTitle(title);
                setProofDialogOpen(true);
              };

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

                  {/* Payment Details with Proof of Payment Buttons */}
                  <div className="space-y-3 rounded-md border p-4">
                    <h4 className="font-medium">Payment Details</h4>
                    <div className="space-y-2">
                      {/* First Payment */}
                      {booking.firstPayment && (
                        <div className="flex items-center justify-between rounded-md border p-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium">1st payment</p>
                            <p className="text-muted-foreground text-xs">
                              Amount: {firstAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} THB
                              {booking.firstPayment.paidAt &&
                                ` • Paid: ${format(new Date(booking.firstPayment.paidAt), "PPP")}`}
                            </p>
                          </div>
                          {firstPaymentProof && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openProofDialog(firstPaymentProof, "First Payment Proof")}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Proof
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Second Payment */}
                      {booking.secondPayment && (
                        <div className="flex items-center justify-between rounded-md border p-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium">2nd payment</p>
                            <p className="text-muted-foreground text-xs">
                              Amount: {secondAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} THB
                              {booking.secondPayment.paidAt &&
                                ` • Paid: ${format(new Date(booking.secondPayment.paidAt), "PPP")}`}
                            </p>
                          </div>
                          {secondPaymentProof && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openProofDialog(secondPaymentProof, "Second Payment Proof")}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Proof
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Third Payment */}
                      {booking.thirdPayment && (
                        <div className="flex items-center justify-between rounded-md border p-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium">3rd payment</p>
                            <p className="text-muted-foreground text-xs">
                              Amount: {thirdAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} THB
                              {booking.thirdPayment.paidAt &&
                                ` • Paid: ${format(new Date(booking.thirdPayment.paidAt), "PPP")}`}
                            </p>
                          </div>
                          {thirdPaymentProof && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => openProofDialog(thirdPaymentProof, "Third Payment Proof")}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Proof
                            </Button>
                          )}
                        </div>
                      )}
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
                          <h4 className="mb-2 font-medium">2nd payment</h4>
                          <PaymentForm
                            bookingId={booking.id}
                            booking={{
                              secondPaymentId:
                                (booking as Booking & { secondPaymentId?: string | null }).secondPaymentId || null,
                              thirdPaymentId:
                                (booking as Booking & { thirdPaymentId?: string | null }).thirdPaymentId || null,
                              customer: booking.customer,
                              trip: booking.trip,
                            }}
                            onSuccess={() => {
                              toast.success("Created successfully.");
                              // Refresh the page or refetch booking data
                              window.location.reload();
                            }}
                          />
                        </div>
                      )}

                      {booking.secondPayment && !booking.thirdPayment && (
                        <div className="rounded-md border p-4">
                          <h4 className="mb-2 font-medium">3rd payment</h4>
                          <PaymentForm
                            bookingId={booking.id}
                            booking={{
                              secondPaymentId:
                                (booking as Booking & { secondPaymentId?: string | null }).secondPaymentId || null,
                              thirdPaymentId:
                                (booking as Booking & { thirdPaymentId?: string | null }).thirdPaymentId || null,
                              customer: booking.customer,
                              trip: booking.trip,
                            }}
                            onSuccess={() => {
                              toast.success("Created successfully.");
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
        <Dialog open={createCustomerDialogOpen} onOpenChange={setCreateCustomerDialogOpen} modal={false}>
          <DialogContent className="max-h-[90vh] w-full! lg:w-[820px]! sm:max-w-7xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-3xl">New Customer</DialogTitle>
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

        {/* Proof of Payment Dialog */}
        <Dialog open={proofDialogOpen} onOpenChange={setProofDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{proofTitle}</DialogTitle>
            </DialogHeader>
            {proofImageUrl && (
              <div className="space-y-4">
                <div className="bg-muted relative w-full overflow-hidden rounded-md border">
                  {proofImageUrl.endsWith(".pdf") || proofImageUrl.includes("application/pdf") ? (
                    <iframe
                      src={proofImageUrl}
                      className="h-[600px] w-full"
                      title={proofTitle}
                      style={{ border: "none" }}
                    />
                  ) : (
                    <picture>
                      <img src={proofImageUrl} alt={proofTitle} className="h-auto w-full object-contain" />
                    </picture>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      window.open(proofImageUrl, "_blank", "noopener,noreferrer");
                    }}
                  >
                    Open in New Tab
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </Form>

      {/* Delete Dialog */}
      <DeleteDialog
        open={!!deletingCompanionId}
        onOpenChange={() => setDeletingCompanionId(null)}
        onConfirm={() => handleRemoveCompanion(deletingCompanionId ?? "")}
        isDeleting={false}
        title="Are you sure?"
        description="This action cannot be undone."
      />
    </>
  );
}
