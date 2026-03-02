import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "sonner";
import z from "zod";

export const tripFormSchema = z.object({
  type: z.enum(["GROUP_TOUR", "PRIVATE_TOUR"], {
    message: "Please select the information.",
  }),
  code: z.string().min(1, { message: "Please fill in the information." }),
  name: z.string().min(1, { message: "Please fill in the information." }),
  startDate: z.string().min(1, { message: "Please fill in the information." }),
  endDate: z.string().min(1, { message: "Please fill in the information." }),
  pax: z.string().min(1, { message: "Please fill in the information." }),
  foc: z.string().min(1, { message: "Please fill in the information." }),
  tl: z.string().optional(),
  tg: z.string().optional(),
  staff: z.string().optional(),
  standardPrice: z.string().min(1, { message: "Please fill in the information." }),
  extraPricePerPerson: z.string().min(1, { message: "Please fill in the information." }),
  note: z.string().optional(),
  airlineAndAirportId: z.string().min(1, { message: "Please select the information." }),
});

export type TripFormValues = z.infer<typeof tripFormSchema>;

export interface Trip {
  id: string;
  type: "GROUP_TOUR" | "PRIVATE_TOUR";
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  pax: number;
  foc: number;
  tl: string | null;
  tg: string | null;
  staff: string | null;
  standardPrice: string; // Prisma Decimal is serialized as string
  extraPricePerPerson: string; // Prisma Decimal is serialized as string
  note: string | null;
  airlineAndAirportId: string;
  airlineAndAirport: {
    id: string;
    code: string;
    name: string;
  };
  status: "UPCOMING" | "SOLD_OUT" | "COMPLETED" | "ON_TRIP" | "CANCELLED";
  _count: {
    bookings: number;
  };
  paidBookingsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TripsResponse {
  data: Trip[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Query key factory
export const tripKeys = {
  all: ["trips"] as const,
  lists: () => [...tripKeys.all, "list"] as const,
  list: (page: number, pageSize: number, search?: string, tripDateFrom?: string, tripDateTo?: string, type?: string, status?: string, sortBy?: string, sortOrder?: string) =>
    [...tripKeys.lists(), page, pageSize, search, tripDateFrom, tripDateTo, type, status, sortBy, sortOrder] as const,
  details: () => [...tripKeys.all, "detail"] as const,
  detail: (id: string) => [...tripKeys.details(), id] as const,
};

// Fetch trips function
async function fetchTrips(
  page: number = 1,
  pageSize: number = 10,
  search?: string,
  tripDateFrom?: string,
  tripDateTo?: string,
  type?: string,
  status?: string,
  sortBy?: string,
  sortOrder?: string,
): Promise<TripsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });

  if (search && search.trim()) {
    params.set("search", search.trim());
  }
  if (tripDateFrom) {
    params.set("tripDateFrom", tripDateFrom);
  }
  if (tripDateTo) {
    params.set("tripDateTo", tripDateTo);
  }
  if (type && type !== "ALL") {
    params.set("type", type);
  }
  if (status && status !== "ALL") {
    params.set("status", status);
  }
  if (sortBy) {
    params.set("sortBy", sortBy);
  }
  if (sortOrder) {
    params.set("sortOrder", sortOrder);
  }

  const res = await fetch(`/api/trips?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to fetch trips");
  }
  return res.json();
}

// Fetch single trip function
async function fetchTrip(id: string): Promise<Trip> {
  const res = await fetch(`/api/trips/${id}`);
  if (!res.ok) {
    throw new Error("Failed to fetch trip");
  }
  return res.json();
}

// Create trip function
async function createTrip(data: TripFormValues): Promise<Trip> {
  const res = await fetch("/api/trips", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = (await res.json().catch(() => ({ message: "Failed to create trip" }))) as {
      message: string;
      field?: string;
    };
    const errorWithField = new Error(error.message || "Failed to create trip");
    (errorWithField as Error & { field?: string }).field = error.field;
    throw errorWithField;
  }

  return res.json();
}

// Update trip function
async function updateTrip({ id, data }: { id: string; data: TripFormValues }): Promise<Trip> {
  const res = await fetch(`/api/trips/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = (await res.json().catch(() => ({ message: "Failed to update trip" }))) as {
      message: string;
      field?: string;
    };
    const errorWithField = new Error(error.message || "Failed to update trip");
    (errorWithField as Error & { field?: string }).field = error.field;
    throw errorWithField;
  }

  return res.json();
}

export function useTrips(
  page: number,
  pageSize: number,
  search?: string,
  tripDateFrom?: string,
  tripDateTo?: string,
  type?: string,
  status?: string,
  sortBy?: string,
  sortOrder?: string,
) {
  return useQuery({
    queryKey: tripKeys.list(page, pageSize, search, tripDateFrom, tripDateTo, type, status, sortBy, sortOrder),
    queryFn: () => fetchTrips(page, pageSize, search, tripDateFrom, tripDateTo, type, status, sortBy, sortOrder),
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook to fetch a single trip
export function useTrip(id: string | undefined) {
  return useQuery({
    queryKey: tripKeys.detail(id!),
    queryFn: () => fetchTrip(id!),
    enabled: !!id, // Only fetch if id is provided
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook to create a trip
export function useCreateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTrip,
    onSuccess: () => {
      // Invalidate all trip queries to refetch
      queryClient.invalidateQueries({ queryKey: tripKeys.all });
      toast.success("Created successfully.");
    },
    onError: (error: Error & { field?: string }) => {
      toast.error(error.message || "Created unsuccessfully.");
    },
  });
}

// Hook to update a trip
export function useUpdateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTrip,
    onSuccess: (data, variables) => {
      // Invalidate all trip queries to refetch
      queryClient.invalidateQueries({ queryKey: tripKeys.all });
      // Update the specific trip in cache
      queryClient.setQueryData(tripKeys.detail(variables.id), data);
      toast.success("Updated successfully.");
    },
    onError: (error: Error & { field?: string }) => {
      toast.error(error.message || "Updated unsuccessfully.");
    },
  });
}

// Hook to export trip bookings as Excel (one sheet per trip). Requires at least one tripId.
export function useExportTripBookings() {
  return useCallback((tripIds: string[]) => {
    if (tripIds.length === 0) return;
    const params = new URLSearchParams();
    params.set("tripIds", tripIds.join(","));
    const url = `/api/trips/export?${params.toString()}`;
    const link = document.createElement("a");
    link.href = url;
    link.download = `trip-bookings-export-${new Date().toISOString().split("T")[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);
}

// Export types
export type { TripsResponse as TripsResponseType };
