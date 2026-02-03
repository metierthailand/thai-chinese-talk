import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import z from "zod";

export const airlineAndAirportFormSchema = z.object({
  code: z.string().min(1, {
    message: "Please fill in the information.",
  }),
  name: z.string().min(1, {
    message: "Please fill in the information.",
  }),
});

export type AirlineAndAirportFormValues = z.infer<typeof airlineAndAirportFormSchema>;

export interface AirlineAndAirport {
  id: string;
  code: string;
  name: string;
  _count?: {
    trips: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AirlineAndAirportsResponse {
  data: AirlineAndAirport[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Query key factory
export const airlineAndAirportKeys = {
  all: ["airlineAndAirports"] as const,
  lists: () => [...airlineAndAirportKeys.all, "list"] as const,
  list: (page: number, pageSize: number, search?: string) =>
    [...airlineAndAirportKeys.lists(), page, pageSize, search] as const,
  details: () => [...airlineAndAirportKeys.all, "detail"] as const,
  detail: (id: string) => [...airlineAndAirportKeys.details(), id] as const,
  allList: () => [...airlineAndAirportKeys.all, "all"] as const,
};

// Fetch airline and airports function
async function fetchAirlineAndAirports(
  page: number = 1,
  pageSize: number = 10,
  search?: string,
): Promise<AirlineAndAirportsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  if (search && search.trim()) {
    params.set("search", search.trim());
  }

  const res = await fetch(`/api/airline-and-airports?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to fetch airline and airports");
  }
  return res.json();
}

// Fetch all airline and airports (for dropdowns)
async function fetchAllAirlineAndAirports(): Promise<AirlineAndAirport[]> {
  const res = await fetch("/api/airline-and-airports?pageSize=1000");
  if (!res.ok) {
    throw new Error("Failed to fetch airline and airports");
  }
  const data = await res.json();
  return data.data || [];
}

// Fetch single airline and airport function
async function fetchAirlineAndAirport(id: string): Promise<AirlineAndAirport> {
  const res = await fetch(`/api/airline-and-airports/${id}`);
  if (!res.ok) {
    throw new Error("Failed to fetch airline and airport");
  }
  return res.json();
}

// Create airline and airport function
async function createAirlineAndAirport(
  data: AirlineAndAirportFormValues,
): Promise<AirlineAndAirport> {
  const res = await fetch("/api/airline-and-airports", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Failed to create airline/airport" }));
    const errorWithField = new Error(error.message || "Failed to create airline/airport") as Error & { field?: string };
    errorWithField.field = error.field;
    throw errorWithField;
  }

  return res.json();
}

// Update airline and airport function
async function updateAirlineAndAirport({
  id,
  data,
}: {
  id: string;
  data: AirlineAndAirportFormValues;
}): Promise<AirlineAndAirport> {
  const res = await fetch(`/api/airline-and-airports/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Failed to update airline/airport" }));
    const errorWithField = new Error(error.message || "Failed to update airline/airport") as Error & { field?: string };
    errorWithField.field = error.field;
    throw errorWithField;
  }

  return res.json();
}

// Delete airline and airport function
async function deleteAirlineAndAirport(id: string): Promise<void> {
  const res = await fetch(`/api/airline-and-airports/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Failed to delete airline/airport" }));
    throw new Error(error.message || "Failed to delete airline/airport");
  }
}

// Hook to fetch airline and airports with pagination
export function useAirlineAndAirports({
  page,
  pageSize,
  search,
}: {
  page: number;
  pageSize: number;
  search?: string;
}) {
  return useQuery({
    queryKey: airlineAndAirportKeys.list(page, pageSize, search),
    queryFn: () => fetchAirlineAndAirports(page, pageSize, search),
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook to fetch all airline and airports (for dropdowns)
export function useAllAirlineAndAirports() {
  return useQuery({
    queryKey: airlineAndAirportKeys.allList(),
    queryFn: fetchAllAirlineAndAirports,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook to fetch single airline and airport
export function useAirlineAndAirport(id: string | undefined) {
  return useQuery({
    queryKey: airlineAndAirportKeys.detail(id!),
    queryFn: () => fetchAirlineAndAirport(id!),
    enabled: !!id,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook to create an airline and airport
export function useCreateAirlineAndAirport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAirlineAndAirport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: airlineAndAirportKeys.all });
      toast.success("Created successfully.");
    },
    onError: (error: Error & { field?: string }) => {
      toast.error(error.message || "Created unsuccessfully.");
    },
  });
}

// Hook to update an airline and airport
export function useUpdateAirlineAndAirport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateAirlineAndAirport,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: airlineAndAirportKeys.all });
      queryClient.invalidateQueries({ queryKey: airlineAndAirportKeys.detail(data.id) });
      toast.success("Updated successfully.");
    },
    onError: (error: Error & { field?: string }) => {
      toast.error(error.message || "Updated unsuccessfully.");
    },
  });
}

// Hook to delete an airline and airport
export function useDeleteAirlineAndAirport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAirlineAndAirport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: airlineAndAirportKeys.all });
      toast.success("Deleted successfully.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Deleted unsuccessfully.");
    },
  });
}
