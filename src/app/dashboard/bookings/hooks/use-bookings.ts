import { Payment } from "@prisma/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";

export interface Booking {
  id: string;
  customerId: string;
  salesUserId: string;
  tripId: string;
  agentId?: string | null;
  passportId?: string | null;
  customer: {
    firstNameTh: string;
    lastNameTh: string;
    firstNameEn: string;
    lastNameEn: string;
    email: string;
  };
  salesUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  agent?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  companionCustomers?: Array<{
    customer: {
      id: string;
      firstNameTh: string;
      lastNameTh: string;
      firstNameEn: string;
      lastNameEn: string;
    };
  }>;
  trip: {
    name: string;
    startDate: string;
    endDate: string;
    standardPrice?: number;
    code: string;
  };
  note?: string | null;
  extraPriceForSingleTraveller?: number | null;
  roomType?: string;
  extraBed?: boolean;
  extraPricePerBed?: number;
  roomNote?: string | null;
  seatType?: string;
  seatClass?: string | null;
  extraPricePerSeat?: number | null;
  seatNote?: string | null;
  extraPricePerBag?: number | null;
  bagNote?: string | null;
  discountPrice?: number | null;
  discountNote?: string | null;
  paymentStatus: string;
  firstPaymentRatio?: string;
  firstPaymentId?: string | null;
  firstPayment?: {
    id: string;
    amount: number;
    paidAt: string;
  };
  secondPaymentId?: string | null;
  secondPayment?: {
    id: string;
    amount: number;
    paidAt: string;
  } | null;
  thirdPaymentId?: string | null;
  thirdPayment?: {
    id: string;
    amount: number;
    paidAt: string;
  } | null;
  payments?: Array<{
    id: string;
    amount: number;
    paidAt: string;
    proofOfPayment?: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface BookingsResponse {
  data: Booking[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Query key factory
export const bookingKeys = {
  all: ["bookings"] as const,
  lists: () => [...bookingKeys.all, "list"] as const,
  list: (
    page: number,
    pageSize: number,
    search?: string,
    status?: string,
    _visaStatus?: string, // Deprecated, kept for backward compatibility
    tripStartDateFrom?: string,
    tripStartDateTo?: string,
    tripId?: string,
  ) =>
    [
      ...bookingKeys.lists(),
      page,
      pageSize,
      search,
      status,
      tripStartDateFrom,
      tripStartDateTo,
      tripId,
    ] as const,
  details: () => [...bookingKeys.all, "detail"] as const,
  detail: (id: string) => [...bookingKeys.details(), id] as const,
};

// Fetch bookings function
async function fetchBookings(
  page: number = 1,
  pageSize: number = 10,
  search?: string,
  status?: string,
  _visaStatus?: string, // Deprecated, kept for backward compatibility
  tripStartDateFrom?: string,
  tripStartDateTo?: string,
  tripId?: string,
): Promise<BookingsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });

  if (search && search.trim()) {
    params.set("search", search.trim());
  }
  if (status) {
    params.set("status", status);
  }
  if (tripStartDateFrom) {
    params.set("tripStartDateFrom", tripStartDateFrom);
  }
  if (tripStartDateTo) {
    params.set("tripStartDateTo", tripStartDateTo);
  }
  if (tripId) {
    params.set("tripId", tripId);
  }

  const res = await fetch(`/api/bookings?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to fetch bookings");
  }
  const data = await res.json();
  // Convert Decimal fields to numbers
  return {
    ...data,
    data: data.data.map((booking: Booking) => ({
      ...booking,
      extraPriceForSingleTraveller: booking.extraPriceForSingleTraveller
        ? Number(booking.extraPriceForSingleTraveller)
        : null,
      extraPricePerBed: booking.extraPricePerBed ? Number(booking.extraPricePerBed) : 0,
      extraPricePerSeat: booking.extraPricePerSeat ? Number(booking.extraPricePerSeat) : null,
      extraPricePerBag: booking.extraPricePerBag ? Number(booking.extraPricePerBag) : null,
      discountPrice: booking.discountPrice ? Number(booking.discountPrice) : null,
      trip: {
        ...booking.trip,
        standardPrice: booking.trip.standardPrice ? Number(booking.trip.standardPrice) : 0,
      },
      firstPayment: booking.firstPayment
        ? {
            ...booking.firstPayment,
            amount: Number(booking.firstPayment.amount),
          }
        : undefined,
      secondPayment: booking.secondPayment
        ? {
            ...booking.secondPayment,
            amount: Number(booking.secondPayment.amount),
          }
        : null,
      thirdPayment: booking.thirdPayment
        ? {
            ...booking.thirdPayment,
            amount: Number(booking.thirdPayment.amount),
          }
        : null,
      payments: booking.payments?.map((p) => ({
        ...p,
        amount: Number(p.amount),
      })),
    })),
  };
}

// Fetch single booking function
async function fetchBooking(id: string): Promise<Booking> {
  const res = await fetch(`/api/bookings/${id}`);
  if (!res.ok) {
    throw new Error("Failed to fetch booking");
  }
  const data = await res.json();
  // Convert Decimal fields to numbers
  return {
    ...data,
    extraPriceForSingleTraveller: data.extraPriceForSingleTraveller ? Number(data.extraPriceForSingleTraveller) : null,
    extraPricePerBed: data.extraPricePerBed ? Number(data.extraPricePerBed) : 0,
    extraPricePerSeat: data.extraPricePerSeat ? Number(data.extraPricePerSeat) : null,
    extraPricePerBag: data.extraPricePerBag ? Number(data.extraPricePerBag) : null,
    discountPrice: data.discountPrice ? Number(data.discountPrice) : null,
    trip: {
      ...data.trip,
      standardPrice: data.trip.standardPrice ? Number(data.trip.standardPrice) : 0,
    },
    firstPayment: data.firstPayment
      ? {
          ...data.firstPayment,
          amount: Number(data.firstPayment.amount),
        }
      : undefined,
    secondPayment: data.secondPayment
      ? {
          ...data.secondPayment,
          amount: Number(data.secondPayment.amount),
        }
      : null,
    thirdPayment: data.thirdPayment
      ? {
          ...data.thirdPayment,
          amount: Number(data.thirdPayment.amount),
        }
      : null,
    payments: data.payments?.map((p: Payment) => ({
      ...p,
      amount: Number(p.amount),
    })),
  };
}

// Create booking function
async function createBooking(data: {
  customerId: string;
  tripId: string;
  salesUserId: string;
  passportId: string;
  companionCustomerIds?: string[];
  agentId?: string;
  note?: string;
  extraPriceForSingleTraveller?: number;
  roomType?: string;
  extraBed?: boolean;
  extraPricePerBed?: number;
  roomNote?: string;
  seatType?: string;
  seatClass?: string;
  extraPricePerSeat?: number;
  seatNote?: string;
  extraPricePerBag?: number;
  bagNote?: string;
  discountPrice?: number;
  discountNote?: string;
  paymentStatus?: string;
  firstPaymentRatio: string;
  firstPaymentAmount: number;
  firstPaymentProof?: string;
}): Promise<Booking> {
  const res = await fetch("/api/bookings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create booking");
  }

  return res.json();
}

// Update booking function
async function updateBooking({
  id,
  data,
}: {
  id: string;
  data: {
    customerId?: string;
    tripId?: string;
    salesUserId?: string;
    companionCustomerIds?: string[];
    agentId?: string;
    note?: string;
    extraPriceForSingleTraveller?: number;
    roomType?: string;
    extraBed?: boolean;
    extraPricePerBed?: number;
    roomNote?: string;
    seatType?: string;
    seatClass?: string;
    extraPricePerSeat?: number;
    seatNote?: string;
    extraPricePerBag?: number;
    bagNote?: string;
    discountPrice?: number;
    discountNote?: string;
    paymentStatus?: string;
    firstPaymentRatio?: string;
  };
}): Promise<Booking> {
  const res = await fetch(`/api/bookings/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to update booking");
  }

  const responseData = await res.json();
  // Convert Decimal fields to numbers
  return {
    ...responseData,
    totalAmount: Number(responseData.totalAmount),
    paidAmount: Number(responseData.paidAmount),
  };
}

// Delete booking function
async function deleteBooking(id: string): Promise<void> {
  const res = await fetch(`/api/bookings/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error("Failed to delete booking");
  }
}

// Hook to fetch bookings with pagination
export function useBookings(
  page: number,
  pageSize: number,
  search?: string,
  status?: string,
  _visaStatus?: string, // Deprecated, kept for backward compatibility
  tripStartDateFrom?: string,
  tripStartDateTo?: string,
  tripId?: string,
) {
  return useQuery({
    queryKey: bookingKeys.list(page, pageSize, search, status, _visaStatus, tripStartDateFrom, tripStartDateTo, tripId),
    queryFn: () =>
      fetchBookings(page, pageSize, search, status, _visaStatus, tripStartDateFrom, tripStartDateTo, tripId),
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook to fetch a single booking
export function useBooking(id: string | undefined) {
  return useQuery({
    queryKey: bookingKeys.detail(id!),
    queryFn: () => fetchBooking(id!),
    enabled: !!id, // Only fetch if id is provided
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook to create a booking
export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      // Invalidate all booking queries to refetch
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      toast.success("Created successfully.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Created unsuccessfully.");
    },
  });
}

// Hook to update a booking
export function useUpdateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateBooking,
    onSuccess: (data, variables) => {
      // Invalidate all booking queries to refetch
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      // Update the specific booking in cache
      queryClient.setQueryData(bookingKeys.detail(variables.id), data);
      toast.success("Updated successfully.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Updated unsuccessfully.");
    },
  });
}

// Hook to delete a booking
export function useDeleteBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteBooking,
    onSuccess: () => {
      // Invalidate all booking queries to refetch
      queryClient.invalidateQueries({ queryKey: bookingKeys.all });
      toast.success("Deleted successfully.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Deleted unsuccessfully.");
    },
  });
}

// Hook to export bookings as CSV
export function useExportBookings() {
  return useCallback(
    (search?: string, status?: string, tripStartDateFrom?: string, tripStartDateTo?: string) => {
      const params = new URLSearchParams();

      // Add filter params (excluding page and pageSize)
      if (search) {
        params.set("search", search);
      }
      if (status && status !== "ALL") {
        params.set("status", status);
      }
      if (tripStartDateFrom) {
        params.set("tripStartDateFrom", tripStartDateFrom);
      }
      if (tripStartDateTo) {
        params.set("tripStartDateTo", tripStartDateTo);
      }

      const queryString = params.toString();
      const url = `/api/bookings/export${queryString ? `?${queryString}` : ""}`;

      // Create a temporary link and trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = `bookings-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [],
  );
}
