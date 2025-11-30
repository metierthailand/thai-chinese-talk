import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface Booking {
  id: string;
  customerId: string;
  tripId: string;
  leadId?: string | null;
  customer: {
    firstNameTh: string;
    lastNameTh: string;
    firstNameEn: string;
    lastNameEn: string;
    email: string;
  };
  trip: {
    name: string;
    destination: string;
    startDate: string;
    endDate: string;
  };
  status: string;
  visaStatus: string;
  totalAmount: number;
  paidAmount: number;
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
    visaStatus?: string,
    tripStartDateFrom?: string,
    tripStartDateTo?: string,
    tripId?: string
  ) =>
    [
      ...bookingKeys.lists(),
      page,
      pageSize,
      search,
      status,
      visaStatus,
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
  visaStatus?: string,
  tripStartDateFrom?: string,
  tripStartDateTo?: string,
  tripId?: string
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
  if (visaStatus) {
    params.set("visaStatus", visaStatus);
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
    data: data.data.map((booking: Booking & { totalAmount: string | number; paidAmount: string | number }) => ({
      ...booking,
      totalAmount: Number(booking.totalAmount),
      paidAmount: Number(booking.paidAmount),
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
    totalAmount: Number(data.totalAmount),
    paidAmount: Number(data.paidAmount),
  };
}

// Create booking function
async function createBooking(data: {
  customerId: string;
  tripId: string;
  leadId?: string;
  totalAmount?: number;
  paidAmount?: number;
  status?: string;
  visaStatus?: string;
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
    leadId?: string;
    totalAmount?: number;
    paidAmount?: number;
    status?: string;
    visaStatus?: string;
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
  visaStatus?: string,
  tripStartDateFrom?: string,
  tripStartDateTo?: string,
  tripId?: string
) {
  return useQuery({
    queryKey: bookingKeys.list(
      page,
      pageSize,
      search,
      status,
      visaStatus,
      tripStartDateFrom,
      tripStartDateTo,
      tripId
    ),
    queryFn: () =>
      fetchBookings(
        page,
        pageSize,
        search,
        status,
        visaStatus,
        tripStartDateFrom,
        tripStartDateTo,
        tripId
      ),
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
      toast.success("Booking created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create booking");
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
      toast.success("Booking updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update booking");
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
      toast.success("Booking deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete booking");
    },
  });
}

