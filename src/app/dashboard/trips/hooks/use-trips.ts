import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import z from "zod";

export const tripFormSchema = z.object({
  name: z.string().min(1, { message: "Trip name is required" }),
  destination: z.string().min(1, { message: "Destination is required" }),
  startDate: z.string().min(1, { message: "Start date is required" }),
  endDate: z.string().min(1, { message: "End date is required" }),
  maxCapacity: z.string().min(1, { message: "Max capacity is required" }),
  price: z.string().optional(),
  description: z.string().optional(),
});

export type TripFormValues = z.infer<typeof tripFormSchema>;

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  maxCapacity: number;
  description: string | null;
  price: string | null; // Prisma Decimal is serialized as string
  _count: {
    bookings: number;
  };
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
  list: (
    page: number,
    pageSize: number,
    search?: string,
    startDateFrom?: string,
    startDateTo?: string
  ) =>
    [...tripKeys.lists(), page, pageSize, search, startDateFrom, startDateTo] as const,
  details: () => [...tripKeys.all, "detail"] as const,
  detail: (id: string) => [...tripKeys.details(), id] as const,
};

// Fetch trips function
async function fetchTrips(
  page: number = 1,
  pageSize: number = 10,
  search?: string,
  startDateFrom?: string,
  startDateTo?: string
): Promise<TripsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });

  if (search && search.trim()) {
    params.set("search", search.trim());
  }
  if (startDateFrom) {
    params.set("startDateFrom", startDateFrom);
  }
  if (startDateTo) {
    params.set("startDateTo", startDateTo);
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
    const error = await res.json();
    throw new Error(error.message || "Failed to create trip");
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
    const error = await res.json();
    throw new Error(error.message || "Failed to update trip");
  }

  return res.json();
}

// Hook to fetch trips with pagination
export function useTrips(
  page: number,
  pageSize: number,
  search?: string,
  startDateFrom?: string,
  startDateTo?: string
) {
  return useQuery({
    queryKey: tripKeys.list(page, pageSize, search, startDateFrom, startDateTo),
    queryFn: () => fetchTrips(page, pageSize, search, startDateFrom, startDateTo),
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
      toast.success("Trip created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create trip");
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
      toast.success("Trip updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update trip");
    },
  });
}

// Export types
export type { TripsResponse as TripsResponseType };

