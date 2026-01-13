import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface LeadBooking {
  id: string;
  tripId: string;
  status: string;
  visaStatus: string;
  totalAmount: number;
  paidAmount: number;
  trip: {
    name: string;
    destination: string;
    startDate: string;
    endDate: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  customerId: string | null;
  agentId: string;
  salesUserId: string;
  newCustomer: boolean;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  email: string | null;
  lineId: string | null;
  customer: {
    id: string;
    firstNameTh: string;
    lastNameTh: string;
    firstNameEn: string;
    lastNameEn: string;
    email: string | null;
    phoneNumber: string | null;
  } | null;
  agent: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  salesUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  source: string;
  status: string;
  tripInterest: string;
  pax: number;
  leadNote: string | null;
  sourceNote: string | null;
  bookings?: LeadBooking[];
  createdAt: string;
  updatedAt: string;
}

export interface LeadsResponse {
  data: Lead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Query key factory
export const leadKeys = {
  all: ["leads"] as const,
  lists: () => [...leadKeys.all, "list"] as const,
  list: (
    page: number,
    pageSize: number,
    search?: string,
    status?: string,
    source?: string,
    customerId?: string
  ) => [...leadKeys.lists(), page, pageSize, search, status, source, customerId] as const,
  details: () => [...leadKeys.all, "detail"] as const,
  detail: (id: string) => [...leadKeys.details(), id] as const,
};

// Fetch leads function
async function fetchLeads(
  page: number = 1,
  pageSize: number = 10,
  search?: string,
  status?: string,
  source?: string,
  customerId?: string
): Promise<LeadsResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });

  if (search && search.trim()) {
    params.set("search", search.trim());
  }
  if (status && status !== "ALL") {
    params.set("status", status);
  }
  if (source && source !== "ALL") {
    params.set("source", source);
  }
  if (customerId) {
    params.set("customerId", customerId);
  }

  const res = await fetch(`/api/leads?${params.toString()}`);
  if (!res.ok) {
    throw new Error("Failed to fetch leads");
  }
  const data = await res.json();
  return data;
}

// Fetch single lead function
async function fetchLead(id: string): Promise<Lead> {
  const res = await fetch(`/api/leads/${id}`);
  if (!res.ok) {
    throw new Error("Failed to fetch lead");
  }
  const data = await res.json();
  return {
    ...data,
    bookings: data.bookings?.map((booking: LeadBooking & { totalAmount: string | number; paidAmount: string | number }) => ({
      ...booking,
      totalAmount: Number(booking.totalAmount),
      paidAmount: Number(booking.paidAmount),
    })) || [],
  };
}

// Create lead function
async function createLead(data: {
  newCustomer: boolean;
  customerId?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
  lineId?: string;
  salesUserId: string;
  source: string;
  status: string;
  tripInterest: string;
  pax?: number;
  leadNote?: string;
  sourceNote?: string;
}): Promise<Lead> {
  const res = await fetch("/api/leads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Failed to create lead" }));
    throw new Error(error.message || error.error || "Failed to create lead");
  }

  return res.json();
}

// Update lead function
async function updateLead({
  id,
  data,
}: {
  id: string;
  data: {
    newCustomer?: boolean;
    customerId?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    email?: string;
    lineId?: string;
    salesUserId?: string;
    source?: string;
    status?: string;
    tripInterest?: string;
    pax?: number;
    leadNote?: string;
    sourceNote?: string;
  };
}): Promise<Lead> {
  const res = await fetch(`/api/leads/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Failed to update lead" }));
    throw new Error(error.message || error.error || "Failed to update lead");
  }

  return res.json();
}

// Hook to fetch leads with pagination
export function useLeads(
  page: number,
  pageSize: number,
  search?: string,
  status?: string,
  source?: string,
  customerId?: string
) {
  return useQuery({
    queryKey: leadKeys.list(page, pageSize, search, status, source, customerId),
    queryFn: () => fetchLeads(page, pageSize, search, status, source, customerId),
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook to fetch a single lead
export function useLead(id: string | undefined) {
  return useQuery({
    queryKey: leadKeys.detail(id!),
    queryFn: () => fetchLead(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

// Hook to create a lead
export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.all });
      toast.success("Lead created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create lead");
    },
  });
}

// Hook to update a lead
export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateLead,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: leadKeys.all });
      queryClient.setQueryData(leadKeys.detail(variables.id), data);
      toast.success("Lead updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update lead");
    },
  });
}


