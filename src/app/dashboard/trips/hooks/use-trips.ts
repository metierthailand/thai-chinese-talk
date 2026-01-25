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
  list: (page: number, pageSize: number, search?: string, startDateFrom?: string, startDateTo?: string) =>
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
  startDateTo?: string,
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

// Hook to fetch trips with pagination
export function useTrips(
  page: number,
  pageSize: number,
  search?: string,
  startDateFrom?: string,
  startDateTo?: string,
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
      toast.success("Created successfully.");
    },
    onError: (error: Error & { field?: string }) => {
      // Only show toast if error doesn't have a field (field errors are shown in form)
      if (!error.field) {
        toast.error(error.message || "Created unsuccessfully.");
      }
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
      // Only show toast if error doesn't have a field (field errors are shown in form)
      if (!error.field) {
        toast.error(error.message || "Updated unsuccessfully.");
      }
    },
  });
}

// Hook to export trips as CSV
export function useExportTrips() {
  return useCallback(
    (search?: string, startDateFrom?: string, startDateTo?: string) => {
      const params = new URLSearchParams();

      // Add filter params (excluding page and pageSize)
      if (search) {
        params.set("search", search);
      }
      if (startDateFrom) {
        params.set("startDateFrom", startDateFrom);
      }
      if (startDateTo) {
        params.set("startDateTo", startDateTo);
      }

      const queryString = params.toString();
      const url = `/api/trips/export${queryString ? `?${queryString}` : ""}`;

      // Create a temporary link and trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = `trips-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    [],
  );
}

// Export types
export type { TripsResponse as TripsResponseType };
