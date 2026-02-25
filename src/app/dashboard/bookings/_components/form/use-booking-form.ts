import { useState, useEffect, useMemo, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  useSearchCustomers,
  useCustomer,
  useCreateCustomer,
  CustomerFormValues,
  Customer,
} from "@/app/dashboard/customers/hooks/use-customers";
import { usePassportsByCustomer } from "@/app/dashboard/customers/hooks/use-passport";
import { Passport } from "@/app/dashboard/customers/hooks/types";
import { Booking } from "@/app/dashboard/bookings/hooks/use-bookings";
import { useTrips, useTrip, Trip } from "@/app/dashboard/trips/hooks/use-trips";
import { useAllTags } from "@/app/dashboard/tags/hooks/use-tags";
import { baseFormSchema, BookingFormValues, SalesUser, SelectedCustomer, PaymentFormValue } from "./booking-schema";

// Fetch sales users
async function fetchSalesUsers(): Promise<SalesUser[]> {
  const res = await fetch("/api/users/sales");
  if (!res.ok) {
    throw new Error("Failed to fetch sales users");
  }
  return res.json();
}

interface UseBookingFormProps {
  mode: "create" | "edit" | "view";
  initialData?: Partial<BookingFormValues>;
  booking?: Booking;
  onSubmit?: (values: BookingFormValues) => Promise<void>;
}

export function useBookingForm({ mode, initialData, booking, onSubmit }: UseBookingFormProps) {
  const { data: session } = useSession();
  const readOnly = mode === "view";
  const [tripSearchOpen, setTripSearchOpen] = useState(false);
  const [tripSearchQuery, setTripSearchQuery] = useState("");
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [salesUserSearchOpen, setSalesUserSearchOpen] = useState(false);
  const [salesUserSearchQuery, setSalesUserSearchQuery] = useState("");
  const [companionSearchOpen, setCompanionSearchOpen] = useState(false);
  const [companionSearchQuery, setCompanionSearchQuery] = useState("");
  const [roommateSearchOpen, setRoommateSearchOpen] = useState(false);
  const [roommateSearchQuery, setRoommateSearchQuery] = useState("");
  const [createCustomerDialogOpen, setCreateCustomerDialogOpen] = useState(false);
  const [enableSingleTravellerPrice, setEnableSingleTravellerPrice] = useState(false);
  const [enableBagPrice, setEnableBagPrice] = useState(false);
  const [enableDiscount, setEnableDiscount] = useState(false);
  const [enableBedPrice, setEnableBedPrice] = useState(false);
  const [enableSeatPrice, setEnableSeatPrice] = useState(false);
  const [deletingCompanionId, setDeletingCompanionId] = useState<string | null>(null);
  const [isPaymentProofsOpen, setIsPaymentProofsOpen] = useState(false);
  const [thirdPaymentWarningOpen, setThirdPaymentWarningOpen] = useState(false);
  const [pendingSubmitValues, setPendingSubmitValues] = useState<BookingFormValues | null>(null);

  // Get today's date in YYYY-MM-DD format for filtering trips that haven't started
  // const today = format(new Date(), "yyyy-MM-dd");

  // In edit/view mode, fetch the current trip separately to ensure it's available
  const { data: currentTrip } = useTrip((mode === "edit" || mode === "view") && booking?.tripId ? booking.tripId : undefined);

  // Fetch trips using TanStack Query - filter for trips that haven't started yet
  // In edit mode, we also need the current trip, so we fetch all trips
  const { data: tripsResponse } = useTrips(1, 1000);
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
  // In edit/view mode, also include the trip that's already selected in the booking
  const trips = useMemo((): Trip[] => {
    const allTrips = tripsResponse?.data || [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    now.setMinutes(0, 0, 0);

    const currentTripId = (mode === "edit" || mode === "view") && booking?.tripId ? booking.tripId : null;

    // In edit/view mode, add current trip if it's not in the list
    const tripsList: Trip[] = [...allTrips];
    if ((mode === "edit" || mode === "view") && currentTrip && !tripsList.find((t) => t.id === currentTrip.id)) {
      tripsList.push(currentTrip);
    }

    return tripsList.filter((trip) => {
      // In edit/view mode, always include the trip that's already selected
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

  // Create dynamic schema with conditional validation based on toggle states
  const formSchema = useMemo(() => {
    return baseFormSchema.refine(
      (data) => {
        // If bed price is enabled, extraPricePerBed is required
        if (enableBedPrice && (!data.extraPricePerBed || data.extraPricePerBed.trim() === "")) {
          return false;
        }
        return true;
      },
      {
        message: "Please fill in the information.",
        path: ["extraPricePerBed"],
      }
    ).refine(
      (data) => {
        // If seat price is enabled, extraPricePerSeat is required
        if (enableSeatPrice && (!data.extraPricePerSeat || data.extraPricePerSeat.trim() === "")) {
          return false;
        }
        return true;
      },
      {
        message: "Please fill in the information.",
        path: ["extraPricePerSeat"],
      }
    ).refine(
      (data) => {
        // If seat price is enabled, seatClass is required
        if (enableSeatPrice && !data.seatClass) {
          return false;
        }
        return true;
      },
      {
        message: "Please select the information.",
        path: ["seatClass"],
      }
    ).refine(
      (data) => {
        // If bag price is enabled, extraPricePerBag is required
        if (enableBagPrice && (!data.extraPricePerBag || data.extraPricePerBag.trim() === "")) {
          return false;
        }
        return true;
      },
      {
        message: "Please fill in the information.",
        path: ["extraPricePerBag"],
      }
    ).refine(
      (data) => {
        // If discount is enabled, discountPrice is required
        if (enableDiscount && (!data.discountPrice || data.discountPrice.trim() === "")) {
          return false;
        }
        return true;
      },
      {
        message: "Please fill in the information.",
        path: ["discountPrice"],
      }
    );
  }, [enableBedPrice, enableSeatPrice, enableBagPrice, enableDiscount]);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(formSchema),
    mode: "onChange",
    defaultValues: {
      customerId: "",
      tripId: "",
      salesUserId: "",
      passportId: "",
      companionCustomerIds: [],
      roommateBookingIds: [],
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
      isRechecked: false,
      payments: [],
    },
  });

  const customerId = form.watch("customerId");
  const tripId = form.watch("tripId");
  const companionCustomerIdsValue = form.watch("companionCustomerIds");
  const companionCustomerIds = useMemo(() => companionCustomerIdsValue || [], [companionCustomerIdsValue]);
  const roommateBookingIdsValue = form.watch("roommateBookingIds");
  const roommateBookingIds = useMemo(() => roommateBookingIdsValue || [], [roommateBookingIdsValue]);

  // Fetch passports for selected customer
  const { data: customerPassports = [] } = usePassportsByCustomer(customerId) as { data: Passport[] | undefined };
  const extraPriceForSingleTraveller = form.watch("extraPriceForSingleTraveller");
  const extraPricePerBed = form.watch("extraPricePerBed");
  const extraPricePerSeat = form.watch("extraPricePerSeat");
  const extraPricePerBag = form.watch("extraPricePerBag");
  const discountPrice = form.watch("discountPrice");
  const firstPaymentRatio = form.watch("firstPaymentRatio");
  const salesUserId = form.watch("salesUserId");
  const payments = (useWatch({ control: form.control, name: "payments" }) || []) as PaymentFormValue[];


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

  // Update first payment amount when calculated amounts change and payment proofs exist
  useEffect(() => {
    if (calculatedAmounts.firstPaymentAmount > 0 && mode === "create" && payments.length > 0) {
      const calculatedValue = calculatedAmounts.firstPaymentAmount.toFixed(2);
      const currentPayments = form.getValues("payments") || [];
      // Auto-set amount for first payment proof if it doesn't have an amount
      if (currentPayments.length > 0 && (!currentPayments[0]?.amount || currentPayments[0].amount.trim() === "")) {
        form.setValue("payments.0.amount", calculatedValue, { shouldValidate: false });
      }
    }
  }, [calculatedAmounts.firstPaymentAmount, form, mode, payments.length]);

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

  const availableCompanionCustomers = useMemo((): Customer[] => {
    const companionBookings = companionBookingsResponse || [];
    if (!companionBookings.length) return [];

    // Use Map to deduplicate customers by ID
    const customerMap = new Map<string, Customer>();

    companionBookings
      .filter((b: Booking) => b.customerId !== customerId)
      .forEach((b: Booking) => {
        if (!customerMap.has(b.customerId)) {
          // Create a Customer-like object from booking data
          // Note: This is a simplified Customer object based on available booking data
          const customer: Customer = {
            id: b.customerId,
            firstNameTh: b.customer.firstNameTh,
            lastNameTh: b.customer.lastNameTh,
            firstNameEn: b.customer.firstNameEn,
            lastNameEn: b.customer.lastNameEn,
            nickname: null,
            email: b.customer.email || null,
            phoneNumber: null,
            type: "INDIVIDUAL",
            title: null,
            lineId: null,
            dateOfBirth: null,
            note: null,
            tags: [],
            createdAt: "",
            updatedAt: "",
          };
          customerMap.set(b.customerId, customer);
        }
      });

    return Array.from(customerMap.values());
  }, [companionBookingsResponse, customerId]);

  const { data: searchResults = [], isLoading: isSearching } = useSearchCustomers(customerSearchQuery, 10);
  const { data: selectedCustomerData } = useCustomer(
    customerId && !searchResults.find((c) => c.id === customerId) ? customerId : undefined,
  );

  // Filter trips based on search query (by trip code)
  const filteredTrips = useMemo((): Trip[] => {
    if (!tripSearchQuery.trim()) {
      return trips;
    }
    const query = tripSearchQuery.toLowerCase();
    return trips.filter((trip) => trip.code.toLowerCase().includes(query));
  }, [trips, tripSearchQuery]);

  const { data: bookingCustomerData } = useCustomer(
    booking?.customerId && !selectedCustomerData && mode === "edit" ? booking.customerId : undefined,
  );

  const selectedCustomer = useMemo((): SelectedCustomer | null => {
    if (!customerId) {
      if (booking?.customer && mode === "edit") {
        return {
          id: booking.customerId,
          firstNameTh: booking.customer.firstNameTh,
          lastNameTh: booking.customer.lastNameTh,
          firstNameEn: booking.customer.firstNameEn,
          lastNameEn: booking.customer.lastNameEn,
          email: booking.customer.email || null,
          phone: "",
        };
      }
      return null;
    }
    const found = searchResults.find((c) => c.id === customerId);
    if (found) {
      return {
        id: found.id,
        firstNameEn: found.firstNameEn,
        lastNameEn: found.lastNameEn,
        firstNameTh: found.firstNameTh,
        lastNameTh: found.lastNameTh,
        email: found.email,
        phone: found.phoneNumber || undefined,
      };
    }
    if (selectedCustomerData) {
      return {
        id: selectedCustomerData.id,
        firstNameEn: selectedCustomerData.firstNameEn,
        lastNameEn: selectedCustomerData.lastNameEn,
        firstNameTh: selectedCustomerData.firstNameTh,
        lastNameTh: selectedCustomerData.lastNameTh,
        email: selectedCustomerData.email,
        phone: selectedCustomerData.phoneNumber || undefined,
      };
    }
    if (booking?.customer && booking.customerId === customerId && mode === "edit") {
      return {
        id: booking.customerId,
        firstNameTh: booking.customer.firstNameTh,
        lastNameTh: booking.customer.lastNameTh,
        firstNameEn: booking.customer.firstNameEn,
        lastNameEn: booking.customer.lastNameEn,
        email: booking.customer.email || null,
        phone: "",
      };
    }
    if (bookingCustomerData) {
      return {
        id: bookingCustomerData.id,
        firstNameEn: bookingCustomerData.firstNameEn,
        lastNameEn: bookingCustomerData.lastNameEn,
        firstNameTh: bookingCustomerData.firstNameTh,
        lastNameTh: bookingCustomerData.lastNameTh,
        email: bookingCustomerData.email,
        phone: bookingCustomerData.phoneNumber || undefined,
      };
    }
    return null;
  }, [customerId, searchResults, selectedCustomerData, booking, bookingCustomerData, mode]);

  const selectedSalesUser = useMemo(() => {
    if (!salesUserId) return null;
    return salesUsers.find((u) => u.id === salesUserId) || null;
  }, [salesUserId, salesUsers]);

  const selectedCompanions = useMemo((): Customer[] => {
    const ids = companionCustomerIds || [];
    return availableCompanionCustomers.filter((c) => ids.includes(c.id));
  }, [availableCompanionCustomers, companionCustomerIds]);

  // Roommate options:
  // - Edit mode with companion group: bookings in the same companion group (excluding current booking).
  // - Create mode or no group: bookings for the companions currently selected in the form (companionCustomerIds),
  //   so the user can choose roommates from the companions they have selected before saving.
  const availableRoommateBookings = useMemo((): Array<{ id: string; customerId: string; customer: { firstNameEn: string; lastNameEn: string } }> => {
    const list = companionBookingsResponse || [];
    if (!tripId) return [];

    if (booking?.companionGroupId) {
      return list.filter(
        (b: Booking) => b.companionGroupId === booking.companionGroupId && b.id !== booking.id
      );
    }

    // Show bookings for selected companions so user can pick roommates before create/update
    const companionIds = companionCustomerIds || [];
    return list.filter((b: Booking) => companionIds.includes(b.customerId));
  }, [companionBookingsResponse, tripId, booking?.id, booking?.companionGroupId, companionCustomerIds]);

  const filteredRoommateBookings = useMemo(() => {
    if (!roommateSearchQuery.trim()) return availableRoommateBookings;
    const q = roommateSearchQuery.toLowerCase();
    return availableRoommateBookings.filter(
      (b) =>
        b.customer.firstNameEn.toLowerCase().includes(q) ||
        b.customer.lastNameEn.toLowerCase().includes(q)
    );
  }, [availableRoommateBookings, roommateSearchQuery]);

  const selectedRoommateBookings = useMemo(() => {
    const ids = roommateBookingIds;
    const list = companionBookingsResponse || [];
    return ids.map((bid) => {
      const b = list.find((x: Booking) => x.id === bid);
      return b
        ? { id: b.id, customerName: `${b.customer.firstNameEn} ${b.customer.lastNameEn}` }
        : { id: bid, customerName: "—" };
    });
  }, [roommateBookingIds, companionBookingsResponse]);

  const handleAddRoommate = (bookingId: string) => {
    const current = form.getValues("roommateBookingIds") || [];
    if (!current.includes(bookingId)) {
      form.setValue("roommateBookingIds", [...current, bookingId]);
    }
    setRoommateSearchOpen(false);
    setRoommateSearchQuery("");
  };

  const handleRemoveRoommate = (bookingId: string) => {
    const current = form.getValues("roommateBookingIds") || [];
    form.setValue(
      "roommateBookingIds",
      current.filter((id) => id !== bookingId),
    );
  };

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
  const filteredCompanionCustomers = useMemo((): Customer[] => {
    if (!companionSearchQuery.trim()) return availableCompanionCustomers;
    const query = companionSearchQuery.toLowerCase();
    return availableCompanionCustomers.filter(
      (c) =>
        c.firstNameTh.toLowerCase().includes(query) ||
        c.lastNameTh.toLowerCase().includes(query) ||
        c.firstNameEn.toLowerCase().includes(query) ||
        c.lastNameEn.toLowerCase().includes(query) ||
        (c.email && c.email.toLowerCase().includes(query)),
    );
  }, [availableCompanionCustomers, companionSearchQuery]);

  // Default sales to current user when they are a sales user (create mode only)
  useEffect(() => {
    if (mode !== "create" || initialData?.salesUserId) return;
    if (session?.user?.role === "SALES" && session?.user?.id && form.getValues("salesUserId") === "") {
      form.setValue("salesUserId", session.user.id, { shouldDirty: false });
    }
  }, [mode, initialData?.salesUserId, session?.user?.role, session?.user?.id, form]);

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
        roommateBookingIds: initialData.roommateBookingIds ?? [],
        note: initialData.note ?? "",
        extraPriceForSingleTraveller: singleTravellerPrice,
        roomType: (initialData.roomType as "DOUBLE_BED" | "TWIN_BED") || ("" as unknown as "DOUBLE_BED" | "TWIN_BED"),
        extraPricePerBed: initialData.extraPricePerBed ?? "",
        roomNote: initialData.roomNote ?? "",
        seatType: (initialData.seatType as "WINDOW" | "MIDDLE" | "AISLE" | "NOT_SPECIFIED") || ("" as unknown as "WINDOW" | "MIDDLE" | "AISLE" | "NOT_SPECIFIED"),
        seatClass: initialData.seatClass
          ? (initialData.seatClass as "FIRST_CLASS" | "BUSINESS_CLASS" | "LONG_LEG" | "OTHER")
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
        isRechecked: initialData.isRechecked ?? false,
        payments: initialData.payments ?? [],
      };

      form.reset(resetData, { keepDefaultValues: false });
    }
  }, [initialData, form]);

  // Auto-open Payment Proofs collapsible in edit mode if there are existing payments
  useEffect(() => {
    if (mode === "edit" && initialData?.payments && initialData.payments.length > 0) {
      setIsPaymentProofsOpen(true);
    }
  }, [mode, initialData?.payments]);

  // Ensure passportId is set when customerPassports are loaded in edit mode
  useEffect(() => {
    if (mode === "edit" && initialData?.passportId && customerId && customerPassports.length > 0) {
      const passportExists = customerPassports.some((p) => p.id === initialData.passportId);
      const currentPassportId = form.getValues("passportId");

      // If passport exists in list but form doesn't have it, set it
      if (passportExists && currentPassportId !== initialData.passportId) {
        form.setValue("passportId", initialData.passportId, { shouldDirty: false });
      }
    }
  }, [customerPassports, initialData?.passportId, customerId, mode, form]);

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

  // When customer changes (user selected someone else), set isRechecked to false in form only.
  // Create: this value is sent when user clicks Create Booking.
  // Edit: no API call here; isRechecked is sent only when user clicks Update Booking.
  // Skip when prev is empty/undefined so we don't overwrite after form.reset(initialData).
  const prevCustomerIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const prev = prevCustomerIdRef.current;
    const isInitialOrReset = prev === undefined || prev === "";
    if (!isInitialOrReset && prev !== customerId) {
      form.setValue("isRechecked", false, { shouldDirty: true });
    }
    prevCustomerIdRef.current = customerId;
  }, [customerId, form]);

  // Set default passport to primary when customer is selected (only in create mode)
  useEffect(() => {
    // Skip in edit mode if initialData has passportId
    if (mode === "edit" && initialData?.passportId) {
      return;
    }

    const currentPassportId = form.getValues("passportId");

    // Check if current passportId belongs to the selected customer
    const currentPassportBelongsToCustomer = currentPassportId && customerPassports.some((p) => p.id === currentPassportId);

    if (customerId && customerPassports.length > 0) {
      // If current passport doesn't belong to the selected customer, or no passport is selected, set default
      if (!currentPassportBelongsToCustomer || !currentPassportId) {
        const primaryPassport = customerPassports.find((p) => p.isPrimary);
        if (primaryPassport) {
          form.setValue("passportId", primaryPassport.id, { shouldDirty: false, shouldValidate: true });
        } else if (customerPassports.length > 0) {
          // If no primary, use the first one
          form.setValue("passportId", customerPassports[0].id, { shouldDirty: false, shouldValidate: true });
        }
      }
    } else if (!customerId && currentPassportId) {
      // Clear passport when customer is cleared
      form.setValue("passportId", "", { shouldDirty: false });
    }
  }, [customerId, customerPassports, form, mode, initialData?.passportId]);

  const handleTripChange = (newTripId: string) => {
    form.setValue("tripId", newTripId);
    // Clear CustomerSection on every trip change to avoid keeping a customer
    // who may already be booked in the newly selected trip
    form.setValue("customerId", "", { shouldDirty: false });
    form.setValue("passportId", "", { shouldDirty: false });
    form.setValue("companionCustomerIds", []);
    form.setValue("roommateBookingIds", []);
    setCustomerSearchQuery("");
    setRoommateSearchQuery("");
  };

  // Customer IDs that already have a booking in the selected trip (exclude from customer dropdown)
  const customerIdsAlreadyInTrip = useMemo(() => {
    const list = companionBookingsResponse || [];
    return list.map((b: Booking) => b.customerId);
  }, [companionBookingsResponse]);

  // In create mode, if user changes trip and current customer is already in the new trip, clear selection
  useEffect(() => {
    if (mode !== "create" || !tripId || !customerId || customerIdsAlreadyInTrip.length === 0) return;
    if (customerIdsAlreadyInTrip.includes(customerId)) {
      form.setValue("customerId", "", { shouldDirty: true });
      form.setValue("passportId", "", { shouldDirty: true });
    }
  }, [mode, tripId, customerId, customerIdsAlreadyInTrip, form]);

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

    // Also remove any roommates that belong to this companion
    // Find all booking IDs for this customerId
    const companionBookings = companionBookingsResponse || [];
    const bookingIdsToRemove = companionBookings
      .filter((b: Booking) => b.customerId === customerId)
      .map((b: Booking) => b.id);

    if (bookingIdsToRemove.length > 0) {
      const currentRoommates = form.getValues("roommateBookingIds") || [];
      form.setValue(
        "roommateBookingIds",
        currentRoommates.filter((id) => !bookingIdsToRemove.includes(id)),
      );
    }
  };

  const handleSubmit = async (values: BookingFormValues) => {
    if (!onSubmit || readOnly) return;

    // Require passport only when customer has passports but none selected
    if (values.customerId && customerPassports.length > 0 && (!values.passportId || values.passportId.trim() === "")) {
      toast.error("Please select a passport.");
      return;
    }

    // In create mode, auto-select primary/first passport only when customer has passports
    if (mode === "create" && values.customerId && customerPassports.length > 0 && !values.passportId) {
      const primaryPassport = customerPassports.find((p) => p.isPrimary);
      if (primaryPassport) {
        values.passportId = primaryPassport.id;
        form.setValue("passportId", primaryPassport.id);
      } else {
        values.passportId = customerPassports[0].id;
        form.setValue("passportId", customerPassports[0].id);
      }
    }

    // Filter payments to only include those with amount
    if (values.payments) {
      values.payments = values.payments.filter(
        (p) => p?.amount && p.amount.trim() !== ""
      );
    }

    // In create mode, ensure first payment amount matches calculated value
    if (mode === "create" && values.payments && values.payments.length > 0 && values.payments[0]?.amount) {
      const calculatedValue = calculatedAmounts.firstPaymentAmount.toFixed(2);
      const enteredValue = parseFloat(values.payments[0].amount);
      const expectedValue = parseFloat(calculatedValue);

      // If values don't match, use the calculated value
      if (Math.abs(enteredValue - expectedValue) > 0.01) {
        values.payments[0].amount = calculatedValue;
      }
    }

    // In edit mode, check if this is a new third payment (payment without id at index 2)
    // Third payment is the final payment and cannot be edited after submission
    if (mode === "edit" && values.payments && values.payments.length === 3) {
      const thirdPayment = values.payments[2];
      // Check if third payment is new (no id means it's a new payment)
      if (thirdPayment && !thirdPayment.id && thirdPayment.amount && thirdPayment.amount.trim() !== "") {
        // Show warning dialog before submitting
        setPendingSubmitValues(values);
        setThirdPaymentWarningOpen(true);
        return;
      }
    }

    await onSubmit(values);
  };

  // Confirm and submit with third payment
  const confirmThirdPaymentSubmit = async () => {
    if (!onSubmit || !pendingSubmitValues) return;

    setThirdPaymentWarningOpen(false);
    await onSubmit(pendingSubmitValues);
    setPendingSubmitValues(null);
  };

  // Cancel third payment warning
  const cancelThirdPaymentWarning = () => {
    setThirdPaymentWarningOpen(false);
    setPendingSubmitValues(null);
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

  return {
    form,
    readOnly,
    trips,
    tripSearchOpen,
    setTripSearchOpen,
    tripSearchQuery,
    setTripSearchQuery,
    filteredTrips,
    handleTripChange,
    customerSearchOpen,
    setCustomerSearchOpen,
    customerSearchQuery,
    setCustomerSearchQuery,
    isSearching,
    searchResults,
    selectedCustomer,
    createCustomerDialogOpen,
    setCreateCustomerDialogOpen,
    tags,
    createCustomerMutation,
    handleCreateCustomer,
    customerPassports,
    customerId,
    customerIdsAlreadyInTrip,
    salesUserSearchOpen,
    setSalesUserSearchOpen,
    salesUserSearchQuery,
    setSalesUserSearchQuery,
    filteredSalesUsers,
    selectedSalesUser,
    companionSearchOpen,
    setCompanionSearchOpen,
    companionSearchQuery,
    setCompanionSearchQuery,
    filteredCompanionCustomers,
    availableCompanionCustomers,
    handleAddCompanion,
    selectedCompanions,
    handleDeleteCompanion,
    deletingCompanionId,
    setDeletingCompanionId,
    handleRemoveCompanion,
    roommateSearchOpen,
    setRoommateSearchOpen,
    roommateSearchQuery,
    setRoommateSearchQuery,
    availableRoommateBookings,
    filteredRoommateBookings,
    selectedRoommateBookings,
    roommateBookingIds,
    handleAddRoommate,
    handleRemoveRoommate,
    calculatedAmounts,
    enableSingleTravellerPrice,
    setEnableSingleTravellerPrice,
    enableBedPrice,
    setEnableBedPrice,
    enableSeatPrice,
    setEnableSeatPrice,
    enableBagPrice,
    setEnableBagPrice,
    enableDiscount,
    setEnableDiscount,
    isPaymentProofsOpen,
    setIsPaymentProofsOpen,
    payments,
    handleSubmit,
    tripId,
    thirdPaymentWarningOpen,
    setThirdPaymentWarningOpen,
    pendingSubmitValues,
    confirmThirdPaymentSubmit,
    cancelThirdPaymentWarning,
  };
}
